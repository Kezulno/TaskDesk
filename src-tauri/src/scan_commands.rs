use std::{
    collections::{HashMap, HashSet},
    env, fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::Serialize;
use tauri::State;
use uuid::Uuid;

use crate::{error::CommandError, models::normalize_user_target};

#[derive(Default)]
pub struct ApplicationScanCache(Mutex<Option<Vec<DetectedApplication>>>);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ApplicationSource {
    UserStartMenu,
    SystemStartMenu,
    ProgramFiles,
    ProgramFilesX86,
    UserPrograms,
    Registry,
    Executable,
    FileAssociation,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationCompatibility {
    pub compatible: bool,
    pub exists: bool,
    pub architecture: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedApplication {
    pub id: String,
    pub name: String,
    pub executable_path: String,
    pub shortcut_path: Option<String>,
    pub source: ApplicationSource,
    pub icon_path: Option<String>,
    pub valid: bool,
    pub compatibility: ApplicationCompatibility,
    pub is_installer: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DroppedResourceCandidate {
    pub name: String,
    pub path: String,
    pub resource_type: String,
}

#[tauri::command]
pub async fn inspect_dropped_resource_paths(
    paths: Vec<String>,
) -> Result<Vec<DroppedResourceCandidate>, CommandError> {
    if paths.len() > 50 {
        return Err(CommandError::new(
            "TOO_MANY_DROPPED_PATHS",
            "한 번에 최대 50개의 파일 또는 폴더를 추가할 수 있습니다.",
        ));
    }

    tokio::task::spawn_blocking(move || {
        let mut candidates = Vec::new();
        let mut seen = HashSet::new();
        for raw_path in paths {
            let normalized_target = normalize_user_target(raw_path);
            let path = PathBuf::from(&normalized_target);
            if !seen.insert(normalize_path(&path)) {
                continue;
            }
            let Ok(metadata) = fs::metadata(&path) else {
                continue;
            };
            if metadata.is_file()
                && path
                    .extension()
                    .and_then(|extension| extension.to_str())
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("lnk"))
            {
                let application = application_from_shortcut(&path, ApplicationSource::Executable);
                if application.valid
                    && seen.insert(normalize_path(Path::new(&application.executable_path)))
                {
                    candidates.push(DroppedResourceCandidate {
                        name: application.name,
                        path: application.executable_path,
                        resource_type: "application".to_owned(),
                    });
                }
                continue;
            }
            let resource_type = if metadata.is_dir() {
                "folder"
            } else if metadata.is_file()
                && path
                    .extension()
                    .and_then(|extension| extension.to_str())
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
            {
                "application"
            } else if metadata.is_file() {
                "file"
            } else {
                continue;
            };
            let name = if resource_type == "application" {
                executable_display_name(&path)
            } else {
                display_name(&path)
            };
            candidates.push(DroppedResourceCandidate {
                name,
                path: path.to_string_lossy().into_owned(),
                resource_type: resource_type.to_owned(),
            });
        }
        candidates
    })
    .await
    .map_err(|error| CommandError::new("DROPPED_PATH_INSPECTION_FAILED", error.to_string()))
}

#[tauri::command]
pub async fn inspect_application_target(
    executable_path: String,
) -> Result<DetectedApplication, CommandError> {
    let executable_path = normalize_user_target(executable_path);
    tokio::task::spawn_blocking(move || application_from_executable(Path::new(&executable_path)))
        .await
        .map_err(|error| CommandError::new("APPLICATION_INSPECTION_FAILED", error.to_string()))
}

#[tauri::command]
pub async fn detect_default_application_for_file(
    file_path: String,
) -> Result<DetectedApplication, CommandError> {
    tokio::task::spawn_blocking(move || default_application_for_file(Path::new(&file_path)))
        .await
        .map_err(|error| CommandError::new("FILE_ASSOCIATION_FAILED", error.to_string()))?
}

#[tauri::command]
pub async fn get_application_icon(executable_path: String) -> Result<Option<String>, CommandError> {
    let executable_path = normalize_user_target(executable_path);
    tokio::task::spawn_blocking(move || application_icon_data_url(Path::new(&executable_path)))
        .await
        .map_err(|error| CommandError::new("APPLICATION_ICON_FAILED", error.to_string()))?
}

#[tauri::command]
pub async fn scan_installed_applications(
    cache: State<'_, ApplicationScanCache>,
) -> Result<Vec<DetectedApplication>, CommandError> {
    if let Some(cached) = cache.0.lock().map_err(|_| CommandError::lock())?.clone() {
        return Ok(cached);
    }

    let applications = tokio::task::spawn_blocking(scan_installed_application_locations)
        .await
        .map_err(|error| CommandError::new("APPLICATION_SCAN_FAILED", error.to_string()))?;
    *cache.0.lock().map_err(|_| CommandError::lock())? = Some(applications.clone());
    Ok(applications)
}

#[tauri::command]
pub fn clear_application_scan_cache(
    cache: State<'_, ApplicationScanCache>,
) -> Result<(), CommandError> {
    *cache.0.lock().map_err(|_| CommandError::lock())? = None;
    Ok(())
}

fn scan_installed_application_locations() -> Vec<DetectedApplication> {
    let mut applications = Vec::new();
    if let Some(app_data) = env::var_os("APPDATA") {
        scan_directory(
            &PathBuf::from(app_data).join("Microsoft/Windows/Start Menu"),
            ApplicationSource::UserStartMenu,
            &mut applications,
        );
    }
    if let Some(program_data) = env::var_os("PROGRAMDATA") {
        scan_directory(
            &PathBuf::from(program_data).join("Microsoft/Windows/Start Menu"),
            ApplicationSource::SystemStartMenu,
            &mut applications,
        );
    }

    scan_program_files(&mut applications);
    scan_user_programs(&mut applications);
    scan_registry_applications(&mut applications);

    applications.sort_by_key(|application| !application.valid);
    let mut seen = HashSet::new();
    applications.retain(|application| {
        let key = if application.executable_path.is_empty() {
            format!("name:{}", application.name.trim().to_lowercase())
        } else {
            format!(
                "path:{}",
                normalize_path(Path::new(&application.executable_path))
            )
        };
        seen.insert(key)
    });
    applications.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then_with(|| left.executable_path.cmp(&right.executable_path))
    });
    applications
}

fn scan_user_programs(applications: &mut Vec<DetectedApplication>) {
    const MAX_SCAN_DEPTH: usize = 5;
    const MAX_EXECUTABLES: usize = 2_000;

    let Some(local_app_data) = env::var_os("LOCALAPPDATA") else {
        return;
    };
    let root = PathBuf::from(local_app_data).join("Programs");
    if !root.is_dir() {
        return;
    }

    let mut discovered = 0;
    let mut root_applications = Vec::new();
    scan_program_files_directory(
        &root,
        ApplicationSource::UserPrograms,
        0,
        MAX_SCAN_DEPTH,
        MAX_EXECUTABLES,
        &mut discovered,
        &mut root_applications,
    );
    applications.extend(select_program_file_representatives(
        &root,
        root_applications,
    ));
}

#[cfg(target_os = "windows")]
fn scan_registry_applications(applications: &mut Vec<DetectedApplication>) {
    use winreg::{
        enums::{
            HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY,
        },
        RegKey,
    };

    const UNINSTALL_KEY: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall";
    let roots = [
        (RegKey::predef(HKEY_CURRENT_USER), KEY_READ),
        (
            RegKey::predef(HKEY_LOCAL_MACHINE),
            KEY_READ | KEY_WOW64_64KEY,
        ),
        (
            RegKey::predef(HKEY_LOCAL_MACHINE),
            KEY_READ | KEY_WOW64_32KEY,
        ),
    ];

    for (root, flags) in roots {
        let Ok(uninstall) = root.open_subkey_with_flags(UNINSTALL_KEY, flags) else {
            continue;
        };
        for subkey_name in uninstall.enum_keys().flatten() {
            let Ok(subkey) = uninstall.open_subkey_with_flags(&subkey_name, flags) else {
                continue;
            };
            if subkey.get_value::<u32, _>("SystemComponent").unwrap_or(0) == 1 {
                continue;
            }
            let Ok(display_name) = subkey.get_value::<String, _>("DisplayName") else {
                continue;
            };
            let Ok(display_icon) = subkey.get_value::<String, _>("DisplayIcon") else {
                continue;
            };
            let Some(path) = registry_icon_executable_path(&display_icon) else {
                continue;
            };
            let compatibility = application_compatibility(&path);
            if !compatibility.exists {
                continue;
            }
            applications.push(detected_application(
                display_name.trim().to_owned(),
                path.to_string_lossy().into_owned(),
                None,
                ApplicationSource::Registry,
                Some(path.to_string_lossy().into_owned()),
                compatibility.compatible,
                compatibility,
                is_installer_executable(&path),
            ));
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn scan_registry_applications(_applications: &mut Vec<DetectedApplication>) {}

#[cfg(target_os = "windows")]
fn registry_icon_executable_path(value: &str) -> Option<PathBuf> {
    let trimmed = value.trim();
    let path_value = if let Some(quoted) = trimmed.strip_prefix('"') {
        quoted.split_once('"').map(|(path, _)| path)?
    } else if let Some((path, icon_index)) = trimmed.rsplit_once(',') {
        if icon_index.trim().parse::<i32>().is_ok() {
            path.trim()
        } else {
            trimmed
        }
    } else {
        trimmed
    };
    let expanded = expand_windows_environment_variables(path_value);
    let path = PathBuf::from(expanded);
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
        .then_some(path)
}

#[cfg(target_os = "windows")]
fn expand_windows_environment_variables(value: &str) -> String {
    let mut expanded = value.to_owned();
    for (name, replacement) in env::vars() {
        let token = format!("%{name}%");
        if expanded
            .to_ascii_lowercase()
            .contains(&token.to_ascii_lowercase())
        {
            expanded = replace_ascii_case_insensitive(&expanded, &token, &replacement);
        }
    }
    expanded
}

#[cfg(target_os = "windows")]
fn replace_ascii_case_insensitive(value: &str, pattern: &str, replacement: &str) -> String {
    let mut result = String::new();
    let mut remaining = value;
    let pattern_lower = pattern.to_ascii_lowercase();
    while let Some(index) = remaining.to_ascii_lowercase().find(&pattern_lower) {
        result.push_str(&remaining[..index]);
        result.push_str(replacement);
        remaining = &remaining[index + pattern.len()..];
    }
    result.push_str(remaining);
    result
}

fn scan_program_files(applications: &mut Vec<DetectedApplication>) {
    const MAX_SCAN_DEPTH: usize = 4;
    const MAX_EXECUTABLES_PER_ROOT: usize = 1_500;

    let roots = [
        (env::var_os("ProgramFiles"), ApplicationSource::ProgramFiles),
        (
            env::var_os("ProgramFiles(x86)"),
            ApplicationSource::ProgramFilesX86,
        ),
    ];
    let mut scanned_roots = HashSet::new();

    for (root, source) in roots {
        let Some(root) = root else {
            continue;
        };
        let root = PathBuf::from(root);
        if !root.is_dir() || !scanned_roots.insert(normalize_path(&root)) {
            continue;
        }

        let mut discovered = 0;
        let mut root_applications = Vec::new();
        scan_program_files_directory(
            &root,
            source,
            0,
            MAX_SCAN_DEPTH,
            MAX_EXECUTABLES_PER_ROOT,
            &mut discovered,
            &mut root_applications,
        );
        applications.extend(select_program_file_representatives(
            &root,
            root_applications,
        ));
    }
}

fn select_program_file_representatives(
    root: &Path,
    applications: Vec<DetectedApplication>,
) -> Vec<DetectedApplication> {
    let mut grouped: HashMap<String, DetectedApplication> = HashMap::new();
    for application in applications {
        let path = Path::new(&application.executable_path);
        let key = installation_group_key(root, path);
        match grouped.get(&key) {
            Some(current)
                if executable_candidate_score(
                    root,
                    Path::new(&current.executable_path),
                    &current.name,
                ) >= executable_candidate_score(root, path, &application.name) => {}
            _ => {
                grouped.insert(key, application);
            }
        }
    }
    grouped.into_values().collect()
}

fn installation_group_key(root: &Path, executable: &Path) -> String {
    let relative = executable.strip_prefix(root).unwrap_or(executable);
    let components = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_ascii_lowercase())
        .collect::<Vec<_>>();
    let Some(first) = components.first() else {
        return normalize_path(executable);
    };
    let vendor_directory = matches!(
        first.as_str(),
        "adobe" | "google" | "microsoft" | "mozilla" | "oracle"
    );
    if vendor_directory && components.len() > 2 {
        format!("{}\\{}", first, components[1])
    } else {
        first.clone()
    }
}

fn executable_candidate_score(root: &Path, executable: &Path, display_name: &str) -> i32 {
    let relative = executable.strip_prefix(root).unwrap_or(executable);
    let depth = relative.components().count() as i32;
    let stem = executable
        .file_stem()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let install_name = relative
        .components()
        .next()
        .map(|value| value.as_os_str().to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let normalized_stem = alphanumeric_key(&stem);
    let normalized_install = alphanumeric_key(&install_name);
    let mut score = 100 - depth * 5;

    if normalized_install.len() >= 4
        && (normalized_stem.starts_with(&normalized_install)
            || normalized_install.starts_with(&normalized_stem))
    {
        score += 100;
    }
    if stem.contains("launcher") || stem.ends_with("fm") {
        score += 25;
    }
    if stem.ends_with("64") {
        score += 10;
    }
    if [
        "helper",
        "service",
        "server",
        "daemon",
        "console",
        "report",
        "crash",
        "update",
        "diagnostic",
        "wrr",
        "cmd",
    ]
    .iter()
    .any(|fragment| stem.contains(fragment))
    {
        score -= 120;
    }
    if suspicious_application_name(display_name) {
        score -= 200;
    }
    score
}

fn alphanumeric_key(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .collect()
}

fn suspicious_application_name(name: &str) -> bool {
    let characters = name.chars().collect::<Vec<_>>();
    if characters.len() > 80 {
        return true;
    }
    let Some(first) = characters.first() else {
        return true;
    };
    characters.len() >= 12
        && characters
            .iter()
            .filter(|character| character.eq_ignore_ascii_case(first))
            .count()
            * 4
            >= characters.len() * 3
}

fn scan_program_files_directory(
    directory: &Path,
    source: ApplicationSource,
    depth: usize,
    max_depth: usize,
    max_executables: usize,
    discovered: &mut usize,
    applications: &mut Vec<DetectedApplication>,
) {
    if depth > max_depth || *discovered >= max_executables {
        return;
    }
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };

    for entry in entries.flatten() {
        if *discovered >= max_executables {
            break;
        }
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if file_type.is_symlink() {
            continue;
        }
        let path = entry.path();
        if file_type.is_dir() {
            if should_skip_program_files_directory(&path) {
                continue;
            }
            scan_program_files_directory(
                &path,
                source.clone(),
                depth + 1,
                max_depth,
                max_executables,
                discovered,
                applications,
            );
            continue;
        }
        if is_program_application_candidate(&path) {
            applications.push(application_from_executable_with_source(
                &path,
                source.clone(),
            ));
            *discovered += 1;
        }
    }
}

fn should_skip_program_files_directory(path: &Path) -> bool {
    path.file_name()
        .map(|name| name.to_string_lossy().to_ascii_lowercase())
        .is_some_and(|name| {
            matches!(
                name.as_str(),
                "common files" | "windowsapps" | "modifiablewindowsapps"
            )
        })
}

fn is_program_application_candidate(path: &Path) -> bool {
    if !path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
    {
        return false;
    }

    let stem = path
        .file_stem()
        .map(|name| name.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    !stem.starts_with("unins")
        && !stem.starts_with("uninstall")
        && !matches!(
            stem.as_str(),
            "setup"
                | "installer"
                | "update"
                | "updater"
                | "crashpad_handler"
                | "squirrel"
                | "vc_redist.x64"
                | "vc_redist.x86"
                | "dxsetup"
        )
}

fn scan_directory(
    directory: &Path,
    source: ApplicationSource,
    applications: &mut Vec<DetectedApplication>,
) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            scan_directory(&path, source.clone(), applications);
            continue;
        }
        let extension = path
            .extension()
            .and_then(|extension| extension.to_str())
            .unwrap_or_default();
        if extension.eq_ignore_ascii_case("lnk") {
            applications.push(application_from_shortcut(&path, source.clone()));
        } else if extension.eq_ignore_ascii_case("exe") {
            applications.push(application_from_executable(&path));
        }
    }
}

#[cfg(target_os = "windows")]
fn application_from_shortcut(path: &Path, source: ApplicationSource) -> DetectedApplication {
    let name = display_name(path);
    let parsed = lnks::Shortcut::load(path).ok();
    let squirrel_executable = parsed.as_ref().and_then(resolve_squirrel_executable);
    let parsed_target = parsed
        .as_ref()
        .and_then(|shortcut| shortcut.target_path.clone());
    let requires_shortcut_arguments = squirrel_executable.is_none()
        && parsed.as_ref().is_some_and(|shortcut| {
            shortcut
                .arguments
                .as_deref()
                .is_some_and(|arguments| !arguments.trim().is_empty())
                && shortcut.target_path.as_deref().is_some_and(|target| {
                    target
                        .extension()
                        .and_then(|extension| extension.to_str())
                        .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
                })
        });
    let executable = squirrel_executable.or(parsed_target);
    let icon_path = parsed
        .as_ref()
        .and_then(|shortcut| shortcut.icon.clone())
        .map(|icon| icon.path.to_string_lossy().into_owned());
    if requires_shortcut_arguments {
        let compatibility = application_target_compatibility(path);
        return detected_application(
            name,
            path.to_string_lossy().into_owned(),
            Some(path.to_string_lossy().into_owned()),
            source,
            icon_path,
            compatibility.compatible,
            compatibility,
            false,
        );
    }
    let executable_path = executable
        .as_ref()
        .map(|target| target.to_string_lossy().into_owned())
        .unwrap_or_default();
    let valid = executable.as_ref().is_some_and(|target| {
        target.is_file()
            && target
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
    });
    let compatibility = executable
        .as_deref()
        .map(application_compatibility)
        .unwrap_or_else(|| incompatible(false, None, "바로가기 실행 대상을 확인하지 못했습니다."));
    detected_application(
        name,
        executable_path,
        Some(path.to_string_lossy().into_owned()),
        source,
        icon_path,
        valid && compatibility.compatible,
        compatibility,
        executable.as_deref().is_some_and(is_installer_executable),
    )
}

#[cfg(target_os = "windows")]
fn resolve_squirrel_executable(shortcut: &lnks::Shortcut) -> Option<PathBuf> {
    let target = shortcut.target_path.clone()?;
    let is_squirrel_updater = target
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("update.exe"));
    if !is_squirrel_updater {
        return None;
    }
    let process_name = shortcut
        .arguments
        .as_deref()
        .and_then(process_start_executable_name)?;
    let working_directory = shortcut.working_dir.as_deref()?;
    let process_path = working_directory.join(process_name);
    if process_path.is_file() {
        return Some(process_path);
    }

    let install_root = if working_directory
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.to_ascii_lowercase().starts_with("app-"))
    {
        working_directory.parent()
    } else {
        Some(working_directory)
    }?;
    fs::read_dir(install_root)
        .ok()?
        .flatten()
        .filter_map(|entry| {
            let file_type = entry.file_type().ok()?;
            let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
            if !file_type.is_dir() || !name.starts_with("app-") {
                return None;
            }
            let candidate = entry.path().join(process_name);
            candidate.is_file().then_some(candidate)
        })
        .max_by(|left, right| normalize_path(left).cmp(&normalize_path(right)))
}

fn process_start_executable_name(arguments: &str) -> Option<&str> {
    let mut parts = arguments.split_whitespace();
    while let Some(part) = parts.next() {
        if !part.eq_ignore_ascii_case("--processStart") {
            continue;
        }
        let candidate = parts.next()?.trim_matches('"');
        let path = Path::new(candidate);
        let is_plain_executable_name = path.file_name().is_some_and(|name| name == candidate)
            && path
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"));
        return is_plain_executable_name.then_some(candidate);
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn application_from_shortcut(path: &Path, source: ApplicationSource) -> DetectedApplication {
    detected_application(
        display_name(path),
        String::new(),
        Some(path.to_string_lossy().into_owned()),
        source,
        None,
        false,
        incompatible(false, None, "바로가기 검사는 Windows에서만 지원합니다."),
        false,
    )
}

fn application_from_executable(path: &Path) -> DetectedApplication {
    application_from_executable_with_source(path, ApplicationSource::Executable)
}

fn application_from_executable_with_source(
    path: &Path,
    source: ApplicationSource,
) -> DetectedApplication {
    let compatibility = application_compatibility(path);
    detected_application(
        executable_display_name(path),
        path.to_string_lossy().into_owned(),
        None,
        source,
        Some(path.to_string_lossy().into_owned()),
        compatibility.compatible,
        compatibility,
        is_installer_executable(path),
    )
}

fn detected_application(
    name: String,
    executable_path: String,
    shortcut_path: Option<String>,
    source: ApplicationSource,
    icon_path: Option<String>,
    valid: bool,
    compatibility: ApplicationCompatibility,
    is_installer: bool,
) -> DetectedApplication {
    let identity = shortcut_path.as_deref().unwrap_or(&executable_path);
    DetectedApplication {
        id: Uuid::new_v5(&Uuid::NAMESPACE_URL, identity.as_bytes()).to_string(),
        name,
        executable_path,
        shortcut_path,
        source,
        icon_path,
        valid,
        compatibility,
        is_installer,
    }
}

fn default_application_for_file(path: &Path) -> Result<DetectedApplication, CommandError> {
    if !path.is_file() {
        return Err(CommandError::new(
            "FILE_NOT_FOUND",
            "선택한 파일이 존재하지 않습니다.",
        ));
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| {
            CommandError::new(
                "FILE_EXTENSION_MISSING",
                "파일 확장자를 확인할 수 없습니다.",
            )
        })?;
    if extension.eq_ignore_ascii_case("exe") {
        return Ok(application_from_executable(path));
    }
    let executable = query_associated_executable(&format!(".{extension}"))?;
    let executable_path = PathBuf::from(executable);
    let compatibility = application_compatibility(&executable_path);
    Ok(detected_application(
        executable_display_name(&executable_path),
        executable_path.to_string_lossy().into_owned(),
        None,
        ApplicationSource::FileAssociation,
        Some(executable_path.to_string_lossy().into_owned()),
        compatibility.compatible,
        compatibility,
        is_installer_executable(&executable_path),
    ))
}

fn executable_display_name(path: &Path) -> String {
    file_version_string(path, "ProductName")
        .or_else(|| file_version_string(path, "FileDescription"))
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| display_name(path))
}

fn is_installer_executable(path: &Path) -> bool {
    let file_name = path
        .file_stem()
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let description = file_version_string(path, "FileDescription")
        .unwrap_or_default()
        .to_lowercase();
    [file_name.as_str(), description.as_str()]
        .iter()
        .any(|value| value.contains("installer") || value.contains("setup"))
}

#[cfg(target_os = "windows")]
fn file_version_string(path: &Path, key: &str) -> Option<String> {
    use std::{ffi::c_void, iter, os::windows::ffi::OsStrExt, ptr};

    #[link(name = "version")]
    extern "system" {
        fn GetFileVersionInfoSizeW(file_name: *const u16, handle: *mut u32) -> u32;
        fn GetFileVersionInfoW(
            file_name: *const u16,
            handle: u32,
            length: u32,
            data: *mut c_void,
        ) -> i32;
        fn VerQueryValueW(
            block: *const c_void,
            sub_block: *const u16,
            buffer: *mut *mut c_void,
            length: *mut u32,
        ) -> i32;
    }

    let file_name = path
        .as_os_str()
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let mut ignored_handle = 0_u32;
    let size = unsafe { GetFileVersionInfoSizeW(file_name.as_ptr(), &mut ignored_handle) };
    if size == 0 {
        return None;
    }
    let mut data = vec![0_u8; size as usize];
    if unsafe {
        GetFileVersionInfoW(
            file_name.as_ptr(),
            0,
            size,
            data.as_mut_ptr().cast::<c_void>(),
        )
    } == 0
    {
        return None;
    }

    let translation_query = std::ffi::OsStr::new("\\VarFileInfo\\Translation")
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let mut translation_ptr = ptr::null_mut::<c_void>();
    let mut translation_length = 0_u32;
    if unsafe {
        VerQueryValueW(
            data.as_ptr().cast::<c_void>(),
            translation_query.as_ptr(),
            &mut translation_ptr,
            &mut translation_length,
        )
    } == 0
        || translation_length < 4
    {
        return None;
    }
    let translation = unsafe { std::slice::from_raw_parts(translation_ptr.cast::<u16>(), 2) };
    let query = format!(
        "\\StringFileInfo\\{:04x}{:04x}\\{key}",
        translation[0], translation[1]
    );
    let query = std::ffi::OsStr::new(&query)
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let mut value_ptr = ptr::null_mut::<c_void>();
    let mut value_length = 0_u32;
    if unsafe {
        VerQueryValueW(
            data.as_ptr().cast::<c_void>(),
            query.as_ptr(),
            &mut value_ptr,
            &mut value_length,
        )
    } == 0
        || value_length <= 1
    {
        return None;
    }
    let value =
        unsafe { std::slice::from_raw_parts(value_ptr.cast::<u16>(), value_length as usize - 1) };
    Some(String::from_utf16_lossy(value).trim().to_owned())
}

#[cfg(not(target_os = "windows"))]
fn file_version_string(_path: &Path, _key: &str) -> Option<String> {
    None
}

pub(crate) fn application_target_compatibility(path: &Path) -> ApplicationCompatibility {
    let is_shortcut = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("lnk"));
    if !is_shortcut {
        return application_compatibility(path);
    }
    if !path.is_file() {
        return incompatible(false, None, "시작 메뉴 바로가기가 존재하지 않습니다.");
    }
    if is_start_menu_shortcut(path) {
        compatible("Windows 시작 메뉴 바로가기")
    } else {
        incompatible(
            true,
            None,
            "보안을 위해 Windows 시작 메뉴 내부의 바로가기만 앱으로 실행할 수 있습니다.",
        )
    }
}

fn is_start_menu_shortcut(path: &Path) -> bool {
    let normalized_path = normalize_path(path);
    [
        env::var_os("APPDATA").map(|root| PathBuf::from(root).join("Microsoft/Windows/Start Menu")),
        env::var_os("PROGRAMDATA")
            .map(|root| PathBuf::from(root).join("Microsoft/Windows/Start Menu")),
    ]
    .into_iter()
    .flatten()
    .any(|root| {
        let normalized_root = normalize_path(&root);
        normalized_path == normalized_root || normalized_path.starts_with(&(normalized_root + "\\"))
    })
}

#[cfg(target_os = "windows")]
pub(crate) fn application_compatibility(path: &Path) -> ApplicationCompatibility {
    use std::{iter, os::windows::ffi::OsStrExt};

    #[link(name = "kernel32")]
    extern "system" {
        fn GetBinaryTypeW(application_name: *const u16, binary_type: *mut u32) -> i32;
    }

    if !path.is_file() {
        return incompatible(false, None, "실행 파일이 존재하지 않습니다.");
    }
    if !path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("exe"))
    {
        return incompatible(true, None, "Windows 실행 파일(.exe)이 아닙니다.");
    }
    let wide = path
        .as_os_str()
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let mut binary_type = 0_u32;
    let success = unsafe { GetBinaryTypeW(wide.as_ptr(), &mut binary_type) } != 0;
    if !success {
        return incompatible(
            true,
            None,
            "유효한 Windows 실행 파일인지 확인할 수 없습니다.",
        );
    }
    match binary_type {
        0 => compatible("32-bit Windows"),
        6 => compatible("64-bit Windows"),
        1 | 2 | 3 | 5 => incompatible(
            true,
            Some("Legacy Windows/DOS"),
            "현재 64비트 Windows와 호환되지 않는 실행 형식입니다.",
        ),
        4 => incompatible(
            true,
            Some("POSIX"),
            "Windows 데스크톱 애플리케이션이 아닙니다.",
        ),
        _ => incompatible(true, None, "알 수 없는 실행 파일 형식입니다."),
    }
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn application_compatibility(path: &Path) -> ApplicationCompatibility {
    incompatible(
        path.is_file(),
        None,
        "호환성 검사는 Windows에서만 지원합니다.",
    )
}

fn compatible(architecture: &str) -> ApplicationCompatibility {
    ApplicationCompatibility {
        compatible: true,
        exists: true,
        architecture: Some(architecture.to_owned()),
        message: None,
    }
}

fn incompatible(
    exists: bool,
    architecture: Option<&str>,
    message: &str,
) -> ApplicationCompatibility {
    ApplicationCompatibility {
        compatible: false,
        exists,
        architecture: architecture.map(str::to_owned),
        message: Some(message.to_owned()),
    }
}

#[cfg(target_os = "windows")]
fn query_associated_executable(extension: &str) -> Result<String, CommandError> {
    use std::{iter, os::windows::ffi::OsStrExt, ptr};

    #[link(name = "shlwapi")]
    extern "system" {
        fn AssocQueryStringW(
            flags: u32,
            string_type: u32,
            association: *const u16,
            extra: *const u16,
            output: *mut u16,
            output_length: *mut u32,
        ) -> i32;
    }

    const ASSOCSTR_EXECUTABLE: u32 = 2;
    let association = std::ffi::OsStr::new(extension)
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let mut output = vec![0_u16; 32_768];
    let mut output_length = output.len() as u32;
    let result = unsafe {
        AssocQueryStringW(
            0,
            ASSOCSTR_EXECUTABLE,
            association.as_ptr(),
            ptr::null(),
            output.as_mut_ptr(),
            &mut output_length,
        )
    };
    if result != 0 || output_length <= 1 {
        return Err(CommandError::new(
            "FILE_ASSOCIATION_NOT_FOUND",
            format!("{extension} 파일의 기본 연결 앱을 찾을 수 없습니다."),
        ));
    }
    Ok(String::from_utf16_lossy(
        &output[..output_length as usize - 1],
    ))
}

#[cfg(not(target_os = "windows"))]
fn query_associated_executable(_extension: &str) -> Result<String, CommandError> {
    Err(CommandError::new(
        "FILE_ASSOCIATION_UNSUPPORTED",
        "기본 연결 앱 검색은 Windows에서만 지원합니다.",
    ))
}

#[cfg(target_os = "windows")]
fn application_icon_data_url(path: &Path) -> Result<Option<String>, CommandError> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use std::{ffi::c_void, iter, mem, os::windows::ffi::OsStrExt, ptr};

    type Handle = *mut c_void;

    #[repr(C)]
    struct ShellFileInfo {
        icon: Handle,
        icon_index: i32,
        attributes: u32,
        display_name: [u16; 260],
        type_name: [u16; 80],
    }

    #[repr(C)]
    struct BitmapInfoHeader {
        size: u32,
        width: i32,
        height: i32,
        planes: u16,
        bit_count: u16,
        compression: u32,
        size_image: u32,
        x_pixels_per_meter: i32,
        y_pixels_per_meter: i32,
        colors_used: u32,
        colors_important: u32,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct RgbQuad {
        blue: u8,
        green: u8,
        red: u8,
        reserved: u8,
    }

    #[repr(C)]
    struct BitmapInfo {
        header: BitmapInfoHeader,
        colors: [RgbQuad; 1],
    }

    #[link(name = "shell32")]
    extern "system" {
        fn SHGetFileInfoW(
            path: *const u16,
            attributes: u32,
            info: *mut ShellFileInfo,
            info_size: u32,
            flags: u32,
        ) -> usize;
    }
    #[link(name = "gdi32")]
    extern "system" {
        fn CreateCompatibleDC(device_context: Handle) -> Handle;
        fn CreateDIBSection(
            device_context: Handle,
            info: *const BitmapInfo,
            usage: u32,
            bits: *mut *mut c_void,
            section: Handle,
            offset: u32,
        ) -> Handle;
        fn SelectObject(device_context: Handle, object: Handle) -> Handle;
        fn DeleteObject(object: Handle) -> i32;
        fn DeleteDC(device_context: Handle) -> i32;
    }
    #[link(name = "user32")]
    extern "system" {
        fn DrawIconEx(
            device_context: Handle,
            x: i32,
            y: i32,
            icon: Handle,
            width: i32,
            height: i32,
            step: u32,
            brush: Handle,
            flags: u32,
        ) -> i32;
        fn DestroyIcon(icon: Handle) -> i32;
    }

    const SHGFI_ICON: u32 = 0x0000_0100;
    const SHGFI_LARGEICON: u32 = 0;
    const DIB_RGB_COLORS: u32 = 0;
    const BI_RGB: u32 = 0;
    const DI_NORMAL: u32 = 0x0003;
    const ICON_SIZE: usize = 48;

    let compatibility = application_compatibility(path);
    if !compatibility.compatible {
        return Ok(None);
    }
    let wide_path = path
        .as_os_str()
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let mut shell_info: ShellFileInfo = unsafe { mem::zeroed() };
    let result = unsafe {
        SHGetFileInfoW(
            wide_path.as_ptr(),
            0,
            &mut shell_info,
            mem::size_of::<ShellFileInfo>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };
    if result == 0 || shell_info.icon.is_null() {
        return Ok(None);
    }

    let device_context = unsafe { CreateCompatibleDC(ptr::null_mut()) };
    if device_context.is_null() {
        unsafe { DestroyIcon(shell_info.icon) };
        return Ok(None);
    }
    let bitmap_info = BitmapInfo {
        header: BitmapInfoHeader {
            size: mem::size_of::<BitmapInfoHeader>() as u32,
            width: ICON_SIZE as i32,
            height: -(ICON_SIZE as i32),
            planes: 1,
            bit_count: 32,
            compression: BI_RGB,
            size_image: (ICON_SIZE * ICON_SIZE * 4) as u32,
            x_pixels_per_meter: 0,
            y_pixels_per_meter: 0,
            colors_used: 0,
            colors_important: 0,
        },
        colors: [RgbQuad {
            blue: 0,
            green: 0,
            red: 0,
            reserved: 0,
        }],
    };
    let mut bits = ptr::null_mut::<c_void>();
    let bitmap = unsafe {
        CreateDIBSection(
            device_context,
            &bitmap_info,
            DIB_RGB_COLORS,
            &mut bits,
            ptr::null_mut(),
            0,
        )
    };
    if bitmap.is_null() || bits.is_null() {
        unsafe {
            DeleteDC(device_context);
            DestroyIcon(shell_info.icon);
        }
        return Ok(None);
    }
    let previous = unsafe { SelectObject(device_context, bitmap) };
    let drawn = unsafe {
        DrawIconEx(
            device_context,
            0,
            0,
            shell_info.icon,
            ICON_SIZE as i32,
            ICON_SIZE as i32,
            0,
            ptr::null_mut(),
            DI_NORMAL,
        )
    };
    let bgra = unsafe { std::slice::from_raw_parts(bits.cast::<u8>(), ICON_SIZE * ICON_SIZE * 4) };
    let mut rgba = Vec::with_capacity(bgra.len());
    for pixel in bgra.chunks_exact(4) {
        rgba.extend_from_slice(&[pixel[2], pixel[1], pixel[0], pixel[3]]);
    }
    if rgba.chunks_exact(4).all(|pixel| pixel[3] == 0) {
        for pixel in rgba.chunks_exact_mut(4) {
            if pixel[0] != 0 || pixel[1] != 0 || pixel[2] != 0 {
                pixel[3] = 255;
            }
        }
    }
    unsafe {
        SelectObject(device_context, previous);
        DeleteObject(bitmap);
        DeleteDC(device_context);
        DestroyIcon(shell_info.icon);
    }
    if drawn == 0 {
        return Ok(None);
    }

    let mut png_bytes = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, ICON_SIZE as u32, ICON_SIZE as u32);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|error| CommandError::new("APPLICATION_ICON_FAILED", error.to_string()))?;
        writer
            .write_image_data(&rgba)
            .map_err(|error| CommandError::new("APPLICATION_ICON_FAILED", error.to_string()))?;
    }
    Ok(Some(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(png_bytes)
    )))
}

#[cfg(not(target_os = "windows"))]
fn application_icon_data_url(_path: &Path) -> Result<Option<String>, CommandError> {
    Ok(None)
}

fn display_name(path: &Path) -> String {
    path.file_stem()
        .map(|name| name.to_string_lossy().trim().to_owned())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Unknown application".to_owned())
}

fn normalize_path(path: &Path) -> String {
    fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::{
        application_compatibility, is_program_application_candidate, normalize_path,
        process_start_executable_name, ApplicationSource, DetectedApplication,
    };
    use std::path::Path;

    #[test]
    fn path_normalization_is_case_insensitive() {
        assert_eq!(
            normalize_path(Path::new("C:/Apps/Example.EXE")),
            normalize_path(Path::new("c:\\apps\\example.exe"))
        );
    }

    #[test]
    fn source_serializes_as_snake_case() {
        let application = DetectedApplication {
            id: "id".to_owned(),
            name: "App".to_owned(),
            executable_path: "app.exe".to_owned(),
            shortcut_path: None,
            source: ApplicationSource::UserStartMenu,
            icon_path: None,
            valid: true,
            compatibility: super::compatible("64-bit Windows"),
            is_installer: false,
        };
        let json = serde_json::to_string(&application).expect("serialize application");
        assert!(json.contains("user_start_menu"));
    }

    #[test]
    fn squirrel_shortcut_accepts_only_plain_process_executable_names() {
        assert_eq!(
            process_start_executable_name("--processStart Discord.exe"),
            Some("Discord.exe")
        );
        assert_eq!(
            process_start_executable_name("--processStart \"Discord.exe\" --flag"),
            Some("Discord.exe")
        );
        assert_eq!(
            process_start_executable_name("--processStart ..\\malicious.exe"),
            None
        );
        assert_eq!(
            process_start_executable_name("--processStart cmd.exe /c calc"),
            Some("cmd.exe")
        );
    }

    #[test]
    fn program_files_scan_filters_install_management_executables() {
        assert!(is_program_application_candidate(Path::new(
            "C:/Apps/HashCalc.exe"
        )));
        assert!(!is_program_application_candidate(Path::new(
            "C:/Apps/uninstall.exe"
        )));
        assert!(!is_program_application_candidate(Path::new(
            "C:/Apps/updater.exe"
        )));
        assert!(!is_program_application_candidate(Path::new(
            "C:/Apps/readme.txt"
        )));
    }

    #[test]
    fn representative_scoring_prefers_main_application() {
        let root = Path::new("C:/Program Files");
        let main = super::executable_candidate_score(
            root,
            Path::new("C:/Program Files/Autopsy-4.22.1/bin/autopsy64.exe"),
            "Autopsy",
        );
        let helper = super::executable_candidate_score(
            root,
            Path::new("C:/Program Files/Autopsy-4.22.1/autopsy/wrr/wrr.exe"),
            "zzzzzzzzzzzzzzzzzzzz",
        );
        assert!(main > helper);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn current_test_executable_is_windows_compatible() {
        let executable = std::env::current_exe().expect("current test executable");
        let compatibility = application_compatibility(&executable);
        assert!(compatibility.exists);
        assert!(compatibility.compatible, "{:?}", compatibility.message);
        assert!(compatibility.architecture.is_some());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn configured_executable_uses_windows_product_metadata() {
        let Ok(path) = std::env::var("TASKDECK_TEST_EXECUTABLE") else {
            return;
        };
        let application = super::default_application_for_file(Path::new(&path))
            .expect("inspect configured executable through file association flow");
        assert!(application.valid, "{:?}", application.compatibility.message);
        assert!(!application.name.trim().is_empty());
        if let Ok(expected_name) = std::env::var("TASKDECK_TEST_EXECUTABLE_NAME") {
            assert_eq!(application.name, expected_name);
        }
        if std::env::var("TASKDECK_TEST_EXECUTABLE_INSTALLER").as_deref() == Ok("true") {
            assert!(application.is_installer);
        }
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn configured_executable_icon_is_png_data_url() {
        let Ok(path) = std::env::var("TASKDECK_TEST_EXECUTABLE") else {
            return;
        };
        let icon = super::application_icon_data_url(Path::new(&path))
            .expect("extract configured executable icon")
            .expect("configured executable should have an icon");
        assert!(icon.starts_with("data:image/png;base64,"));
    }
}

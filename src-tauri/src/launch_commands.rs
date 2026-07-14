use std::{collections::HashSet, path::Path, process::Command, sync::Mutex, time::Duration};

use rusqlite::params;
use serde::Serialize;
use tauri::{Emitter, State, Window};
use url::Url;

use crate::{
    database::Database,
    error::CommandError,
    models::{Resource, ResourceType},
    resource_commands::{find_resource, RESOURCE_COLUMNS},
    settings_commands::read_launch_interval,
};

#[derive(Default)]
pub struct BatchLaunchState(Mutex<HashSet<String>>);

struct BatchRunGuard<'a> {
    state: &'a BatchLaunchState,
    workspace_id: String,
}

impl Drop for BatchRunGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut running) = self.state.0.lock() {
            running.remove(&self.workspace_id);
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceValidationResult {
    pub valid: bool,
    pub exists: bool,
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub success: bool,
    pub resource_id: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchLaunchItemResult {
    pub resource_id: String,
    pub resource_name: String,
    pub success: bool,
    pub skipped: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchLaunchResult {
    pub workspace_id: String,
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub skipped: usize,
    pub items: Vec<BatchLaunchItemResult>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchLaunchProgress {
    workspace_id: String,
    completed: usize,
    total: usize,
    current_resource_name: String,
}

#[tauri::command]
pub fn validate_resource_target(
    resource_id: String,
    database: State<'_, Database>,
) -> Result<ResourceValidationResult, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let resource = find_resource(&connection, &resource_id)?
        .ok_or_else(|| CommandError::resource_not_found(&resource_id))?;
    Ok(validate_target(&resource))
}

#[tauri::command]
pub fn launch_resource(
    resource_id: String,
    database: State<'_, Database>,
) -> Result<LaunchResult, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let resource = find_resource(&connection, &resource_id)?
        .ok_or_else(|| CommandError::resource_not_found(&resource_id))?;
    drop(connection);

    if !resource.is_enabled {
        return Ok(LaunchResult::failure(
            &resource,
            "비활성화된 리소스는 실행할 수 없습니다.",
        ));
    }

    let validation = validate_target(&resource);
    if !validation.valid {
        return Ok(LaunchResult::failure(
            &resource,
            validation
                .message
                .as_deref()
                .unwrap_or("리소스 대상이 유효하지 않습니다."),
        ));
    }

    Ok(launch_validated_resource(&resource))
}

#[tauri::command]
pub fn open_external_website(url: String) -> Result<(), CommandError> {
    let parsed = Url::parse(url.trim()).map_err(|_| {
        CommandError::new(
            "INVALID_EXTERNAL_URL",
            "유효한 공식 웹사이트 주소가 아닙니다.",
        )
    })?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err(CommandError::new(
            "INVALID_EXTERNAL_URL",
            "http 또는 https 공식 웹사이트만 열 수 있습니다.",
        ));
    }
    shell_open(parsed.as_str()).map_err(|message| CommandError::new("OPEN_WEBSITE_FAILED", message))
}

#[tauri::command]
pub async fn launch_workspace_resources(
    workspace_id: String,
    window: Window,
    database: State<'_, Database>,
    batch_state: State<'_, BatchLaunchState>,
) -> Result<BatchLaunchResult, CommandError> {
    let (resources, interval_ms) = {
        let connection = database.0.lock().map_err(|_| CommandError::lock())?;
        let mut statement = connection.prepare(&format!(
            "SELECT {RESOURCE_COLUMNS} FROM resources
             WHERE workspace_id = ?1 AND is_enabled = 1
             ORDER BY launch_order ASC, created_at ASC"
        ))?;
        let resources = statement
            .query_map(params![workspace_id], Resource::from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        let interval_ms = read_launch_interval(&connection)?;
        (resources, interval_ms)
    };

    {
        let mut running = batch_state.0.lock().map_err(|_| CommandError::lock())?;
        if !running.insert(workspace_id.clone()) {
            return Err(CommandError::new(
                "BATCH_ALREADY_RUNNING",
                "이 작업 공간의 일괄 실행이 이미 진행 중입니다.",
            ));
        }
    }
    let _run_guard = BatchRunGuard {
        state: batch_state.inner(),
        workspace_id: workspace_id.clone(),
    };

    let prepared = resources
        .into_iter()
        .map(|resource| {
            let validation = validate_target(&resource);
            (resource, validation)
        })
        .collect::<Vec<_>>();
    let valid_count = prepared
        .iter()
        .filter(|(_, validation)| validation.valid)
        .count();
    let total = prepared.len();
    let mut launch_attempts = 0;
    let mut items = Vec::with_capacity(total);

    for (index, (resource, validation)) in prepared.iter().enumerate() {
        let _ = window.emit(
            "batch-launch-progress",
            BatchLaunchProgress {
                workspace_id: workspace_id.clone(),
                completed: index,
                total,
                current_resource_name: resource.name.clone(),
            },
        );

        let item = if !validation.valid {
            BatchLaunchItemResult {
                resource_id: resource.id.clone(),
                resource_name: resource.name.clone(),
                success: false,
                skipped: true,
                message: validation
                    .message
                    .clone()
                    .unwrap_or_else(|| "유효하지 않은 리소스입니다.".to_owned()),
            }
        } else {
            let result = launch_validated_resource(resource);
            launch_attempts += 1;
            let item = BatchLaunchItemResult {
                resource_id: resource.id.clone(),
                resource_name: resource.name.clone(),
                success: result.success,
                skipped: false,
                message: result.message,
            };
            if launch_attempts < valid_count && interval_ms > 0 {
                tokio::time::sleep(Duration::from_millis(interval_ms)).await;
            }
            item
        };
        items.push(item);

        let _ = window.emit(
            "batch-launch-progress",
            BatchLaunchProgress {
                workspace_id: workspace_id.clone(),
                completed: index + 1,
                total,
                current_resource_name: resource.name.clone(),
            },
        );
    }

    Ok(build_batch_result(workspace_id, items))
}

fn build_batch_result(
    workspace_id: String,
    items: Vec<BatchLaunchItemResult>,
) -> BatchLaunchResult {
    let succeeded = items.iter().filter(|item| item.success).count();
    let skipped = items.iter().filter(|item| item.skipped).count();
    let failed = items
        .iter()
        .filter(|item| !item.success && !item.skipped)
        .count();
    BatchLaunchResult {
        workspace_id,
        total: items.len(),
        succeeded,
        failed,
        skipped,
        items,
    }
}

fn launch_validated_resource(resource: &Resource) -> LaunchResult {
    let launch_result = match resource.resource_type {
        ResourceType::Application if is_windows_shortcut(&resource.target) => {
            shell_open(&resource.target)
        }
        ResourceType::Application => launch_application(&resource.target),
        ResourceType::Website | ResourceType::Folder | ResourceType::File => {
            shell_open(&resource.target)
        }
    };

    match launch_result {
        Ok(()) => LaunchResult {
            success: true,
            resource_id: resource.id.clone(),
            message: format!("{}을(를) 실행했습니다.", resource.name),
        },
        Err(message) => LaunchResult::failure(resource, message),
    }
}

impl LaunchResult {
    fn failure(resource: &Resource, message: impl Into<String>) -> Self {
        Self {
            success: false,
            resource_id: resource.id.clone(),
            message: message.into(),
        }
    }
}

fn validate_target(resource: &Resource) -> ResourceValidationResult {
    match resource.resource_type {
        ResourceType::Application => {
            let compatibility =
                crate::scan_commands::application_target_compatibility(Path::new(&resource.target));
            if compatibility.compatible {
                valid()
            } else {
                invalid(
                    compatibility.exists,
                    compatibility
                        .message
                        .unwrap_or_else(|| "앱 실행 대상을 확인할 수 없습니다.".to_owned()),
                )
            }
        }
        ResourceType::Website => match Url::parse(&resource.target) {
            Ok(url) if matches!(url.scheme(), "http" | "https") && url.host_str().is_some() => {
                valid()
            }
            _ => invalid(
                false,
                "http:// 또는 https:// 웹사이트 URL만 열 수 있습니다.",
            ),
        },
        ResourceType::Folder => {
            if Path::new(&resource.target).is_dir() {
                valid()
            } else {
                invalid(false, "폴더가 존재하지 않습니다.")
            }
        }
        ResourceType::File => {
            if Path::new(&resource.target).is_file() {
                valid()
            } else {
                invalid(false, "파일이 존재하지 않습니다.")
            }
        }
    }
}

fn is_windows_shortcut(target: &str) -> bool {
    Path::new(target)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("lnk"))
}

fn valid() -> ResourceValidationResult {
    ResourceValidationResult {
        valid: true,
        exists: true,
        message: None,
    }
}

fn invalid(exists: bool, message: impl Into<String>) -> ResourceValidationResult {
    ResourceValidationResult {
        valid: false,
        exists,
        message: Some(message.into()),
    }
}

#[cfg(target_os = "windows")]
fn launch_application(target: &str) -> Result<(), String> {
    use std::os::windows::process::CommandExt;

    const DETACHED_PROCESS: u32 = 0x0000_0008;
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;

    let path = Path::new(target);
    let mut command = Command::new(path);
    if let Some(parent) = path.parent() {
        command.current_dir(parent);
    }
    command.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("애플리케이션을 실행하지 못했습니다: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn launch_application(_target: &str) -> Result<(), String> {
    Err("애플리케이션 실행은 Windows에서만 지원합니다.".to_owned())
}

#[cfg(target_os = "windows")]
fn shell_open(target: &str) -> Result<(), String> {
    use std::{ffi::c_void, iter, os::windows::ffi::OsStrExt, ptr};

    #[link(name = "shell32")]
    extern "system" {
        fn ShellExecuteW(
            hwnd: *mut c_void,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show_command: i32,
        ) -> isize;
    }

    let operation = std::ffi::OsStr::new("open")
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let target = std::ffi::OsStr::new(target)
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();

    // ShellExecuteW receives separate wide-string arguments; no command shell parses the target.
    let result = unsafe {
        ShellExecuteW(
            ptr::null_mut(),
            operation.as_ptr(),
            target.as_ptr(),
            ptr::null(),
            ptr::null(),
            1,
        )
    };
    if result > 32 {
        Ok(())
    } else {
        Err(format!(
            "운영체제가 대상을 열지 못했습니다. 오류 코드: {result}"
        ))
    }
}

#[cfg(not(target_os = "windows"))]
fn shell_open(_target: &str) -> Result<(), String> {
    Err("리소스 열기는 Windows에서만 지원합니다.".to_owned())
}

#[cfg(test)]
mod tests {
    use super::{build_batch_result, validate_target, BatchLaunchItemResult};
    use crate::models::{Resource, ResourceType};

    fn website(target: &str) -> Resource {
        Resource {
            id: "resource-1".to_owned(),
            workspace_id: "workspace-1".to_owned(),
            resource_type: ResourceType::Website,
            name: "Website".to_owned(),
            target: target.to_owned(),
            icon: None,
            description: None,
            launch_order: 0,
            is_enabled: true,
            created_at: "2026-01-01T00:00:00Z".to_owned(),
            updated_at: "2026-01-01T00:00:00Z".to_owned(),
        }
    }

    #[test]
    fn website_allows_only_http_and_https() {
        assert!(validate_target(&website("https://example.com")).valid);
        assert!(validate_target(&website("http://example.com")).valid);
        assert!(!validate_target(&website("file:///C:/secret.txt")).valid);
        assert!(!validate_target(&website("javascript:alert(1)")).valid);
    }

    #[test]
    fn external_url_allows_only_http_and_https() {
        for url in ["https://example.com", "http://example.com"] {
            let parsed = url::Url::parse(url).expect("parse safe URL");
            assert!(matches!(parsed.scheme(), "http" | "https"));
        }
        for url in ["file:///C:/Windows", "javascript:alert(1)"] {
            let parsed = url::Url::parse(url).expect("parse blocked URL");
            assert!(!matches!(parsed.scheme(), "http" | "https"));
        }
    }

    #[test]
    fn batch_result_counts_success_failure_and_skipped() {
        let item = |success, skipped| BatchLaunchItemResult {
            resource_id: "resource".to_owned(),
            resource_name: "Resource".to_owned(),
            success,
            skipped,
            message: "result".to_owned(),
        };
        let result = build_batch_result(
            "workspace-1".to_owned(),
            vec![item(true, false), item(false, false), item(false, true)],
        );
        assert_eq!(result.total, 3);
        assert_eq!(result.succeeded, 1);
        assert_eq!(result.failed, 1);
        assert_eq!(result.skipped, 1);
    }
}

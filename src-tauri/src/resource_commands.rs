use std::collections::HashSet;
use std::path::Path;

use chrono::{SecondsFormat, Utc};
use rusqlite::{params, OptionalExtension};
use tauri::State;
use url::Url;
use uuid::Uuid;

use crate::{
    database::Database,
    error::CommandError,
    models::{Resource, ResourceInput},
};

pub(crate) const RESOURCE_COLUMNS: &str =
    "id, workspace_id, type, name, target, icon, description, \
    launch_order, is_enabled, created_at, updated_at";

#[tauri::command]
pub fn get_resources_by_workspace(
    workspace_id: String,
    database: State<'_, Database>,
) -> Result<Vec<Resource>, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let mut statement = connection.prepare(&format!(
        "SELECT {RESOURCE_COLUMNS} FROM resources
         WHERE workspace_id = ?1 ORDER BY launch_order ASC, created_at ASC"
    ))?;
    let rows = statement.query_map(params![workspace_id], Resource::from_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

#[tauri::command]
pub fn create_resource(
    workspace_id: String,
    input: ResourceInput,
    database: State<'_, Database>,
) -> Result<Resource, CommandError> {
    let input = validate_input(input)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;

    let workspace_exists: bool = connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM workspaces WHERE id = ?1)",
        params![workspace_id],
        |row| row.get(0),
    )?;
    if !workspace_exists {
        return Err(CommandError::not_found(&workspace_id));
    }

    if matches!(
        input.resource_type,
        crate::models::ResourceType::Application
    ) && application_target_exists(&connection, &workspace_id, &input.target, None)?
    {
        return Err(CommandError::new(
            "DUPLICATE_APPLICATION",
            "같은 실행 경로의 애플리케이션이 이미 등록되어 있습니다.",
        ));
    }

    let launch_order: i64 = connection.query_row(
        "SELECT COALESCE(MAX(launch_order), -1) + 1 FROM resources WHERE workspace_id = ?1",
        params![workspace_id],
        |row| row.get(0),
    )?;
    connection.execute(
        "INSERT INTO resources
         (id, workspace_id, type, name, target, icon, description, launch_order,
          is_enabled, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        params![
            id,
            workspace_id,
            input.resource_type.as_str(),
            input.name,
            input.target,
            input.icon,
            input.description,
            launch_order,
            input.is_enabled,
            now,
        ],
    )?;
    find_resource(&connection, &id)?.ok_or_else(|| CommandError::resource_not_found(&id))
}

#[tauri::command]
pub fn update_resource(
    id: String,
    input: ResourceInput,
    database: State<'_, Database>,
) -> Result<Resource, CommandError> {
    let input = validate_input(input)?;
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let existing =
        find_resource(&connection, &id)?.ok_or_else(|| CommandError::resource_not_found(&id))?;
    if matches!(
        input.resource_type,
        crate::models::ResourceType::Application
    ) && application_target_exists(
        &connection,
        &existing.workspace_id,
        &input.target,
        Some(&id),
    )? {
        return Err(CommandError::new(
            "DUPLICATE_APPLICATION",
            "같은 실행 경로의 애플리케이션이 이미 등록되어 있습니다.",
        ));
    }
    let affected = connection.execute(
        "UPDATE resources SET type = ?1, name = ?2, target = ?3, icon = ?4,
         description = ?5, is_enabled = ?6, updated_at = ?7 WHERE id = ?8",
        params![
            input.resource_type.as_str(),
            input.name,
            input.target,
            input.icon,
            input.description,
            input.is_enabled,
            now,
            id,
        ],
    )?;
    if affected == 0 {
        return Err(CommandError::resource_not_found(&id));
    }
    find_resource(&connection, &id)?.ok_or_else(|| CommandError::resource_not_found(&id))
}

#[tauri::command]
pub fn delete_resource(id: String, database: State<'_, Database>) -> Result<(), CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let affected = connection.execute("DELETE FROM resources WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(CommandError::resource_not_found(&id));
    }
    Ok(())
}

#[tauri::command]
pub fn reorder_resources(
    workspace_id: String,
    ordered_ids: Vec<String>,
    database: State<'_, Database>,
) -> Result<Vec<Resource>, CommandError> {
    if ordered_ids.iter().collect::<HashSet<_>>().len() != ordered_ids.len() {
        return Err(CommandError::invalid_order());
    }
    let mut connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let transaction = connection.transaction()?;
    let expected_count: i64 = transaction.query_row(
        "SELECT COUNT(*) FROM resources WHERE workspace_id = ?1",
        params![workspace_id],
        |row| row.get(0),
    )?;
    if expected_count != ordered_ids.len() as i64 {
        return Err(CommandError::invalid_order());
    }

    for (order, id) in ordered_ids.iter().enumerate() {
        let affected = transaction.execute(
            "UPDATE resources SET launch_order = ?1 WHERE id = ?2 AND workspace_id = ?3",
            params![order as i64, id, workspace_id],
        )?;
        if affected != 1 {
            return Err(CommandError::invalid_order());
        }
    }
    transaction.commit()?;
    drop(connection);
    get_resources_by_workspace(workspace_id, database)
}

#[tauri::command]
pub fn toggle_resource_enabled(
    id: String,
    is_enabled: bool,
    database: State<'_, Database>,
) -> Result<Resource, CommandError> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let affected = connection.execute(
        "UPDATE resources SET is_enabled = ?1, updated_at = ?2 WHERE id = ?3",
        params![is_enabled, now, id],
    )?;
    if affected == 0 {
        return Err(CommandError::resource_not_found(&id));
    }
    find_resource(&connection, &id)?.ok_or_else(|| CommandError::resource_not_found(&id))
}

fn validate_input(input: ResourceInput) -> Result<ResourceInput, CommandError> {
    let input = input.normalized();
    if input.name.is_empty() {
        return Err(CommandError::invalid_resource(
            "name",
            "리소스 이름을 입력해 주세요.",
        ));
    }
    if input.target.is_empty() {
        return Err(CommandError::invalid_resource(
            "target",
            "리소스 대상 경로 또는 URL을 입력해 주세요.",
        ));
    }
    validate_length("name", &input.name, 200)?;
    validate_length("target", &input.target, 4_096)?;
    if let Some(icon) = input.icon.as_deref() {
        validate_length("icon", icon, 500)?;
    }
    if let Some(description) = input.description.as_deref() {
        validate_length("description", description, 2_000)?;
    }
    if matches!(input.resource_type, crate::models::ResourceType::Website)
        && !is_valid_website_url(&input.target)
    {
        return Err(CommandError::invalid_resource(
            "target",
            "웹사이트 URL은 http:// 또는 https://로 시작해야 합니다.",
        ));
    }
    if matches!(
        input.resource_type,
        crate::models::ResourceType::Application
    ) {
        let compatibility =
            crate::scan_commands::application_target_compatibility(Path::new(&input.target));
        if !compatibility.compatible {
            return Err(CommandError::invalid_resource(
                "target",
                compatibility
                    .message
                    .as_deref()
                    .unwrap_or("호환되는 Windows 실행 파일이 아닙니다."),
            ));
        }
    }
    Ok(input)
}

fn validate_length(field: &str, value: &str, max: usize) -> Result<(), CommandError> {
    if value.chars().count() > max {
        return Err(CommandError::invalid_resource(
            field,
            &format!("{field}: 최대 {max}자까지 허용됩니다."),
        ));
    }
    Ok(())
}

fn is_valid_website_url(target: &str) -> bool {
    Url::parse(target)
        .is_ok_and(|url| matches!(url.scheme(), "http" | "https") && url.host_str().is_some())
}

fn normalize_windows_path(path: &str) -> String {
    path.trim()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase()
}

fn application_target_exists(
    connection: &rusqlite::Connection,
    workspace_id: &str,
    target: &str,
    exclude_id: Option<&str>,
) -> Result<bool, CommandError> {
    let normalized_target = normalize_windows_path(target);
    let mut statement = connection.prepare(
        "SELECT id, target FROM resources WHERE workspace_id = ?1 AND type = 'application'",
    )?;
    let rows = statement.query_map(params![workspace_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    for row in rows {
        let (id, stored_target) = row?;
        if exclude_id == Some(id.as_str()) {
            continue;
        }
        if normalize_windows_path(&stored_target) == normalized_target {
            return Ok(true);
        }
    }
    Ok(false)
}

pub(crate) fn find_resource(
    connection: &rusqlite::Connection,
    id: &str,
) -> Result<Option<Resource>, CommandError> {
    connection
        .query_row(
            &format!("SELECT {RESOURCE_COLUMNS} FROM resources WHERE id = ?1"),
            params![id],
            Resource::from_row,
        )
        .optional()
        .map_err(Into::into)
}

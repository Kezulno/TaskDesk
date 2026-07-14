use chrono::{SecondsFormat, Utc};
use rusqlite::{params, OptionalExtension};
use tauri::State;
use uuid::Uuid;

use crate::{
    database::Database,
    error::CommandError,
    models::{Workspace, WorkspaceInput},
};

const WORKSPACE_COLUMNS: &str =
    "id, name, description, icon, color, is_favorite, created_at, updated_at";

#[tauri::command]
pub fn get_workspaces(database: State<'_, Database>) -> Result<Vec<Workspace>, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let mut statement = connection.prepare(&format!(
        "SELECT {WORKSPACE_COLUMNS} FROM workspaces ORDER BY is_favorite DESC, updated_at DESC"
    ))?;
    let rows = statement.query_map([], Workspace::from_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

#[tauri::command]
pub fn get_workspace(id: String, database: State<'_, Database>) -> Result<Workspace, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    find_workspace(&connection, &id)?.ok_or_else(|| CommandError::not_found(&id))
}

#[tauri::command]
pub fn create_workspace(
    input: WorkspaceInput,
    database: State<'_, Database>,
) -> Result<Workspace, CommandError> {
    let input = validate_workspace_input(input)?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    connection.execute(
        "INSERT INTO workspaces
         (id, name, description, icon, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.name,
            input.description,
            input.icon,
            input.color,
            now,
            now
        ],
    )?;

    find_workspace(&connection, &id)?.ok_or_else(|| CommandError::not_found(&id))
}

#[tauri::command]
pub fn update_workspace(
    id: String,
    input: WorkspaceInput,
    database: State<'_, Database>,
) -> Result<Workspace, CommandError> {
    let input = validate_workspace_input(input)?;

    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let affected = connection.execute(
        "UPDATE workspaces
         SET name = ?1, description = ?2, icon = ?3, color = ?4, updated_at = ?5
         WHERE id = ?6",
        params![
            input.name,
            input.description,
            input.icon,
            input.color,
            now,
            id
        ],
    )?;
    if affected == 0 {
        return Err(CommandError::not_found(&id));
    }

    find_workspace(&connection, &id)?.ok_or_else(|| CommandError::not_found(&id))
}

#[tauri::command]
pub fn delete_workspace(id: String, database: State<'_, Database>) -> Result<(), CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let affected = connection.execute("DELETE FROM workspaces WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(CommandError::not_found(&id));
    }
    Ok(())
}

#[tauri::command]
pub fn set_workspace_favorite(
    id: String,
    is_favorite: bool,
    database: State<'_, Database>,
) -> Result<Workspace, CommandError> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let affected = connection.execute(
        "UPDATE workspaces SET is_favorite = ?1, updated_at = ?2 WHERE id = ?3",
        params![is_favorite, now, id],
    )?;
    if affected == 0 {
        return Err(CommandError::not_found(&id));
    }
    find_workspace(&connection, &id)?.ok_or_else(|| CommandError::not_found(&id))
}

#[tauri::command]
pub fn duplicate_workspace(
    id: String,
    database: State<'_, Database>,
) -> Result<Workspace, CommandError> {
    let mut connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let source = find_workspace(&connection, &id)?.ok_or_else(|| CommandError::not_found(&id))?;
    let name = unique_copy_name(&connection, &source.name)?;
    let mut statement = connection.prepare(
        "SELECT type, name, target, icon, description, launch_order, is_enabled
         FROM resources WHERE workspace_id = ?1 ORDER BY launch_order, created_at",
    )?;
    let resources = statement
        .query_map(params![id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, bool>(6)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let transaction = connection.transaction()?;
    transaction.execute(
        "INSERT INTO workspaces
         (id, name, description, icon, color, is_favorite, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)",
        params![
            new_id,
            name,
            source.description,
            source.icon,
            source.color,
            now
        ],
    )?;
    for (resource_type, resource_name, target, icon, description, launch_order, is_enabled) in
        resources
    {
        transaction.execute(
            "INSERT INTO resources
             (id, workspace_id, type, name, target, icon, description, launch_order,
              is_enabled, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![
                Uuid::new_v4().to_string(),
                new_id,
                resource_type,
                resource_name,
                target,
                icon,
                description,
                launch_order,
                is_enabled,
                now
            ],
        )?;
    }
    transaction.commit()?;
    find_workspace(&connection, &new_id)?.ok_or_else(|| CommandError::not_found(&new_id))
}

fn unique_copy_name(
    connection: &rusqlite::Connection,
    source_name: &str,
) -> Result<String, CommandError> {
    let base = format!("{source_name} 복사본");
    let mut candidate = base.clone();
    let mut suffix = 2;
    loop {
        let exists: bool = connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM workspaces WHERE name = ?1)",
            params![candidate],
            |row| row.get(0),
        )?;
        if !exists {
            return Ok(candidate);
        }
        candidate = format!("{base} ({suffix})");
        suffix += 1;
    }
}

fn find_workspace(
    connection: &rusqlite::Connection,
    id: &str,
) -> Result<Option<Workspace>, CommandError> {
    connection
        .query_row(
            &format!("SELECT {WORKSPACE_COLUMNS} FROM workspaces WHERE id = ?1"),
            params![id],
            Workspace::from_row,
        )
        .optional()
        .map_err(Into::into)
}

fn validate_workspace_input(input: WorkspaceInput) -> Result<WorkspaceInput, CommandError> {
    let input = input.normalized();
    if input.name.is_empty() {
        return Err(CommandError::invalid_name());
    }
    validate_length("name", &input.name, 120)?;
    validate_optional_length("description", input.description.as_deref(), 2_000)?;
    validate_optional_length("icon", input.icon.as_deref(), 200)?;
    validate_optional_length("color", input.color.as_deref(), 100)?;
    Ok(input)
}

fn validate_optional_length(
    field: &str,
    value: Option<&str>,
    max: usize,
) -> Result<(), CommandError> {
    if let Some(value) = value {
        validate_length(field, value, max)?;
    }
    Ok(())
}

fn validate_length(field: &str, value: &str, max: usize) -> Result<(), CommandError> {
    if value.chars().count() > max {
        return Err(CommandError::new(
            "INVALID_WORKSPACE_FIELD",
            format!("{field}: 최대 {max}자까지 허용됩니다."),
        ));
    }
    Ok(())
}

use std::sync::atomic::{AtomicBool, Ordering};

use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;

use crate::{database::Database, error::CommandError};

pub struct TrayBehaviorState {
    pub close_to_tray: AtomicBool,
    pub quitting: AtomicBool,
}

impl TrayBehaviorState {
    pub fn new(close_to_tray: bool) -> Self {
        Self {
            close_to_tray: AtomicBool::new(close_to_tray),
            quitting: AtomicBool::new(false),
        }
    }
}

pub const DEFAULT_LAUNCH_INTERVAL_MS: u64 = 500;
pub const MAX_LAUNCH_INTERVAL_MS: u64 = 5_000;
pub const DEFAULT_LANGUAGE: &str = "ko";

#[tauri::command]
pub fn get_launch_interval(database: State<'_, Database>) -> Result<u64, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    read_launch_interval(&connection)
}

#[tauri::command]
pub fn set_launch_interval(
    interval_ms: u64,
    database: State<'_, Database>,
) -> Result<u64, CommandError> {
    if interval_ms > MAX_LAUNCH_INTERVAL_MS {
        return Err(CommandError::new(
            "INVALID_LAUNCH_INTERVAL",
            "실행 간격은 0ms에서 5000ms 사이여야 합니다.",
        ));
    }
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    connection.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES ('launch_interval_ms', ?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![interval_ms.to_string(), now],
    )?;
    Ok(interval_ms)
}

pub(crate) fn read_launch_interval(connection: &Connection) -> Result<u64, CommandError> {
    let value: String = connection.query_row(
        "SELECT value FROM settings WHERE key = 'launch_interval_ms'",
        [],
        |row| row.get(0),
    )?;
    Ok(value
        .parse::<u64>()
        .unwrap_or(DEFAULT_LAUNCH_INTERVAL_MS)
        .min(MAX_LAUNCH_INTERVAL_MS))
}

#[tauri::command]
pub fn get_close_to_tray(
    database: State<'_, Database>,
    tray_state: State<'_, TrayBehaviorState>,
) -> Result<bool, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let enabled = read_close_to_tray(&connection)?;
    tray_state.close_to_tray.store(enabled, Ordering::Relaxed);
    Ok(enabled)
}

#[tauri::command]
pub fn set_close_to_tray(
    enabled: bool,
    database: State<'_, Database>,
    tray_state: State<'_, TrayBehaviorState>,
) -> Result<bool, CommandError> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    connection.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES ('close_to_tray', ?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![enabled.to_string(), now],
    )?;
    tray_state.close_to_tray.store(enabled, Ordering::Relaxed);
    Ok(enabled)
}

pub(crate) fn read_close_to_tray(connection: &Connection) -> Result<bool, CommandError> {
    let value: String = connection.query_row(
        "SELECT value FROM settings WHERE key = 'close_to_tray'",
        [],
        |row| row.get(0),
    )?;
    Ok(value.eq_ignore_ascii_case("true"))
}

#[tauri::command]
pub fn get_language(database: State<'_, Database>) -> Result<String, CommandError> {
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let value = connection
        .query_row(
            "SELECT value FROM settings WHERE key = 'language'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    Ok(match value.as_deref() {
        Some("en") => "en".to_owned(),
        _ => DEFAULT_LANGUAGE.to_owned(),
    })
}

#[tauri::command]
pub fn set_language(
    language: String,
    database: State<'_, Database>,
) -> Result<String, CommandError> {
    if !matches!(language.as_str(), "ko" | "en") {
        return Err(CommandError::new(
            "INVALID_LANGUAGE",
            "지원하지 않는 언어입니다.",
        ));
    }
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    connection.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES ('language', ?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![language, now],
    )?;
    Ok(language)
}

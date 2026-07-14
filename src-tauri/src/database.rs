use std::{fs, sync::Mutex, time::Duration};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

pub struct Database(pub Mutex<Connection>);

impl Database {
    pub fn initialize(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = app.path().app_data_dir()?;
        fs::create_dir_all(&app_data_dir)?;

        let connection = Connection::open(app_data_dir.join("taskdeck.db"))?;
        connection.busy_timeout(Duration::from_secs(5))?;
        apply_migrations(&connection)?;

        Ok(Self(Mutex::new(connection)))
    }
}

fn apply_migrations(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                color TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS resources (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('application', 'website', 'folder', 'file')),
                name TEXT NOT NULL,
                target TEXT NOT NULL,
                icon TEXT,
                description TEXT,
                launch_order INTEGER NOT NULL DEFAULT 0,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (workspace_id)
                    REFERENCES workspaces(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_resources_workspace_id
                ON resources(workspace_id);

            CREATE INDEX IF NOT EXISTS idx_resources_launch_order
                ON resources(workspace_id, launch_order);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            INSERT OR IGNORE INTO settings (key, value, updated_at)
                VALUES ('launch_interval_ms', '500', CURRENT_TIMESTAMP);

            INSERT OR IGNORE INTO settings (key, value, updated_at)
                VALUES ('close_to_tray', 'true', CURRENT_TIMESTAMP);

            PRAGMA user_version = 5;",
    )?;

    if !column_exists(connection, "workspaces", "is_favorite")? {
        connection.execute(
            "ALTER TABLE workspaces ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    connection.pragma_update(None, "user_version", 5)?;

    let foreign_keys_enabled: bool =
        connection.query_row("PRAGMA foreign_keys", [], |row| row.get(0))?;
    if !foreign_keys_enabled {
        return Err(rusqlite::Error::ExecuteReturnedResults);
    }
    Ok(())
}

fn column_exists(connection: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
    for existing in columns {
        if existing? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::apply_migrations;
    use rusqlite::{params, Connection};

    fn table_exists(connection: &Connection, table: &str) -> bool {
        connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                [table],
                |row| row.get(0),
            )
            .expect("query table existence")
    }

    #[test]
    fn fresh_database_creates_all_tables_and_enables_foreign_keys() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        apply_migrations(&connection).expect("apply migrations");

        assert!(table_exists(&connection, "workspaces"));
        assert!(table_exists(&connection, "resources"));
        assert!(table_exists(&connection, "settings"));
        let foreign_keys_enabled: bool = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .expect("read foreign key setting");
        assert!(foreign_keys_enabled);
    }

    #[test]
    fn existing_workspace_database_is_upgraded_without_data_loss() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        connection
            .execute_batch(
                "CREATE TABLE workspaces (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    icon TEXT,
                    color TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                INSERT INTO workspaces
                    (id, name, created_at, updated_at)
                    VALUES ('legacy-workspace', 'Legacy', '2026-01-01', '2026-01-01');
                PRAGMA user_version = 1;",
            )
            .expect("create legacy schema");

        apply_migrations(&connection).expect("upgrade legacy schema");

        assert!(table_exists(&connection, "resources"));
        assert!(table_exists(&connection, "settings"));
        let workspace_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
            .expect("count preserved workspaces");
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        assert_eq!(workspace_count, 1);
        assert_eq!(version, 5);
        let favorite: bool = connection
            .query_row(
                "SELECT is_favorite FROM workspaces WHERE id = 'legacy-workspace'",
                [],
                |row| row.get(0),
            )
            .expect("read migrated favorite flag");
        assert!(!favorite);
    }

    #[test]
    fn deleting_workspace_cascades_to_resources() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        apply_migrations(&connection).expect("apply migrations");
        connection
            .execute(
                "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
                params!["workspace-1", "Test", "2026-01-01T00:00:00Z"],
            )
            .expect("insert workspace");
        connection
            .execute(
                "INSERT INTO resources
                 (id, workspace_id, type, name, target, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
                params![
                    "resource-1",
                    "workspace-1",
                    "file",
                    "Test file",
                    "C:\\test.txt",
                    "2026-01-01T00:00:00Z"
                ],
            )
            .expect("insert resource");

        connection
            .execute("DELETE FROM workspaces WHERE id = ?1", ["workspace-1"])
            .expect("delete workspace");
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM resources", [], |row| row.get(0))
            .expect("count resources");
        assert_eq!(count, 0);
    }
}

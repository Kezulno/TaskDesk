use std::{
    error::Error,
    fmt, fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::Duration,
};

use chrono::Utc;
use rusqlite::{backup::Backup, Connection, Transaction};
use tauri::{AppHandle, Manager};

const CURRENT_SCHEMA_VERSION: u32 = 5;

pub struct Database(pub Mutex<Connection>);

#[derive(Debug)]
struct DatabaseInitializationError(String);

impl fmt::Display for DatabaseInitializationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl Error for DatabaseInitializationError {}

impl Database {
    pub fn initialize(app: &AppHandle) -> Result<Self, Box<dyn Error>> {
        let app_data_dir = app.path().app_data_dir()?;
        fs::create_dir_all(&app_data_dir)?;
        let database_path = app_data_dir.join("taskdeck.db");
        let database_existed = database_path.is_file();

        let mut connection = Connection::open(&database_path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        connection.pragma_update(None, "foreign_keys", true)?;

        let version = schema_version(&connection)?;
        if version > CURRENT_SCHEMA_VERSION {
            return Err(Box::new(DatabaseInitializationError(format!(
                "데이터베이스 버전 {version}은 이 TaskDeck 버전이 지원하는 {CURRENT_SCHEMA_VERSION}보다 높습니다."
            ))));
        }
        if database_existed && version < CURRENT_SCHEMA_VERSION {
            create_pre_migration_backup(&connection, &app_data_dir, version)?;
        }
        apply_migrations(&mut connection)?;

        Ok(Self(Mutex::new(connection)))
    }
}

fn schema_version(connection: &Connection) -> rusqlite::Result<u32> {
    connection.query_row("PRAGMA user_version", [], |row| row.get(0))
}

fn create_pre_migration_backup(
    source: &Connection,
    app_data_dir: &Path,
    from_version: u32,
) -> Result<PathBuf, Box<dyn Error>> {
    let backup_dir = app_data_dir.join("backups");
    fs::create_dir_all(&backup_dir)?;
    let timestamp = Utc::now().format("%Y%m%dT%H%M%S%.3fZ");
    let backup_path = backup_dir.join(format!(
        "taskdeck-before-v{CURRENT_SCHEMA_VERSION}-from-v{from_version}-{timestamp}.db"
    ));
    let backup_result = (|| -> rusqlite::Result<()> {
        let mut destination = Connection::open(&backup_path)?;
        let backup = Backup::new(source, &mut destination)?;
        backup.run_to_completion(16, Duration::from_millis(10), None)
    })();
    if let Err(error) = backup_result {
        let _ = fs::remove_file(&backup_path);
        return Err(Box::new(error));
    }
    Ok(backup_path)
}

fn apply_migrations(connection: &mut Connection) -> Result<(), Box<dyn Error>> {
    connection.pragma_update(None, "foreign_keys", true)?;
    let starting_version = schema_version(connection)?;
    if starting_version > CURRENT_SCHEMA_VERSION {
        return Err(Box::new(DatabaseInitializationError(format!(
            "지원하지 않는 데이터베이스 버전입니다: {starting_version}"
        ))));
    }

    let transaction = connection.transaction()?;
    for version in (starting_version + 1)..=CURRENT_SCHEMA_VERSION {
        apply_migration(&transaction, version)?;
        transaction.pragma_update(None, "user_version", version)?;
    }
    transaction.commit()?;

    let foreign_keys_enabled: bool =
        connection.query_row("PRAGMA foreign_keys", [], |row| row.get(0))?;
    if !foreign_keys_enabled {
        return Err(Box::new(DatabaseInitializationError(
            "SQLite foreign key enforcement could not be enabled.".to_owned(),
        )));
    }
    verify_schema(connection)?;
    Ok(())
}

fn apply_migration(transaction: &Transaction<'_>, version: u32) -> rusqlite::Result<()> {
    match version {
        1 => transaction.execute_batch(
            "CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                color TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
        ),
        2 => transaction.execute_batch(
            "CREATE TABLE IF NOT EXISTS resources (
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
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_resources_workspace_id
                ON resources(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_resources_launch_order
                ON resources(workspace_id, launch_order);",
        ),
        3 => transaction.execute_batch(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT OR IGNORE INTO settings (key, value, updated_at)
                VALUES ('launch_interval_ms', '500', CURRENT_TIMESTAMP);",
        ),
        4 => transaction
            .execute(
                "INSERT OR IGNORE INTO settings (key, value, updated_at)
             VALUES ('close_to_tray', 'true', CURRENT_TIMESTAMP)",
                [],
            )
            .map(|_| ()),
        5 => {
            if !column_exists(transaction, "workspaces", "is_favorite")? {
                transaction.execute(
                    "ALTER TABLE workspaces ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0",
                    [],
                )?;
            }
            Ok(())
        }
        _ => Err(rusqlite::Error::InvalidQuery),
    }
}

fn verify_schema(connection: &Connection) -> Result<(), Box<dyn Error>> {
    for table in ["workspaces", "resources", "settings"] {
        if !table_exists(connection, table)? {
            return Err(Box::new(DatabaseInitializationError(format!(
                "필수 데이터베이스 테이블이 없습니다: {table}"
            ))));
        }
    }
    if !column_exists(connection, "workspaces", "is_favorite")? {
        return Err(Box::new(DatabaseInitializationError(
            "workspaces.is_favorite 열이 없습니다.".to_owned(),
        )));
    }
    Ok(())
}

fn table_exists(connection: &Connection, table: &str) -> rusqlite::Result<bool> {
    connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
        [table],
        |row| row.get(0),
    )
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
    use std::{fs, path::PathBuf};

    use rusqlite::{params, Connection};
    use uuid::Uuid;

    use super::{
        apply_migrations, create_pre_migration_backup, schema_version, table_exists,
        CURRENT_SCHEMA_VERSION,
    };

    #[test]
    fn fresh_database_creates_all_tables_and_enables_foreign_keys() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");
        apply_migrations(&mut connection).expect("apply migrations");

        assert!(table_exists(&connection, "workspaces").unwrap());
        assert!(table_exists(&connection, "resources").unwrap());
        assert!(table_exists(&connection, "settings").unwrap());
        assert_eq!(schema_version(&connection).unwrap(), CURRENT_SCHEMA_VERSION);
        let foreign_keys_enabled: bool = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .expect("read foreign key setting");
        assert!(foreign_keys_enabled);
    }

    #[test]
    fn existing_workspace_database_is_upgraded_without_data_loss() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");
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

        apply_migrations(&mut connection).expect("upgrade legacy schema");

        assert!(table_exists(&connection, "resources").unwrap());
        assert!(table_exists(&connection, "settings").unwrap());
        let workspace_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
            .expect("count preserved workspaces");
        assert_eq!(workspace_count, 1);
        assert_eq!(schema_version(&connection).unwrap(), CURRENT_SCHEMA_VERSION);
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
        let mut connection = Connection::open_in_memory().expect("open in-memory database");
        apply_migrations(&mut connection).expect("apply migrations");
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

    #[test]
    fn creates_a_consistent_backup_before_migration() {
        let directory = temporary_test_directory();
        fs::create_dir_all(&directory).expect("create test directory");
        let source_path = directory.join("taskdeck.db");
        let source = Connection::open(&source_path).expect("open source database");
        source
            .execute_batch(
                "CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                 INSERT INTO workspaces (id, name) VALUES ('legacy', 'Preserved');
                 PRAGMA user_version = 1;",
            )
            .expect("create source database");

        let backup_path =
            create_pre_migration_backup(&source, &directory, 1).expect("create backup");
        let backup = Connection::open(backup_path).expect("open backup");
        let name: String = backup
            .query_row(
                "SELECT name FROM workspaces WHERE id = 'legacy'",
                [],
                |row| row.get(0),
            )
            .expect("read backup data");
        assert_eq!(name, "Preserved");
        assert_eq!(schema_version(&backup).unwrap(), 1);

        drop(backup);
        drop(source);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn rejects_a_database_created_by_a_newer_app_version() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");
        connection
            .pragma_update(None, "user_version", CURRENT_SCHEMA_VERSION + 1)
            .expect("set future schema version");

        assert!(apply_migrations(&mut connection).is_err());
    }

    fn temporary_test_directory() -> PathBuf {
        std::env::temp_dir().join(format!("taskdeck-database-test-{}", Uuid::new_v4()))
    }
}

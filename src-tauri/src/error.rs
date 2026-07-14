use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn database(error: rusqlite::Error) -> Self {
        Self::new("DATABASE_ERROR", error.to_string())
    }

    pub fn not_found(id: &str) -> Self {
        Self::new(
            "WORKSPACE_NOT_FOUND",
            format!("워크스페이스를 찾을 수 없습니다: {id}"),
        )
    }

    pub fn invalid_name() -> Self {
        Self::new("INVALID_NAME", "워크스페이스 이름을 입력해 주세요.")
    }

    pub fn lock() -> Self {
        Self::new(
            "DATABASE_LOCK_ERROR",
            "데이터베이스 잠금을 가져오지 못했습니다.",
        )
    }

    pub fn resource_not_found(id: &str) -> Self {
        Self::new(
            "RESOURCE_NOT_FOUND",
            format!("리소스를 찾을 수 없습니다: {id}"),
        )
    }

    pub fn invalid_resource(field: &str, message: &str) -> Self {
        Self::new(
            format!("INVALID_RESOURCE_{}", field.to_uppercase()),
            message,
        )
    }

    pub fn invalid_order() -> Self {
        Self::new(
            "INVALID_RESOURCE_ORDER",
            "리소스 순서 목록이 현재 작업 공간과 일치하지 않습니다.",
        )
    }
}

impl From<rusqlite::Error> for CommandError {
    fn from(error: rusqlite::Error) -> Self {
        Self::database(error)
    }
}

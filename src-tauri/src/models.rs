use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Workspace {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            icon: row.get("icon")?,
            color: row.get("color")?,
            is_favorite: row.get("is_favorite")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInput {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

impl WorkspaceInput {
    pub fn normalized(self) -> Self {
        Self {
            name: self.name.trim().to_owned(),
            description: normalize_optional(self.description),
            icon: normalize_optional(self.icon),
            color: normalize_optional(self.color),
        }
    }
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_owned())
    })
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ResourceType {
    Application,
    Website,
    Folder,
    File,
}

impl ResourceType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Application => "application",
            Self::Website => "website",
            Self::Folder => "folder",
            Self::File => "file",
        }
    }

    fn from_database(value: &str) -> rusqlite::Result<Self> {
        match value {
            "application" => Ok(Self::Application),
            "website" => Ok(Self::Website),
            "folder" => Ok(Self::Folder),
            "file" => Ok(Self::File),
            _ => Err(rusqlite::Error::InvalidColumnType(
                2,
                "type".to_owned(),
                rusqlite::types::Type::Text,
            )),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    pub id: String,
    pub workspace_id: String,
    #[serde(rename = "type")]
    pub resource_type: ResourceType,
    pub name: String,
    pub target: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub launch_order: i64,
    pub is_enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Resource {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let resource_type: String = row.get("type")?;
        Ok(Self {
            id: row.get("id")?,
            workspace_id: row.get("workspace_id")?,
            resource_type: ResourceType::from_database(&resource_type)?,
            name: row.get("name")?,
            target: row.get("target")?,
            icon: row.get("icon")?,
            description: row.get("description")?,
            launch_order: row.get("launch_order")?,
            is_enabled: row.get("is_enabled")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceInput {
    #[serde(rename = "type")]
    pub resource_type: ResourceType,
    pub name: String,
    pub target: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub is_enabled: bool,
}

impl ResourceInput {
    pub fn normalized(self) -> Self {
        Self {
            resource_type: self.resource_type,
            name: self.name.trim().to_owned(),
            target: normalize_user_target(self.target),
            icon: normalize_optional(self.icon),
            description: normalize_optional(self.description),
            is_enabled: self.is_enabled,
        }
    }
}

pub(crate) fn normalize_user_target(value: String) -> String {
    let value = value.trim();
    let quoted = value.len() >= 2
        && ((value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\'')));
    if quoted {
        value[1..value.len() - 1].trim().to_owned()
    } else {
        value.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_user_target;

    #[test]
    fn user_target_removes_matching_outer_quotes() {
        assert_eq!(
            normalize_user_target("\"C:\\Program Files (x86)\\HashCalc\\HashCalc.exe\"".to_owned()),
            "C:\\Program Files (x86)\\HashCalc\\HashCalc.exe"
        );
        assert_eq!(
            normalize_user_target("'C:\\Apps\\Tool.exe'".to_owned()),
            "C:\\Apps\\Tool.exe"
        );
    }
}

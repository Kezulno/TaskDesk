use std::{
    fs::{self, File},
    io::Read,
    path::Path,
};

use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;
use url::Url;
use uuid::Uuid;

use crate::{
    database::Database,
    error::CommandError,
    models::{Resource, ResourceType, Workspace},
    resource_commands::RESOURCE_COLUMNS,
};

const SCHEMA_VERSION: u32 = 1;
const MAX_TEMPLATE_BYTES: u64 = 1024 * 1024;
const MAX_TEMPLATE_RESOURCES: usize = 200;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExportTemplateInput {
    pub name: String,
    pub description: Option<String>,
    pub author: String,
    pub category: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkspaceTemplate {
    pub schema_version: u32,
    pub name: String,
    pub description: Option<String>,
    pub author: String,
    pub category: String,
    pub exported_at: String,
    pub workspace: TemplateWorkspace,
    pub resources: Vec<TemplateResource>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemplateWorkspace {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemplateResource {
    #[serde(rename = "type")]
    pub resource_type: ResourceType,
    pub name: String,
    pub target: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub launch_order: i64,
    pub is_enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateResourcePreview {
    #[serde(flatten)]
    pub resource: TemplateResource,
    pub path_exists: bool,
    pub needs_path_review: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceTemplatePreview {
    pub template: WorkspaceTemplate,
    pub resources: Vec<TemplateResourcePreview>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateExportResult {
    pub path: String,
    pub resource_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateImportResult {
    pub workspace: Workspace,
    pub resource_count: usize,
}

#[tauri::command]
pub fn export_workspace_template(
    workspace_id: String,
    output_path: String,
    input: ExportTemplateInput,
    database: State<'_, Database>,
) -> Result<TemplateExportResult, CommandError> {
    let input = validate_export_input(input)?;
    let connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let workspace = connection
        .query_row(
            "SELECT id, name, description, icon, color, created_at, updated_at
             FROM workspaces WHERE id = ?1",
            params![workspace_id],
            Workspace::from_row,
        )
        .optional()?
        .ok_or_else(|| CommandError::not_found(&workspace_id))?;
    let mut statement = connection.prepare(&format!(
        "SELECT {RESOURCE_COLUMNS} FROM resources
         WHERE workspace_id = ?1 ORDER BY launch_order ASC, created_at ASC"
    ))?;
    let resources = statement
        .query_map(params![workspace_id], Resource::from_row)?
        .map(|resource| resource.map(TemplateResource::from))
        .collect::<Result<Vec<_>, _>>()?;
    if resources.len() > MAX_TEMPLATE_RESOURCES {
        return Err(template_error(format!(
            "resources: 최대 {MAX_TEMPLATE_RESOURCES}개까지 내보낼 수 있습니다."
        )));
    }
    let template = WorkspaceTemplate {
        schema_version: SCHEMA_VERSION,
        name: input.name,
        description: input.description,
        author: input.author,
        category: input.category,
        exported_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
        workspace: TemplateWorkspace {
            name: workspace.name,
            description: workspace.description,
            icon: workspace.icon,
            color: workspace.color,
        },
        resources,
    };
    let json = serde_json::to_vec_pretty(&template)
        .map_err(|error| template_error(format!("JSON 생성 실패: {error}")))?;
    if json.len() as u64 > MAX_TEMPLATE_BYTES {
        return Err(template_error("생성된 템플릿이 1MB 제한을 초과합니다."));
    }
    fs::write(&output_path, json)
        .map_err(|error| template_error(format!("파일 저장 실패: {error}")))?;
    Ok(TemplateExportResult {
        path: output_path,
        resource_count: template.resources.len(),
    })
}

#[tauri::command]
pub fn validate_workspace_template(
    input_path: String,
) -> Result<WorkspaceTemplatePreview, CommandError> {
    let template = read_and_validate_template(Path::new(&input_path))?;
    Ok(preview(template))
}

#[tauri::command]
pub fn import_workspace_template(
    input_path: String,
    database: State<'_, Database>,
) -> Result<TemplateImportResult, CommandError> {
    let template = read_and_validate_template(Path::new(&input_path))?;
    let mut connection = database.0.lock().map_err(|_| CommandError::lock())?;
    let transaction = connection.transaction()?;
    let workspace_name = unique_workspace_name(&transaction, &template.workspace.name)?;
    let workspace_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    transaction.execute(
        "INSERT INTO workspaces
         (id, name, description, icon, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            workspace_id,
            workspace_name,
            template.workspace.description,
            template.workspace.icon,
            template.workspace.color,
            now,
        ],
    )?;
    for resource in &template.resources {
        transaction.execute(
            "INSERT INTO resources
             (id, workspace_id, type, name, target, icon, description, launch_order,
              is_enabled, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![
                Uuid::new_v4().to_string(),
                workspace_id,
                resource.resource_type.as_str(),
                resource.name,
                resource.target,
                resource.icon,
                resource.description,
                resource.launch_order,
                resource.is_enabled,
                now,
            ],
        )?;
    }
    transaction.commit()?;
    let workspace = connection
        .query_row(
            "SELECT id, name, description, icon, color, created_at, updated_at
             FROM workspaces WHERE id = ?1",
            params![workspace_id],
            Workspace::from_row,
        )
        .optional()?
        .ok_or_else(|| CommandError::not_found(&workspace_id))?;
    Ok(TemplateImportResult {
        workspace,
        resource_count: template.resources.len(),
    })
}

impl From<Resource> for TemplateResource {
    fn from(resource: Resource) -> Self {
        Self {
            resource_type: resource.resource_type,
            name: resource.name,
            target: resource.target,
            icon: resource.icon,
            description: resource.description,
            launch_order: resource.launch_order,
            is_enabled: resource.is_enabled,
        }
    }
}

fn read_and_validate_template(path: &Path) -> Result<WorkspaceTemplate, CommandError> {
    let file = File::open(path)
        .map_err(|error| template_error(format!("파일을 열 수 없습니다: {error}")))?;
    let mut bytes = Vec::new();
    file.take(MAX_TEMPLATE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| template_error(format!("파일을 읽을 수 없습니다: {error}")))?;
    if bytes.len() as u64 > MAX_TEMPLATE_BYTES {
        return Err(template_error("템플릿 파일은 최대 1MB까지 허용됩니다."));
    }
    let mut deserializer = serde_json::Deserializer::from_slice(&bytes);
    let template: WorkspaceTemplate = serde_path_to_error::deserialize(&mut deserializer)
        .map_err(|error| template_error(format!("{}: {}", error.path(), error.inner())))?;
    deserializer
        .end()
        .map_err(|error| template_error(format!("JSON: {error}")))?;
    validate_template(template)
}

fn validate_template(mut template: WorkspaceTemplate) -> Result<WorkspaceTemplate, CommandError> {
    if template.schema_version != SCHEMA_VERSION {
        return Err(template_error(format!(
            "schemaVersion: 지원하지 않는 버전입니다. 현재 버전은 {SCHEMA_VERSION}입니다."
        )));
    }
    DateTime::parse_from_rfc3339(&template.exported_at)
        .map_err(|_| template_error("exportedAt: 유효한 ISO 8601 날짜/시간이어야 합니다."))?;
    template.name = required("name", template.name, 120)?;
    template.author = required("author", template.author, 120)?;
    template.category = required("category", template.category, 80)?;
    template.workspace.name = required("workspace.name", template.workspace.name, 120)?;
    template.workspace.description = optional(
        "workspace.description",
        template.workspace.description,
        2_000,
    )?;
    template.workspace.icon = optional("workspace.icon", template.workspace.icon, 200)?;
    template.workspace.color = optional("workspace.color", template.workspace.color, 100)?;
    template.description = optional("description", template.description, 2_000)?;
    if template.resources.len() > MAX_TEMPLATE_RESOURCES {
        return Err(template_error(format!(
            "resources: 최대 {MAX_TEMPLATE_RESOURCES}개까지 허용됩니다."
        )));
    }
    for (index, resource) in template.resources.iter_mut().enumerate() {
        resource.name = required(
            &format!("resources[{index}].name"),
            resource.name.clone(),
            200,
        )?;
        resource.target = required(
            &format!("resources[{index}].target"),
            resource.target.clone(),
            4_096,
        )?;
        resource.icon = optional(
            &format!("resources[{index}].icon"),
            resource.icon.take(),
            500,
        )?;
        resource.description = optional(
            &format!("resources[{index}].description"),
            resource.description.take(),
            2_000,
        )?;
        if resource.launch_order < 0 {
            return Err(template_error(format!(
                "resources[{index}].launchOrder: 0 이상의 정수여야 합니다."
            )));
        }
        if matches!(resource.resource_type, ResourceType::Website)
            && !valid_website_url(&resource.target)
        {
            return Err(template_error(format!(
                "resources[{index}].target: http:// 또는 https:// URL이어야 합니다."
            )));
        }
    }
    Ok(template)
}

fn preview(template: WorkspaceTemplate) -> WorkspaceTemplatePreview {
    let resources = template
        .resources
        .iter()
        .cloned()
        .map(|resource| {
            let path_exists = match resource.resource_type {
                ResourceType::Application | ResourceType::File => {
                    Path::new(&resource.target).is_file()
                }
                ResourceType::Folder => Path::new(&resource.target).is_dir(),
                ResourceType::Website => true,
            };
            TemplateResourcePreview {
                needs_path_review: !path_exists,
                path_exists,
                resource,
            }
        })
        .collect();
    WorkspaceTemplatePreview {
        template,
        resources,
    }
}

fn unique_workspace_name(
    connection: &rusqlite::Connection,
    requested: &str,
) -> Result<String, CommandError> {
    let mut candidate = requested.to_owned();
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
        candidate = format!("{requested} ({suffix})");
        suffix += 1;
    }
}

fn validate_export_input(input: ExportTemplateInput) -> Result<ExportTemplateInput, CommandError> {
    Ok(ExportTemplateInput {
        name: required("name", input.name, 120)?,
        description: optional("description", input.description, 2_000)?,
        author: required("author", input.author, 120)?,
        category: required("category", input.category, 80)?,
    })
}

fn required(field: &str, value: String, max: usize) -> Result<String, CommandError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(template_error(format!("{field}: 필수 항목입니다.")));
    }
    if value.chars().count() > max {
        return Err(template_error(format!(
            "{field}: 최대 {max}자까지 허용됩니다."
        )));
    }
    Ok(value)
}

fn optional(
    field: &str,
    value: Option<String>,
    max: usize,
) -> Result<Option<String>, CommandError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim().to_owned();
    if value.chars().count() > max {
        return Err(template_error(format!(
            "{field}: 최대 {max}자까지 허용됩니다."
        )));
    }
    Ok((!value.is_empty()).then_some(value))
}

fn valid_website_url(target: &str) -> bool {
    Url::parse(target)
        .is_ok_and(|url| matches!(url.scheme(), "http" | "https") && url.host_str().is_some())
}

fn template_error(message: impl Into<String>) -> CommandError {
    CommandError::new("TEMPLATE_VALIDATION_ERROR", message)
}

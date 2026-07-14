import { invoke } from "@tauri-apps/api/core";

import type { ExportTemplateFormValues } from "@/features/templates/templateSchema";
import type { Workspace } from "@/types/workspace";

export interface TemplateExportResult {
  path: string;
  resourceCount: number;
}

export interface TemplateImportResult {
  workspace: Workspace;
  resourceCount: number;
}

export const templateApi = {
  export: (workspaceId: string, outputPath: string, input: ExportTemplateFormValues) =>
    invoke<TemplateExportResult>("export_workspace_template", {
      workspaceId,
      outputPath,
      input: {
        ...input,
        description: input.description.trim() || null,
      },
    }),
  validate: (inputPath: string) => invoke<unknown>("validate_workspace_template", { inputPath }),
  import: (inputPath: string) =>
    invoke<TemplateImportResult>("import_workspace_template", { inputPath }),
};

import { invoke } from "@tauri-apps/api/core";

import type { Resource, ResourceInput } from "@/types/resource";

export const resourceApi = {
  getByWorkspace: (workspaceId: string) =>
    invoke<Resource[]>("get_resources_by_workspace", { workspaceId }),
  create: (workspaceId: string, input: ResourceInput) =>
    invoke<Resource>("create_resource", { workspaceId, input }),
  update: (id: string, input: ResourceInput) => invoke<Resource>("update_resource", { id, input }),
  delete: (id: string) => invoke<void>("delete_resource", { id }),
  reorder: (workspaceId: string, orderedIds: string[]) =>
    invoke<Resource[]>("reorder_resources", { workspaceId, orderedIds }),
  toggleEnabled: (id: string, isEnabled: boolean) =>
    invoke<Resource>("toggle_resource_enabled", { id, isEnabled }),
};

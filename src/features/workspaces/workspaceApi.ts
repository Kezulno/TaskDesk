import { invoke } from "@tauri-apps/api/core";

import type { Workspace, WorkspaceInput } from "@/types/workspace";

export const workspaceApi = {
  getAll: () => invoke<Workspace[]>("get_workspaces"),
  get: (id: string) => invoke<Workspace>("get_workspace", { id }),
  create: (input: WorkspaceInput) => invoke<Workspace>("create_workspace", { input }),
  update: (id: string, input: WorkspaceInput) =>
    invoke<Workspace>("update_workspace", { id, input }),
  delete: (id: string) => invoke<void>("delete_workspace", { id }),
  setFavorite: (id: string, isFavorite: boolean) =>
    invoke<Workspace>("set_workspace_favorite", { id, isFavorite }),
  duplicate: (id: string) => invoke<Workspace>("duplicate_workspace", { id }),
};

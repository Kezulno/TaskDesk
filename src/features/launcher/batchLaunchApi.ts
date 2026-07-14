import { invoke } from "@tauri-apps/api/core";

import type { BatchLaunchResult } from "@/types/batchLaunch";

export const batchLaunchApi = {
  launchWorkspace: (workspaceId: string) =>
    invoke<BatchLaunchResult>("launch_workspace_resources", { workspaceId }),
};

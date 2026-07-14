import { invoke } from "@tauri-apps/api/core";

import type { LaunchResult, ResourceValidationResult } from "@/types/resource";

export const launchApi = {
  validate: (resourceId: string) =>
    invoke<ResourceValidationResult>("validate_resource_target", { resourceId }),
  launch: (resourceId: string) => invoke<LaunchResult>("launch_resource", { resourceId }),
};

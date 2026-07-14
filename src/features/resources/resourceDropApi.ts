import { invoke } from "@tauri-apps/api/core";

import type { ResourceType } from "@/types/resource";

export interface DroppedResourceCandidate {
  name: string;
  path: string;
  resourceType: Exclude<ResourceType, "website">;
}

export const resourceDropApi = {
  inspect: (paths: string[]) =>
    invoke<DroppedResourceCandidate[]>("inspect_dropped_resource_paths", { paths }),
};

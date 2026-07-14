import { invoke } from "@tauri-apps/api/core";

import type { DetectedApplication } from "@/types/detectedApplication";

export const applicationScanApi = {
  scan: () => invoke<DetectedApplication[]>("scan_installed_applications"),
  clearCache: () => invoke<void>("clear_application_scan_cache"),
  inspect: (executablePath: string) =>
    invoke<DetectedApplication>("inspect_application_target", { executablePath }),
  icon: (executablePath: string) =>
    invoke<string | null>("get_application_icon", { executablePath }),
  detectDefaultForFile: (filePath: string) =>
    invoke<DetectedApplication>("detect_default_application_for_file", { filePath }),
};

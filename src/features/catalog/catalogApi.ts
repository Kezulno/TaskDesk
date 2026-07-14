import { invoke } from "@tauri-apps/api/core";

export const catalogApi = {
  openOfficialWebsite: (url: string) => invoke<void>("open_external_website", { url }),
};

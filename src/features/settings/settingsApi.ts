import { invoke } from "@tauri-apps/api/core";

import type { Language } from "@/features/i18n/i18n";

export const settingsApi = {
  getLaunchInterval: () => invoke<number>("get_launch_interval"),
  setLaunchInterval: (intervalMs: number) => invoke<number>("set_launch_interval", { intervalMs }),
  getCloseToTray: () => invoke<boolean>("get_close_to_tray"),
  setCloseToTray: (enabled: boolean) => invoke<boolean>("set_close_to_tray", { enabled }),
  getLanguage: () => invoke<Language>("get_language"),
  setLanguage: (language: Language) => invoke<Language>("set_language", { language }),
};

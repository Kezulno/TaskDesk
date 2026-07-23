import { create } from "zustand";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

import { settingsApi } from "@/features/settings/settingsApi";
import { errorMessage } from "@/lib/errors";
import type { Language } from "@/features/i18n/i18n";

interface SettingsState {
  launchIntervalMs: number;
  closeToTray: boolean;
  autoStart: boolean;
  language: Language;
  isLoading: boolean;
  error: string | null;
  setLaunchIntervalValue: (value: number) => void;
  setCloseToTrayValue: (value: boolean) => void;
  setAutoStartValue: (value: boolean) => void;
  setLanguageValue: (value: Language) => void;
  fetchSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  launchIntervalMs: 500,
  closeToTray: true,
  autoStart: false,
  language: "ko",
  isLoading: false,
  error: null,

  setLaunchIntervalValue: (value) => set({ launchIntervalMs: value, error: null }),
  setCloseToTrayValue: (value) => set({ closeToTray: value, error: null }),
  setAutoStartValue: (value) => set({ autoStart: value, error: null }),
  setLanguageValue: (value) => set({ language: value, error: null }),

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const [launchIntervalMs, closeToTray, autoStart, language] = await Promise.all([
        settingsApi.getLaunchInterval(),
        settingsApi.getCloseToTray(),
        isEnabled(),
        settingsApi.getLanguage(),
      ]);
      set({ launchIntervalMs, closeToTray, autoStart, language, isLoading: false });
    } catch (error: unknown) {
      set({ error: errorMessage(error, "설정을 불러오지 못했습니다."), isLoading: false });
    }
  },

  saveSettings: async () => {
    const value = Math.min(5_000, Math.max(0, Math.round(get().launchIntervalMs)));
    const { closeToTray, autoStart, language } = get();
    set({ isLoading: true, error: null, launchIntervalMs: value });
    try {
      const [launchIntervalMs, savedCloseToTray, , savedLanguage] = await Promise.all([
        settingsApi.setLaunchInterval(value),
        settingsApi.setCloseToTray(closeToTray),
        autoStart ? enable() : disable(),
        settingsApi.setLanguage(language),
      ]);
      set({
        launchIntervalMs,
        closeToTray: savedCloseToTray,
        autoStart: await isEnabled(),
        language: savedLanguage,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = errorMessage(error, "설정을 저장하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },
}));

import { create } from "zustand";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

import { settingsApi } from "@/features/settings/settingsApi";
import { normalizeLaunchInterval } from "@/features/settings/launchInterval";
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
  saveLaunchInterval: (value: number) => Promise<number>;
  saveSettings: () => Promise<void>;
}

async function persistLaunchInterval(value: number): Promise<number> {
  const savedValue = await settingsApi.setLaunchInterval(normalizeLaunchInterval(value));
  const confirmedValue = await settingsApi.getLaunchInterval();
  if (savedValue !== confirmedValue) {
    throw new Error("저장된 실행 간격을 확인하지 못했습니다.");
  }
  return confirmedValue;
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

  saveLaunchInterval: async (requestedValue) => {
    const value = normalizeLaunchInterval(requestedValue);
    set({ isLoading: true, error: null });
    try {
      const launchIntervalMs = await persistLaunchInterval(value);
      set({ launchIntervalMs, isLoading: false });
      return launchIntervalMs;
    } catch (error: unknown) {
      const message = errorMessage(error, "실행 간격을 저장하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  saveSettings: async () => {
    const value = normalizeLaunchInterval(get().launchIntervalMs);
    const { closeToTray, autoStart, language } = get();
    set({ isLoading: true, error: null, launchIntervalMs: value });
    try {
      const [launchIntervalMs, savedCloseToTray, , savedLanguage] = await Promise.all([
        persistLaunchInterval(value),
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

import { create } from "zustand";

import { applicationScanApi } from "@/features/resources/applicationScanApi";
import { errorMessage } from "@/lib/errors";
import type { DetectedApplication } from "@/types/detectedApplication";

interface ApplicationScanState {
  applications: DetectedApplication[];
  isScanning: boolean;
  hasScanned: boolean;
  error: string | null;
  scanApplications: (forceRefresh?: boolean) => Promise<void>;
}

export const useApplicationScanStore = create<ApplicationScanState>((set) => ({
  applications: [],
  isScanning: false,
  hasScanned: false,
  error: null,

  scanApplications: async (forceRefresh = false) => {
    set({ isScanning: true, error: null });
    try {
      if (forceRefresh) await applicationScanApi.clearCache();
      const applications = await applicationScanApi.scan();
      set({ applications, isScanning: false, hasScanned: true });
    } catch (error: unknown) {
      set({
        error: errorMessage(error, "설치된 앱을 검색하지 못했습니다."),
        isScanning: false,
        hasScanned: true,
      });
    }
  },
}));

import { create } from "zustand";

import { launchApi } from "@/features/launcher/launchApi";
import { errorMessage } from "@/lib/errors";
import type { LaunchResult, Resource, ResourceValidationResult } from "@/types/resource";

interface LaunchState {
  validations: Record<string, ResourceValidationResult>;
  launchingResourceIds: string[];
  recentLaunchResult: LaunchResult | null;
  isValidating: boolean;
  validateResources: (resources: Resource[]) => Promise<void>;
  launchResource: (resourceId: string) => Promise<LaunchResult>;
}

const launchLockMilliseconds = 1_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export const useLaunchStore = create<LaunchState>((set, get) => ({
  validations: {},
  launchingResourceIds: [],
  recentLaunchResult: null,
  isValidating: false,

  validateResources: async (resources) => {
    set({ isValidating: true });
    const entries = await Promise.all(
      resources.map(async (resource): Promise<[string, ResourceValidationResult]> => {
        try {
          return [resource.id, await launchApi.validate(resource.id)];
        } catch (error: unknown) {
          return [
            resource.id,
            {
              valid: false,
              exists: false,
              message: errorMessage(error, "리소스 경로를 검사하지 못했습니다."),
            },
          ];
        }
      }),
    );
    set({ validations: Object.fromEntries(entries), isValidating: false });
  },

  launchResource: async (resourceId) => {
    if (get().launchingResourceIds.includes(resourceId)) {
      return {
        success: false,
        resourceId,
        message: "이미 실행 요청을 처리하고 있습니다.",
      };
    }

    set((state) => ({
      launchingResourceIds: [...state.launchingResourceIds, resourceId],
    }));
    const startedAt = Date.now();
    try {
      const result = await launchApi.launch(resourceId);
      const remainingLock = launchLockMilliseconds - (Date.now() - startedAt);
      if (remainingLock > 0) await delay(remainingLock);
      set({ recentLaunchResult: result });
      return result;
    } catch (error: unknown) {
      const remainingLock = launchLockMilliseconds - (Date.now() - startedAt);
      if (remainingLock > 0) await delay(remainingLock);
      const result: LaunchResult = {
        success: false,
        resourceId,
        message: errorMessage(error, "리소스를 실행하지 못했습니다."),
      };
      set({ recentLaunchResult: result });
      throw new Error(result.message, { cause: error });
    } finally {
      set((state) => ({
        launchingResourceIds: state.launchingResourceIds.filter((id) => id !== resourceId),
      }));
    }
  },
}));

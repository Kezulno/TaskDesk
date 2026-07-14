import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";

import { batchLaunchApi } from "@/features/launcher/batchLaunchApi";
import { errorMessage } from "@/lib/errors";
import type { BatchLaunchProgress, BatchLaunchResult } from "@/types/batchLaunch";

interface BatchLaunchState {
  isRunning: boolean;
  completed: number;
  total: number;
  currentResourceName: string | null;
  result: BatchLaunchResult | null;
  error: string | null;
  startBatch: (workspaceId: string) => Promise<BatchLaunchResult>;
  reset: () => void;
}

export const useBatchLaunchStore = create<BatchLaunchState>((set, get) => ({
  isRunning: false,
  completed: 0,
  total: 0,
  currentResourceName: null,
  result: null,
  error: null,

  startBatch: async (workspaceId) => {
    if (get().isRunning) {
      throw new Error("작업 환경을 이미 준비하고 있습니다.");
    }

    set({
      isRunning: true,
      completed: 0,
      total: 0,
      currentResourceName: null,
      result: null,
      error: null,
    });
    let unlisten: (() => void) | null = null;
    try {
      unlisten = await listen<BatchLaunchProgress>("batch-launch-progress", (event) => {
        if (event.payload.workspaceId !== workspaceId) return;
        set({
          completed: event.payload.completed,
          total: event.payload.total,
          currentResourceName: event.payload.currentResourceName,
        });
      });
      const result = await batchLaunchApi.launchWorkspace(workspaceId);
      set({
        result,
        completed: result.total,
        total: result.total,
        currentResourceName: null,
      });
      return result;
    } catch (error: unknown) {
      const message = errorMessage(error, "작업 환경을 열지 못했습니다.");
      set({ error: message });
      throw new Error(message, { cause: error });
    } finally {
      unlisten?.();
      set({ isRunning: false });
    }
  },

  reset: () =>
    set({
      completed: 0,
      total: 0,
      currentResourceName: null,
      result: null,
      error: null,
    }),
}));

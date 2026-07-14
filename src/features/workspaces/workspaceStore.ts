import { create } from "zustand";

import { workspaceApi } from "@/features/workspaces/workspaceApi";
import { errorMessage } from "@/lib/errors";
import type { Workspace, WorkspaceInput } from "@/types/workspace";

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (input: WorkspaceInput) => Promise<Workspace>;
  updateWorkspace: (id: string, input: WorkspaceInput) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  setWorkspaceFavorite: (id: string, isFavorite: boolean) => Promise<Workspace>;
  duplicateWorkspace: (id: string) => Promise<Workspace>;
}

function sortWorkspaces(workspaces: Workspace[]) {
  return [...workspaces].sort(
    (left, right) =>
      Number(right.isFavorite) - Number(left.isFavorite) ||
      right.updatedAt.localeCompare(left.updatedAt),
  );
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  selectedWorkspace: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceApi.getAll();
      set({ workspaces: sortWorkspaces(workspaces), isLoading: false });
    } catch (error: unknown) {
      set({ error: errorMessage(error, "작업 공간을 불러오지 못했습니다."), isLoading: false });
    }
  },

  fetchWorkspace: async (id) => {
    set({ isLoading: true, error: null, selectedWorkspace: null });
    try {
      const selectedWorkspace = await workspaceApi.get(id);
      set({ selectedWorkspace, isLoading: false });
    } catch (error: unknown) {
      set({ error: errorMessage(error, "작업 공간을 불러오지 못했습니다."), isLoading: false });
    }
  },

  createWorkspace: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await workspaceApi.create(input);
      set((state) => ({
        workspaces: [workspace, ...state.workspaces],
        isLoading: false,
      }));
      return workspace;
    } catch (error: unknown) {
      const message = errorMessage(error, "작업 공간을 만들지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  updateWorkspace: async (id, input) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await workspaceApi.update(id, input);
      set((state) => ({
        workspaces: state.workspaces.map((item) => (item.id === id ? workspace : item)),
        selectedWorkspace: workspace,
        isLoading: false,
      }));
      return workspace;
    } catch (error: unknown) {
      const message = errorMessage(error, "작업 공간을 수정하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  deleteWorkspace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceApi.delete(id);
      set((state) => ({
        workspaces: state.workspaces.filter((workspace) => workspace.id !== id),
        selectedWorkspace: state.selectedWorkspace?.id === id ? null : state.selectedWorkspace,
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = errorMessage(error, "작업 공간을 삭제하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  setWorkspaceFavorite: async (id, isFavorite) => {
    try {
      const workspace = await workspaceApi.setFavorite(id, isFavorite);
      set((state) => ({
        workspaces: sortWorkspaces(
          state.workspaces.map((item) => (item.id === id ? workspace : item)),
        ),
        selectedWorkspace: state.selectedWorkspace?.id === id ? workspace : state.selectedWorkspace,
      }));
      return workspace;
    } catch (error: unknown) {
      const message = errorMessage(error, "즐겨찾기 상태를 변경하지 못했습니다.");
      set({ error: message });
      throw new Error(message, { cause: error });
    }
  },

  duplicateWorkspace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await workspaceApi.duplicate(id);
      set((state) => ({
        workspaces: sortWorkspaces([workspace, ...state.workspaces]),
        isLoading: false,
      }));
      return workspace;
    } catch (error: unknown) {
      const message = errorMessage(error, "작업 공간을 복제하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },
}));

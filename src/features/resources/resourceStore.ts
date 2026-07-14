import { create } from "zustand";

import { resourceApi } from "@/features/resources/resourceApi";
import { errorMessage } from "@/lib/errors";
import type { Resource, ResourceInput } from "@/types/resource";

interface ResourceState {
  resources: Resource[];
  isLoading: boolean;
  error: string | null;
  fetchResources: (workspaceId: string) => Promise<void>;
  createResource: (workspaceId: string, input: ResourceInput) => Promise<Resource>;
  updateResource: (id: string, input: ResourceInput) => Promise<Resource>;
  deleteResource: (id: string) => Promise<void>;
  moveResource: (workspaceId: string, id: string, direction: "up" | "down") => Promise<void>;
  toggleResourceEnabled: (id: string, isEnabled: boolean) => Promise<void>;
  clearResources: () => void;
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  resources: [],
  isLoading: false,
  error: null,

  fetchResources: async (workspaceId) => {
    set({ isLoading: true, error: null, resources: [] });
    try {
      const resources = await resourceApi.getByWorkspace(workspaceId);
      set({ resources, isLoading: false });
    } catch (error: unknown) {
      set({ error: errorMessage(error, "리소스를 불러오지 못했습니다."), isLoading: false });
    }
  },

  createResource: async (workspaceId, input) => {
    set({ isLoading: true, error: null });
    try {
      const resource = await resourceApi.create(workspaceId, input);
      set((state) => ({ resources: [...state.resources, resource], isLoading: false }));
      return resource;
    } catch (error: unknown) {
      const message = errorMessage(error, "리소스를 추가하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  updateResource: async (id, input) => {
    set({ isLoading: true, error: null });
    try {
      const resource = await resourceApi.update(id, input);
      set((state) => ({
        resources: state.resources.map((item) => (item.id === id ? resource : item)),
        isLoading: false,
      }));
      return resource;
    } catch (error: unknown) {
      const message = errorMessage(error, "리소스를 수정하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  deleteResource: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await resourceApi.delete(id);
      set((state) => ({
        resources: state.resources.filter((resource) => resource.id !== id),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = errorMessage(error, "리소스를 삭제하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  moveResource: async (workspaceId, id, direction) => {
    const current = get().resources;
    const resource = current.find((item) => item.id === id);
    if (!resource) return;
    const sameType = current.filter((item) => item.type === resource.type);
    const typeIndex = sameType.findIndex((item) => item.id === id);
    const neighbor = sameType[direction === "up" ? typeIndex - 1 : typeIndex + 1];
    if (!neighbor) return;

    const reordered = [...current];
    const currentIndex = reordered.findIndex((item) => item.id === resource.id);
    const neighborIndex = reordered.findIndex((item) => item.id === neighbor.id);
    [reordered[currentIndex], reordered[neighborIndex]] = [
      reordered[neighborIndex],
      reordered[currentIndex],
    ];
    set({ isLoading: true, error: null });
    try {
      const resources = await resourceApi.reorder(
        workspaceId,
        reordered.map((item) => item.id),
      );
      set({ resources, isLoading: false });
    } catch (error: unknown) {
      const message = errorMessage(error, "리소스 순서를 변경하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  toggleResourceEnabled: async (id, isEnabled) => {
    set({ isLoading: true, error: null });
    try {
      const resource = await resourceApi.toggleEnabled(id, isEnabled);
      set((state) => ({
        resources: state.resources.map((item) => (item.id === id ? resource : item)),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = errorMessage(error, "리소스 활성화 상태를 변경하지 못했습니다.");
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },

  clearResources: () => set({ resources: [], error: null, isLoading: false }),
}));

import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";

export function AppLayout() {
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      <Sidebar />
      <main className="h-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

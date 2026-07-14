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
    <div className="bg-background text-foreground flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

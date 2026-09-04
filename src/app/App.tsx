import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { useSettingsStore } from "@/features/settings/settingsStore";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then(({ HomePage }) => ({ default: HomePage })),
);
const AppCatalogPage = lazy(() =>
  import("@/pages/AppCatalogPage").then(({ AppCatalogPage }) => ({ default: AppCatalogPage })),
);
const TaskSettingsPage = lazy(() =>
  import("@/pages/TaskSettingsPage").then(({ TaskSettingsPage }) => ({
    default: TaskSettingsPage,
  })),
);
const WorkspaceResourcesPage = lazy(() =>
  import("@/pages/WorkspaceResourcesPage").then(({ WorkspaceResourcesPage }) => ({
    default: WorkspaceResourcesPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <div className="text-muted-foreground flex min-h-[240px] items-center justify-center text-sm">
      Loading…
    </div>
  );
}

export function App() {
  const language = useSettingsStore((state) => state.language);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="workspace/:workspaceId" element={<WorkspaceResourcesPage />} />
            <Route path="settings" element={<TaskSettingsPage />} />
            <Route path="catalog" element={<AppCatalogPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster richColors theme="dark" position="bottom-right" />
    </BrowserRouter>
  );
}

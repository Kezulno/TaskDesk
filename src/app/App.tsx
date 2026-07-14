import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { AppCatalogPage } from "@/pages/AppCatalogPage";
import { TaskSettingsPage } from "@/pages/TaskSettingsPage";
import { WorkspaceResourcesPage } from "@/pages/WorkspaceResourcesPage";
import { useSettingsStore } from "@/features/settings/settingsStore";

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
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="workspace/:workspaceId" element={<WorkspaceResourcesPage />} />
          <Route path="settings" element={<TaskSettingsPage />} />
          <Route path="catalog" element={<AppCatalogPage />} />
        </Route>
      </Routes>
      <Toaster richColors theme="dark" position="bottom-right" />
    </BrowserRouter>
  );
}

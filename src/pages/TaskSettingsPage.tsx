import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/FormField";
import { PageHeader } from "@/components/common/PageHeader";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useI18n, type Language } from "@/features/i18n/i18n";

export function TaskSettingsPage() {
  const { t } = useI18n();
  const launchIntervalMs = useSettingsStore((state) => state.launchIntervalMs);
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const autoStart = useSettingsStore((state) => state.autoStart);
  const language = useSettingsStore((state) => state.language);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const error = useSettingsStore((state) => state.error);
  const setLaunchIntervalValue = useSettingsStore((state) => state.setLaunchIntervalValue);
  const setCloseToTrayValue = useSettingsStore((state) => state.setCloseToTrayValue);
  const setAutoStartValue = useSettingsStore((state) => state.setAutoStartValue);
  const setLanguageValue = useSettingsStore((state) => state.setLanguageValue);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const save = async () => {
    try {
      await saveSettings();
      toast.success(t("settingsSaved"));
    } catch (saveError: unknown) {
      toast.error(saveError instanceof Error ? saveError.message : t("settingsSaveFailed"));
    }
  };

  return (
    <div>
      <PageHeader title={t("settings")} description={t("settingsDescription")} />
      <section className="max-w-2xl space-y-4 p-8">
        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="font-semibold">{t("language")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("languageDescription")}</p>
          <label className="mt-5 block space-y-1.5 text-sm font-medium">
            {t("language")}
            <select
              className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              value={language}
              disabled={isLoading}
              onChange={(event) => setLanguageValue(event.target.value as Language)}
            >
              <option value="ko">{t("korean")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </label>
        </div>

        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="font-semibold">{t("launchInterval")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("launchIntervalDescription")}</p>
          <div className="mt-5 flex items-end gap-3">
            <label className="block flex-1 space-y-1.5 text-sm font-medium">
              {t("intervalMs")}
              <Input
                type="number"
                min={0}
                max={5000}
                step={100}
                value={launchIntervalMs}
                disabled={isLoading}
                onChange={(event) => setLaunchIntervalValue(Number(event.target.value))}
              />
            </label>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{t("intervalRange")}</p>
          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
        </div>

        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="font-semibold">{t("systemTray")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("systemTrayDescription")}</p>
          <label className="mt-5 flex items-center justify-between gap-4 text-sm font-medium">
            {t("minimizeToTray")}
            <input
              type="checkbox"
              className="accent-primary size-5"
              checked={closeToTray}
              disabled={isLoading}
              onChange={(event) => setCloseToTrayValue(event.target.checked)}
            />
          </label>
        </div>

        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="font-semibold">{t("windowsAutostart")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("windowsAutostartDescription")}</p>
          <label className="mt-5 flex items-center justify-between gap-4 text-sm font-medium">
            {t("runAtLogin")}
            <input
              type="checkbox"
              className="accent-primary size-5"
              checked={autoStart}
              disabled={isLoading}
              onChange={(event) => setAutoStartValue(event.target.checked)}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-destructive mr-auto text-sm">{error}</p>}
          <Button onClick={() => void save()} disabled={isLoading}>
            {isLoading ? t("saving") : t("saveSettings")}
          </Button>
        </div>
      </section>
    </div>
  );
}

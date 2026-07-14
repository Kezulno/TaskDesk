import { Check, RotateCw, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/common/Dialog";
import { Input } from "@/components/common/FormField";
import { useApplicationScanStore } from "@/features/resources/applicationScanStore";
import { DetectedApplicationIcon } from "@/features/resources/components/DetectedApplicationIcon";
import { useResourceStore } from "@/features/resources/resourceStore";
import { cn } from "@/lib/utils";
import type { ApplicationSource, DetectedApplication } from "@/types/detectedApplication";
import type { Resource } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

interface InstalledApplicationsDialogProps {
  workspaceId: string;
  resources: Resource[];
  trigger: ReactNode;
}

const sourceLabels: Record<ApplicationSource, string> = {
  user_start_menu: "사용자 시작 메뉴",
  system_start_menu: "시스템 시작 메뉴",
  program_files: "Program Files",
  program_files_x86: "Program Files (x86)",
  user_programs: "사용자 앱",
  registry: "설치 정보",
  executable: "실행 파일",
  file_association: "파일 연결",
};

const sourceLabelsEn: Record<ApplicationSource, string> = {
  user_start_menu: "User Start menu",
  system_start_menu: "System Start menu",
  program_files: "Program Files",
  program_files_x86: "Program Files (x86)",
  user_programs: "User applications",
  registry: "Installation records",
  executable: "Executable",
  file_association: "File association",
};

export function InstalledApplicationsDialog({
  workspaceId,
  resources,
  trigger,
}: InstalledApplicationsDialogProps) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const applications = useApplicationScanStore((state) => state.applications);
  const isScanning = useApplicationScanStore((state) => state.isScanning);
  const hasScanned = useApplicationScanStore((state) => state.hasScanned);
  const error = useApplicationScanStore((state) => state.error);
  const scanApplications = useApplicationScanStore((state) => state.scanApplications);
  const createResource = useResourceStore((state) => state.createResource);

  const existingPaths = new Set(
    resources
      .filter((resource) => resource.type === "application")
      .map((resource) => normalizePath(resource.target)),
  );
  const filteredApplications = applications.filter((application) =>
    application.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const selectedApplications = applications.filter((application) =>
    selectedIds.includes(application.id),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !hasScanned) void scanApplications();
    if (!nextOpen) {
      setQuery("");
      setSelectedIds([]);
    }
  };

  const isAlreadyAdded = (application: DetectedApplication) =>
    existingPaths.has(normalizePath(application.executablePath));

  const toggleSelection = (application: DetectedApplication) => {
    if (!application.valid || isAlreadyAdded(application)) return;
    setSelectedIds((current) =>
      current.includes(application.id)
        ? current.filter((id) => id !== application.id)
        : [...current, application.id],
    );
  };

  const addSelected = async () => {
    setIsAdding(true);
    let added = 0;
    let failed = 0;
    for (const application of selectedApplications) {
      if (!application.valid || isAlreadyAdded(application)) continue;
      try {
        await createResource(workspaceId, {
          type: "application",
          name: application.name,
          target: application.executablePath,
          description: application.shortcutPath
            ? "Windows 시작 메뉴에서 추가됨"
            : application.source === "program_files" || application.source === "program_files_x86"
              ? "Windows 설치 폴더 검색에서 추가됨"
              : "실행 파일에서 추가됨",
          icon: "app-window",
          isEnabled: true,
        });
        added += 1;
      } catch {
        failed += 1;
      }
    }
    setIsAdding(false);
    if (added > 0) toast.success(added + "개의 앱을 작업 공간에 추가했습니다.");
    if (failed > 0) toast.error(failed + "개의 앱을 추가하지 못했습니다.");
    if (failed === 0) handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="h-[calc(100vh-2rem)] max-h-[52rem] max-w-3xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("installedApps")}</DialogTitle>
          <DialogDescription>{t("installedAppsDescription")}</DialogDescription>
          <div
            role="note"
            className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-sm text-amber-200"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>{t("detectionNotice")}</p>
          </div>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder={t("searchAppName")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={isScanning}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => void scanApplications(true)}
            disabled={isScanning || isAdding}
          >
            <RotateCw className={cn("size-4", isScanning && "animate-spin")} />
            {t("rescan")}
          </Button>
        </div>

        <div className="border-border min-h-0 overflow-y-auto overscroll-contain rounded-lg border">
          {isScanning ? (
            <div className="text-muted-foreground flex min-h-64 items-center justify-center gap-2 text-sm">
              <RotateCw className="size-4 animate-spin" />
              {t("scanningApps")}
            </div>
          ) : error ? (
            <div className="text-destructive flex min-h-64 items-center justify-center p-8 text-center text-sm">
              {error}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-muted-foreground flex min-h-64 items-center justify-center p-8 text-center text-sm">
              {hasScanned ? t("noSearchResults") : t("startingSearch")}
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {filteredApplications.map((application) => {
                const alreadyAdded = isAlreadyAdded(application);
                const selectable = application.valid && !alreadyAdded;
                const selected = selectedIds.includes(application.id);
                return (
                  <li key={application.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 p-3 text-left transition-colors",
                        selectable ? "hover:bg-accent/60" : "cursor-not-allowed opacity-55",
                        selected && "bg-accent",
                      )}
                      disabled={!selectable || isAdding}
                      onClick={() => toggleSelection(application)}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {selected && <Check className="size-3.5" />}
                      </span>
                      <DetectedApplicationIcon executablePath={application.executablePath} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {application.name}
                        </span>
                        <span
                          className="text-muted-foreground block truncate text-xs"
                          title={
                            application.executablePath || application.shortcutPath || undefined
                          }
                        >
                          {application.executablePath || t("targetUnavailable")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="text-muted-foreground block text-xs">
                          {language === "en"
                            ? sourceLabelsEn[application.source]
                            : sourceLabels[application.source]}
                        </span>
                        {alreadyAdded ? (
                          <span className="text-xs text-amber-400">{t("alreadyAdded")}</span>
                        ) : application.isInstaller ? (
                          <span className="text-xs text-amber-400">{t("installer")}</span>
                        ) : application.valid ? (
                          <span className="text-xs text-emerald-400">
                            {application.compatibility.architecture ?? t("compatible")}
                          </span>
                        ) : (
                          <span
                            className="text-destructive inline-flex items-center gap-1 text-xs"
                            title={application.compatibility.message ?? undefined}
                          >
                            <ShieldAlert className="size-3" />
                            {t("invalid")}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center justify-between">
          <span className="text-muted-foreground mr-auto text-sm">
            {t("selectedCount", { count: selectedIds.length })}
          </span>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={isAdding}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => void addSelected()}
            disabled={selectedIds.length === 0 || isAdding}
          >
            {isAdding ? t("adding") : t("addSelectedApps")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizePath(path: string): string {
  return path.trim().replaceAll("/", "\\").replace(/\\+$/, "").toLocaleLowerCase();
}

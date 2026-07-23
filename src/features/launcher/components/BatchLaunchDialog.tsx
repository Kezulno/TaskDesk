import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  Rocket,
  XCircle,
} from "lucide-react";
import { useState } from "react";
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
import { useBatchLaunchStore } from "@/features/launcher/batchLaunchStore";
import { useLaunchStore } from "@/features/launcher/launchStore";
import { resourceTypeIcons } from "@/features/resources/resourcePresentation";
import type { Resource } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

interface BatchLaunchDialogProps {
  workspaceId: string;
  resources: Resource[];
}

export function BatchLaunchDialog({ workspaceId, resources }: BatchLaunchDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const validations = useLaunchStore((state) => state.validations);
  const isRunning = useBatchLaunchStore((state) => state.isRunning);
  const completed = useBatchLaunchStore((state) => state.completed);
  const total = useBatchLaunchStore((state) => state.total);
  const currentResourceName = useBatchLaunchStore((state) => state.currentResourceName);
  const result = useBatchLaunchStore((state) => state.result);
  const error = useBatchLaunchStore((state) => state.error);
  const startBatch = useBatchLaunchStore((state) => state.startBatch);
  const reset = useBatchLaunchStore((state) => state.reset);

  const activeResources = resources
    .filter((resource) => resource.isEnabled)
    .sort((left, right) => left.launchOrder - right.launchOrder);
  const allValidated = activeResources.every((resource) => validations[resource.id] !== undefined);
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isRunning && !nextOpen) return;
    setOpen(nextOpen);
    if (nextOpen) reset();
  };

  const handleStart = async () => {
    try {
      const launchResult = await startBatch(workspaceId);
      toast.success(
        "작업 환경 준비 완료 · 열림 " +
          launchResult.succeeded +
          " · 실패 " +
          launchResult.failed +
          " · 제외 " +
          launchResult.skipped,
      );
    } catch (launchError: unknown) {
      toast.error(
        launchError instanceof Error ? launchError.message : "작업 환경을 열지 못했습니다.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="h-10 rounded-lg bg-indigo-500 px-5 text-sm text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-400"
          disabled={isRunning}
        >
          {isRunning ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          {isRunning ? t("preparingEnvironment") : t("openWorkspace")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {isRunning ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="size-5 text-indigo-400" />
                {t("preparingWorkspace")}
              </DialogTitle>
              <DialogDescription>{t("openingInOrder")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-border bg-secondary/40 flex items-center gap-3 rounded-lg border p-4">
                <LoaderCircle className="text-primary size-5 shrink-0 animate-spin" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">{t("currentItem")}</p>
                  <p className="truncate font-medium">{currentResourceName ?? t("preparing")}</p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>
                    {completed} / {total}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="bg-secondary h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width]"
                    style={{ width: String(progress) + "%" }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : result ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("workspaceReady")}</DialogTitle>
              <DialogDescription>{t("launchResults")}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              <Summary label={t("opened")} value={result.succeeded} tone="success" />
              <Summary label={t("failed")} value={result.failed} tone="error" />
              <Summary label={t("skipped")} value={result.skipped} tone="warning" />
            </div>
            <div className="mt-2 space-y-2">
              {result.items.map((item) => (
                <details key={item.resourceId} className="group border-border rounded-md border">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
                    {item.skipped ? (
                      <AlertTriangle className="size-4 text-amber-400" />
                    ) : item.success ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <XCircle className="text-destructive size-4" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.resourceName}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.skipped ? t("skipped") : item.success ? t("opened") : t("failed")}
                    </span>
                    <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="border-border text-muted-foreground border-t px-3 py-2 text-xs">
                    {item.message}
                  </p>
                </details>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>{t("close")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="size-5 text-indigo-400" />
                {t("openWorkspaceQuestion")}
              </DialogTitle>
              <DialogDescription>{t("openWorkspaceDescription")}</DialogDescription>
            </DialogHeader>
            {activeResources.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                {t("noActiveItems")}
              </div>
            ) : (
              <ol className="max-h-80 space-y-2 overflow-y-auto">
                {activeResources.map((resource, index) => {
                  const validation = validations[resource.id];
                  const TypeIcon = resourceTypeIcons[resource.type];
                  return (
                    <li
                      key={resource.id}
                      className="border-border flex items-center gap-3 rounded-md border p-3"
                    >
                      <span className="text-muted-foreground w-6 text-right text-xs">
                        {index + 1}
                      </span>
                      <TypeIcon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm">{resource.name}</span>
                      {!validation ? (
                        <span className="text-muted-foreground text-xs">{t("inspecting")}</span>
                      ) : !validation.valid ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-amber-400"
                          title={validation.message ?? undefined}
                        >
                          <AlertTriangle className="size-3.5" />
                          {t("skipped")}
                        </span>
                      ) : (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => void handleStart()}
                disabled={activeResources.length === 0 || !allValidated}
              >
                <Rocket className="size-4" />
                {t("openEnvironment")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "error" | "warning";
}) {
  const colors = {
    success: "text-emerald-400",
    error: "text-destructive",
    warning: "text-amber-400",
  };
  return (
    <div className="border-border rounded-lg border p-3 text-center">
      <p className={"text-2xl font-semibold " + colors[tone]}>{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

import { getCurrentWebview } from "@tauri-apps/api/webview";
import { AppWindow, File, FileUp, Folder } from "lucide-react";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/common/Dialog";
import {
  resourceDropApi,
  type DroppedResourceCandidate,
} from "@/features/resources/resourceDropApi";
import { useResourceStore } from "@/features/resources/resourceStore";
import { cn } from "@/lib/utils";
import type { Resource, ResourceType } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

const typeIcons: Record<Exclude<ResourceType, "website">, ComponentType<{ className?: string }>> = {
  application: AppWindow,
  folder: Folder,
  file: File,
};

export function ResourceDropZone({
  workspaceId,
  resources,
}: {
  workspaceId: string;
  resources: Resource[];
}) {
  const { t } = useI18n();
  const createResource = useResourceStore((state) => state.createResource);
  const [isOver, setIsOver] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [candidates, setCandidates] = useState<DroppedResourceCandidate[]>([]);

  const inspectPaths = useCallback(
    async (paths: string[]) => {
      if (isInspecting || isAdding || paths.length === 0) return;
      setIsInspecting(true);
      try {
        const inspected = await resourceDropApi.inspect(paths);
        const existingPaths = new Set(resources.map((resource) => normalizePath(resource.target)));
        const available = inspected.filter(
          (candidate) => !existingPaths.has(normalizePath(candidate.path)),
        );
        const skipped = paths.length - available.length;
        if (skipped > 0) {
          toast.info(`${skipped}개 항목은 이미 등록됐거나 사용할 수 없어 제외했습니다.`);
        }
        if (available.length === 0) {
          toast.error("추가할 수 있는 파일이나 폴더가 없습니다.");
          return;
        }
        setCandidates(available);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "드롭한 항목을 확인하지 못했습니다.");
      } finally {
        setIsInspecting(false);
      }
    },
    [isAdding, isInspecting, resources],
  );

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setIsOver(true);
        } else if (event.payload.type === "drop") {
          setIsOver(false);
          void inspectPaths(event.payload.paths);
        } else {
          setIsOver(false);
        }
      })
      .then((stopListening) => {
        if (disposed) stopListening();
        else unlisten = stopListening;
      })
      .catch(() => setIsOver(false));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [inspectPaths]);

  const addCandidates = async () => {
    setIsAdding(true);
    let added = 0;
    let failed = 0;
    for (const candidate of candidates) {
      try {
        await createResource(workspaceId, {
          type: candidate.resourceType,
          name: candidate.name,
          target: candidate.path,
          description: "드래그 앤 드롭으로 추가됨",
          icon: candidate.resourceType === "application" ? "app-window" : candidate.resourceType,
          isEnabled: true,
        });
        added += 1;
      } catch {
        failed += 1;
      }
    }
    setIsAdding(false);
    setCandidates([]);
    if (added > 0) toast.success(`${added}개 리소스를 추가했습니다.`);
    if (failed > 0) toast.error(`${failed}개 리소스를 추가하지 못했습니다.`);
  };

  return (
    <>
      <div
        className={cn(
          "mb-6 flex min-h-24 items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors",
          isOver
            ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
            : "border-border bg-card/40 text-muted-foreground",
        )}
      >
        <div>
          <FileUp className={cn("mx-auto size-6", isOver && "animate-bounce")} />
          <p className="mt-2 text-sm font-medium">
            {isOver
              ? t("dropActive")
              : t("dropIdle")}
          </p>
          <p className="mt-1 text-xs opacity-75">
            {t("dropMultiple")}
          </p>
        </div>
      </div>

      <Dialog
        open={candidates.length > 0}
        onOpenChange={(open) => {
          if (!open && !isAdding) setCandidates([]);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("droppedResources")}</DialogTitle>
            <DialogDescription>
              {t("droppedCountDescription", { count: candidates.length })}
            </DialogDescription>
          </DialogHeader>
          <ul className="border-border max-h-80 divide-y overflow-y-auto rounded-lg border">
            {candidates.map((candidate) => {
              const Icon = typeIcons[candidate.resourceType];
              return (
                <li key={candidate.path} className="flex items-center gap-3 p-3">
                  <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{candidate.name}</span>
                    <span
                      className="text-muted-foreground block truncate text-xs"
                      title={candidate.path}
                    >
                      {candidate.path}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {candidate.resourceType === "application"
                      ? t("app")
                      : candidate.resourceType === "folder"
                        ? t("folder")
                        : t("file")}
                  </span>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCandidates([])} disabled={isAdding}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void addCandidates()} disabled={isAdding}>
              {isAdding ? t("adding") : t("addCount", { count: candidates.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function normalizePath(path: string) {
  return path.trim().replaceAll("/", "\\").toLocaleLowerCase();
}

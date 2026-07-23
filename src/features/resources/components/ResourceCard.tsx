import { AlertTriangle, ArrowDown, ArrowUp, LoaderCircle, Play } from "lucide-react";
import type { MouseEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import { useLaunchStore } from "@/features/launcher/launchStore";
import { DeleteResourceDialog } from "@/features/resources/components/DeleteResourceDialog";
import { ResourceFormDialog } from "@/features/resources/components/ResourceFormDialog";
import { ResourceIcon } from "@/features/resources/components/ResourceIcon";
import { useResourceStore } from "@/features/resources/resourceStore";
import { cn } from "@/lib/utils";
import type { Resource } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

interface ResourceCardProps {
  resource: Resource;
  workspaceId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ResourceCard({ resource, workspaceId, canMoveUp, canMoveDown }: ResourceCardProps) {
  const { t } = useI18n();
  const moveResource = useResourceStore((state) => state.moveResource);
  const toggleResourceEnabled = useResourceStore((state) => state.toggleResourceEnabled);
  const isLoading = useResourceStore((state) => state.isLoading);
  const validation = useLaunchStore((state) => state.validations[resource.id]);
  const isLaunching = useLaunchStore((state) => state.launchingResourceIds.includes(resource.id));
  const launchResource = useLaunchStore((state) => state.launchResource);
  const canLaunch = resource.isEnabled && validation?.valid === true && !isLaunching;

  const move = async (direction: "up" | "down") => {
    try {
      await moveResource(workspaceId, resource.id, direction);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "리소스 순서를 변경하지 못했습니다.");
    }
  };

  const toggle = async () => {
    try {
      await toggleResourceEnabled(resource.id, !resource.isEnabled);
      toast.success(resource.isEnabled ? "리소스를 비활성화했습니다." : "리소스를 활성화했습니다.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "활성화 상태를 변경하지 못했습니다.");
    }
  };

  const launch = async () => {
    if (!canLaunch) return;
    try {
      const result = await launchResource(resource.id);
      if (result.success) {
        toast.success(result.message, { duration: 2_000 });
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "리소스를 실행하지 못했습니다.");
    }
  };

  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label")) return;
    void launch();
  };

  return (
    <article
      className={cn(
        "border-border bg-card rounded-lg border p-4",
        !resource.isEnabled && "opacity-60",
      )}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start gap-3">
        <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-md text-lg">
          <ResourceIcon icon={resource.icon} type={resource.type} target={resource.target} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h4 className="truncate font-medium">{resource.name}</h4>
              {validation && !validation.valid && (
                <span
                  className="bg-destructive/15 text-destructive inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                  title={validation.message ?? t("invalidTarget")}
                >
                  <AlertTriangle className="size-3" />
                  {t("checkPath")}
                </span>
              )}
            </div>
            <label className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={resource.isEnabled}
                onChange={() => void toggle()}
                disabled={isLoading}
                className="accent-primary size-4"
              />
              {resource.isEnabled ? t("active") : t("inactive")}
            </label>
          </div>
          <p className="text-muted-foreground mt-1 truncate text-sm" title={resource.target}>
            {resource.target}
          </p>
          {resource.description && (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
              {resource.description}
            </p>
          )}
        </div>
      </div>

      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex flex-wrap gap-1">
          <Button
            className="h-8 px-3"
            disabled={!canLaunch}
            onClick={() => void launch()}
            title={validation?.message ?? undefined}
          >
            {isLaunching ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {isLaunching ? t("launching") : t("launch")}
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-2"
            disabled={!canMoveUp || isLoading}
            onClick={() => void move("up")}
            aria-label={t("moveUp", { name: resource.name })}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-2"
            disabled={!canMoveDown || isLoading}
            onClick={() => void move("down")}
            aria-label={t("moveDown", { name: resource.name })}
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <ResourceFormDialog workspaceId={workspaceId} resource={resource} />
          <DeleteResourceDialog resource={resource} />
        </div>
      </div>
    </article>
  );
}

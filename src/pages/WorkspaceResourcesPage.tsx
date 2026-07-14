import { Copy, Layers3, RotateCw, Star } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import { BatchLaunchDialog } from "@/features/launcher/components/BatchLaunchDialog";
import { useLaunchStore } from "@/features/launcher/launchStore";
import { AddResourceMenu } from "@/features/resources/components/AddResourceMenu";
import { ResourceCard } from "@/features/resources/components/ResourceCard";
import { ResourceHealthDialog } from "@/features/resources/components/ResourceHealthDialog";
import { ResourceDropZone } from "@/features/resources/components/ResourceDropZone";
import { resourceSections, resourceTypeIcons } from "@/features/resources/resourcePresentation";
import { useResourceStore } from "@/features/resources/resourceStore";
import { ExportTemplateDialog } from "@/features/templates/components/ExportTemplateDialog";
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/DeleteWorkspaceDialog";
import { EditWorkspaceDialog } from "@/features/workspaces/components/EditWorkspaceDialog";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { WorkspaceIcon } from "@/features/workspaces/workspaceAppearance";
import { useI18n } from "@/features/i18n/i18n";

export function WorkspaceResourcesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const workspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const workspaceLoading = useWorkspaceStore((state) => state.isLoading);
  const workspaceError = useWorkspaceStore((state) => state.error);
  const fetchWorkspace = useWorkspaceStore((state) => state.fetchWorkspace);
  const setWorkspaceFavorite = useWorkspaceStore((state) => state.setWorkspaceFavorite);
  const duplicateWorkspace = useWorkspaceStore((state) => state.duplicateWorkspace);
  const resources = useResourceStore((state) => state.resources);
  const resourcesLoading = useResourceStore((state) => state.isLoading);
  const resourcesError = useResourceStore((state) => state.error);
  const fetchResources = useResourceStore((state) => state.fetchResources);
  const validateResources = useLaunchStore((state) => state.validateResources);

  useEffect(() => {
    if (workspaceId) {
      void fetchWorkspace(workspaceId);
      void fetchResources(workspaceId);
    }
  }, [fetchResources, fetchWorkspace, workspaceId]);

  useEffect(() => {
    void validateResources(resources);
  }, [resources, validateResources]);

  const toggleFavorite = async () => {
    if (!workspace) return;
    try {
      await setWorkspaceFavorite(workspace.id, !workspace.isFavorite);
      toast.success(
        !workspace.isFavorite ? "즐겨찾기에 고정했습니다." : "즐겨찾기에서 해제했습니다.",
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "즐겨찾기를 변경하지 못했습니다.");
    }
  };

  const duplicate = async () => {
    if (!workspace) return;
    try {
      const copy = await duplicateWorkspace(workspace.id);
      toast.success("작업 공간과 리소스를 복제했습니다.");
      void navigate(`/workspace/${copy.id}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "작업 공간을 복제하지 못했습니다.");
    }
  };

  if (workspaceLoading && !workspace) {
    return <div className="text-muted-foreground p-8 text-sm">{t("loadingWorkspace")}</div>;
  }

  if (workspaceError || !workspace) {
    return (
      <div className="p-8">
        <div className="border-destructive/40 bg-destructive/10 rounded-lg border p-6 text-center">
          <p className="text-destructive text-sm">
            {workspaceError ?? t("workspaceNotFound")}
          </p>
          {workspaceId && (
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => void fetchWorkspace(workspaceId)}
            >
              <RotateCw className="size-4" aria-hidden="true" />
              {t("retry")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="border-border flex items-start justify-between gap-6 border-b px-8 py-6">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: workspace.color ?? undefined }}
          >
            <WorkspaceIcon value={workspace.icon} className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{workspace.name}</h1>
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
              {workspace.description || t("noDescription")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            onClick={() => void toggleFavorite()}
            aria-label={workspace.isFavorite ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
          >
            <Star className="size-4" fill={workspace.isFavorite ? "currentColor" : "none"} />
            {workspace.isFavorite ? t("pinned") : t("pin")}
          </Button>
          <Button variant="secondary" onClick={() => void duplicate()}>
            <Copy className="size-4" />
            {t("duplicate")}
          </Button>
          <BatchLaunchDialog workspaceId={workspace.id} resources={resources} />
          <ExportTemplateDialog workspace={workspace} />
          <EditWorkspaceDialog workspace={workspace} />
          <DeleteWorkspaceDialog workspace={workspace} />
        </div>
      </header>

      <section className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("resources")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t("resourcesDescription")}</p>
          </div>
          <div className="flex gap-2">
            <ResourceHealthDialog workspaceId={workspace.id} resources={resources} />
            <AddResourceMenu workspaceId={workspace.id} resources={resources} />
          </div>
        </div>

        <ResourceDropZone workspaceId={workspace.id} resources={resources} />

        {resourcesLoading && resources.length === 0 && (
          <div className="border-border text-muted-foreground rounded-lg border p-10 text-center text-sm">
            {t("loadingResources")}
          </div>
        )}

        {!resourcesLoading && resourcesError && (
          <div className="border-destructive/40 bg-destructive/10 rounded-lg border p-6 text-center">
            <p className="text-destructive text-sm">{resourcesError}</p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => void fetchResources(workspace.id)}
            >
              <RotateCw className="size-4" aria-hidden="true" />
              {t("retry")}
            </Button>
          </div>
        )}

        {!resourcesLoading && !resourcesError && resources.length === 0 && (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <Layers3 className="text-muted-foreground mx-auto size-10" aria-hidden="true" />
            <h3 className="mt-4 font-medium">{t("noResources")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{t("noResourcesDescription")}</p>
          </div>
        )}

        {resources.length > 0 && (
          <div className="space-y-8">
            {resourceSections.map((section) => {
              const sectionResources = resources.filter(
                (resource) => resource.type === section.type,
              );
              if (sectionResources.length === 0) return null;
              const SectionIcon = resourceTypeIcons[section.type];
              return (
                <section key={section.type}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <SectionIcon className="text-muted-foreground size-4" aria-hidden="true" />
                    {section.title}
                    <span className="text-muted-foreground font-normal">
                      {sectionResources.length}
                    </span>
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {sectionResources.map((resource, index) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        workspaceId={workspace.id}
                        canMoveUp={index > 0}
                        canMoveDown={index < sectionResources.length - 1}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

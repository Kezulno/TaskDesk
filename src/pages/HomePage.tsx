import { FolderKanban, RotateCw, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { CreateWorkspaceDialog } from "@/features/workspaces/components/CreateWorkspaceDialog";
import { ImportTemplateDialog } from "@/features/templates/components/ImportTemplateDialog";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { WorkspaceIcon } from "@/features/workspaces/workspaceAppearance";
import { useI18n } from "@/features/i18n/i18n";

export function HomePage() {
  const { t } = useI18n();
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const error = useWorkspaceStore((state) => state.error);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const setWorkspaceFavorite = useWorkspaceStore((state) => state.setWorkspaceFavorite);

  const toggleFavorite = async (workspaceId: string, isFavorite: boolean) => {
    try {
      await setWorkspaceFavorite(workspaceId, !isFavorite);
      toast.success(!isFavorite ? "즐겨찾기에 고정했습니다." : "즐겨찾기에서 해제했습니다.");
    } catch (favoriteError: unknown) {
      toast.error(
        favoriteError instanceof Error ? favoriteError.message : "즐겨찾기를 변경하지 못했습니다.",
      );
    }
  };

  return (
    <div>
      <PageHeader title={t("workspaces")} description={t("manageWorkspaces")} />
      <section className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("allWorkspaces")}</h2>
          <div className="flex gap-2">
            <ImportTemplateDialog />
            <CreateWorkspaceDialog />
          </div>
        </div>

        {isLoading && workspaces.length === 0 && (
          <div className="border-border text-muted-foreground rounded-lg border p-10 text-center text-sm">
            {t("loadingWorkspaces")}
          </div>
        )}

        {!isLoading && error && (
          <div className="border-destructive/40 bg-destructive/10 rounded-lg border p-6 text-center">
            <p className="text-destructive text-sm">{error}</p>
            <Button className="mt-4" variant="secondary" onClick={() => void fetchWorkspaces()}>
              <RotateCw className="size-4" aria-hidden="true" />
              {t("retry")}
            </Button>
          </div>
        )}

        {!isLoading && !error && workspaces.length === 0 && (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <FolderKanban className="text-muted-foreground mx-auto size-10" aria-hidden="true" />
            <h3 className="mt-4 font-medium">{t("noWorkspaces")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{t("noWorkspacesDescription")}</p>
          </div>
        )}

        {workspaces.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <article
                key={workspace.id}
                className="border-border bg-card hover:border-ring relative rounded-lg border transition-colors"
              >
                <Link to={`/workspace/${workspace.id}`} className="group block p-5 pr-14">
                  <div className="flex items-start gap-4">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-md text-lg"
                      style={{ backgroundColor: workspace.color ?? undefined }}
                    >
                      <WorkspaceIcon value={workspace.icon} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="group-hover:text-primary truncate font-semibold">
                        {workspace.name}
                      </h3>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {workspace.description || t("noDescription")}
                      </p>
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-3 right-3 rounded-md p-2"
                  onClick={() => void toggleFavorite(workspace.id, workspace.isFavorite)}
                  aria-label={workspace.isFavorite ? t("unpinFavorite") : t("pinFavorite")}
                  title={workspace.isFavorite ? t("unpinFavorite") : t("pinFavorite")}
                >
                  <Star className="size-4" fill={workspace.isFavorite ? "currentColor" : "none"} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { LayoutDashboard, LibraryBig, Settings, Star } from "lucide-react";
import { NavLink } from "react-router-dom";

import { CreateWorkspaceDialog } from "@/features/workspaces/components/CreateWorkspaceDialog";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { WorkspaceIcon } from "@/features/workspaces/workspaceAppearance";
import { cn } from "@/lib/utils";
import { useI18n, type TranslationKey } from "@/features/i18n/i18n";

const navigation = [
  { label: "home", to: "/", icon: LayoutDashboard },
  { label: "catalog", to: "/catalog", icon: LibraryBig },
  { label: "settings", to: "/settings", icon: Settings },
] satisfies Array<{ label: TranslationKey; to: string; icon: typeof LayoutDashboard }>;

export function Sidebar() {
  const { t } = useI18n();
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  return (
    <aside className="border-border bg-sidebar text-sidebar-foreground flex h-full w-20 shrink-0 flex-col border-r p-3 lg:w-56 xl:w-64 xl:p-4">
      <div className="flex h-12 items-center justify-center text-lg font-semibold tracking-tight lg:justify-start lg:px-3">
        <span className="lg:hidden">TD</span>
        <span className="hidden lg:inline">TaskDeck</span>
      </div>
      <CreateWorkspaceDialog compact />

      <nav className="mt-4 space-y-1" aria-label={t("navigation")}>
        {navigation.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors lg:justify-start lg:px-3",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )
            }
            title={t(label)}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden lg:inline">{t(label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <p className="text-muted-foreground hidden px-3 text-xs font-medium tracking-wider uppercase lg:block">
          {t("workspaces")}
        </p>
        <nav className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label={t("workspaces")}>
          {workspaces.map((workspace) => (
            <NavLink
              key={workspace.id}
              to={`/workspace/${workspace.id}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm transition-colors lg:justify-start lg:px-3",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )
              }
              title={workspace.name}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded text-xs"
                style={{ backgroundColor: workspace.color ?? undefined }}
              >
                <WorkspaceIcon value={workspace.icon} className="size-4" />
              </span>
              <span className="hidden min-w-0 flex-1 truncate lg:block">{workspace.name}</span>
              {workspace.isFavorite && (
                <Star className="ml-auto hidden size-3 shrink-0 fill-current text-amber-400 lg:block" />
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

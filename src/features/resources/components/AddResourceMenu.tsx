import { AppWindow, ChevronDown, FileCog, FilePlus2, LibraryBig } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { InstalledApplicationsDialog } from "@/features/resources/components/InstalledApplicationsDialog";
import { DefaultApplicationDialog } from "@/features/resources/components/DefaultApplicationDialog";
import { ResourceFormDialog } from "@/features/resources/components/ResourceFormDialog";
import type { Resource } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

export function AddResourceMenu({
  workspaceId,
  resources,
}: {
  workspaceId: string;
  resources: Resource[];
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent";

  return (
    <div className="relative">
      <Button onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        {t("addResource")}
        <ChevronDown className="size-4" />
      </Button>
      {open && (
        <div className="border-border bg-popover text-popover-foreground absolute top-11 right-0 z-40 w-56 overflow-hidden rounded-md border shadow-lg">
          <ResourceFormDialog
            workspaceId={workspaceId}
            trigger={
              <button type="button" className={menuItemClass}>
                <FilePlus2 className="size-4" />
                {t("directEntry")}
              </button>
            }
          />
          <InstalledApplicationsDialog
            workspaceId={workspaceId}
            resources={resources}
            trigger={
              <button type="button" className={menuItemClass}>
                <AppWindow className="size-4" />
                {t("installedApps")}
              </button>
            }
          />
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              setOpen(false);
              void navigate(`/catalog?workspaceId=${encodeURIComponent(workspaceId)}`);
            }}
          >
            <LibraryBig className="size-4" />
            {t("recommendedApps")}
          </button>
          <DefaultApplicationDialog
            workspaceId={workspaceId}
            resources={resources}
            trigger={
              <button type="button" className={menuItemClass}>
                <FileCog className="size-4" />
                {t("defaultApp")}
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

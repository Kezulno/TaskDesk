import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { Workspace } from "@/types/workspace";
import { useI18n } from "@/features/i18n/i18n";

export function DeleteWorkspaceDialog({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
  const isLoading = useWorkspaceStore((state) => state.isLoading);

  const handleDelete = async () => {
    try {
      await deleteWorkspace(workspace.id);
      toast.success("작업 공간을 삭제했습니다.");
      setOpen(false);
      void navigate("/");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "작업 공간 삭제에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="size-4" aria-hidden="true" />
          {t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteWorkspaceQuestion")}</DialogTitle>
          <DialogDescription>{t("deleteWorkspaceDescription", { name: workspace.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={isLoading}>
            {isLoading ? t("deleting") : t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

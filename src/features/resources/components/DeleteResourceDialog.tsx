import { Trash2 } from "lucide-react";
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
import { useResourceStore } from "@/features/resources/resourceStore";
import type { Resource } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

export function DeleteResourceDialog({ resource }: { resource: Resource }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const deleteResource = useResourceStore((state) => state.deleteResource);
  const isLoading = useResourceStore((state) => state.isLoading);

  const handleDelete = async () => {
    try {
      await deleteResource(resource.id);
      toast.success("리소스를 삭제했습니다.");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "리소스 삭제에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-destructive h-8 px-2"
          aria-label={`${resource.name} ${t("delete")}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteResourceQuestion")}</DialogTitle>
          <DialogDescription>{t("deleteResourceDescription", { name: resource.name })}</DialogDescription>
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

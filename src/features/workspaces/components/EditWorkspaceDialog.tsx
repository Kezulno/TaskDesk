import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { WorkspaceFields } from "@/features/workspaces/components/WorkspaceFields";
import { workspaceFormSchema, type WorkspaceFormValues } from "@/features/workspaces/workspaceForm";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { Workspace } from "@/types/workspace";
import { useI18n } from "@/features/i18n/i18n";

function valuesFromWorkspace(workspace: Workspace): WorkspaceFormValues {
  return {
    name: workspace.name,
    description: workspace.description ?? "",
    icon: workspace.icon ?? "",
    color: workspace.color ?? "",
  };
}

export function EditWorkspaceDialog({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const updateWorkspace = useWorkspaceStore((state) => state.updateWorkspace);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: valuesFromWorkspace(workspace),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) reset(valuesFromWorkspace(workspace));
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateWorkspace(workspace.id, values);
      toast.success("작업 공간을 수정했습니다.");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "작업 공간 수정에 실패했습니다.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Pencil className="size-4" aria-hidden="true" />
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editWorkspace")}</DialogTitle>
          <DialogDescription>{t("editWorkspaceDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <WorkspaceFields
            register={register}
            errors={errors}
            disabled={isLoading}
            setValue={setValue}
            watch={watch}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isLoading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

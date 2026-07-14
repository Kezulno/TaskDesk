import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import { useI18n } from "@/features/i18n/i18n";

const emptyValues: WorkspaceFormValues = {
  name: "",
  description: "",
  icon: "",
  color: "#6366f1",
};

interface CreateWorkspaceDialogProps {
  compact?: boolean;
}

export function CreateWorkspaceDialog({ compact = false }: CreateWorkspaceDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
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
    defaultValues: emptyValues,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset(emptyValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createWorkspace(values);
      toast.success("작업 공간을 만들었습니다.");
      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "작업 공간 생성에 실패했습니다.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={compact ? "mt-3 w-full" : undefined}>
          <Plus className="size-4" aria-hidden="true" />
          {t("newWorkspace")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newWorkspace")}</DialogTitle>
          <DialogDescription>{t("workspaceInfo")}</DialogDescription>
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
            <Button
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Pencil, Plus, ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Input, Textarea } from "@/components/common/FormField";
import { applicationScanApi } from "@/features/resources/applicationScanApi";
import { resourceFormSchema, type ResourceFormValues } from "@/features/resources/resourceForm";
import { useResourceStore } from "@/features/resources/resourceStore";
import { errorMessage } from "@/lib/errors";
import type { DetectedApplication } from "@/types/detectedApplication";
import type { Resource, ResourceInput } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

const emptyValues: ResourceFormValues = {
  type: "application",
  name: "",
  target: "",
  description: "",
  icon: "",
  isEnabled: true,
};

interface ResourceFormDialogProps {
  workspaceId: string;
  resource?: Resource;
  trigger?: ReactNode;
}

function valuesFromResource(resource?: Resource): ResourceFormValues {
  if (!resource) return emptyValues;
  return {
    type: resource.type,
    name: resource.name,
    target: resource.target,
    description: resource.description ?? "",
    icon: resource.icon ?? "",
    isEnabled: resource.isEnabled,
  };
}

export function ResourceFormDialog({ workspaceId, resource, trigger }: ResourceFormDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [inspection, setInspection] = useState<DetectedApplication | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const createResource = useResourceStore((state) => state.createResource);
  const updateResource = useResourceStore((state) => state.updateResource);
  const isLoading = useResourceStore((state) => state.isLoading);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: valuesFromResource(resource),
  });
  const resourceType = useWatch({ control, name: "type" });
  const editing = resource !== undefined;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setInspection(null);
    reset(valuesFromResource(resource));
  };

  const inspectApplication = async (target = getValues("target")) => {
    if (!target.trim()) return null;
    setIsInspecting(true);
    try {
      const result = await applicationScanApi.inspect(target.trim());
      setInspection(result);
      setValue("target", result.executablePath, { shouldDirty: true, shouldValidate: true });
      if (!getValues("name").trim()) {
        setValue("name", result.name, { shouldDirty: true, shouldValidate: true });
      }
      if (!getValues("icon").trim()) {
        setValue("icon", "app-window", { shouldDirty: true });
      }
      return result;
    } catch (inspectError: unknown) {
      toast.error(errorMessage(inspectError, "애플리케이션 호환성을 검사하지 못했습니다."));
      return null;
    } finally {
      setIsInspecting(false);
    }
  };

  const chooseTarget = async () => {
    try {
      const selected = await openDialog({
        directory: resourceType === "folder",
        multiple: false,
        filters:
          resourceType === "application"
            ? [{ name: "Windows applications", extensions: ["exe"] }]
            : undefined,
      });
      if (typeof selected === "string") {
        setValue("target", selected, { shouldDirty: true, shouldValidate: true });
        if (resourceType === "application") await inspectApplication(selected);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "파일 선택 창을 열지 못했습니다.");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (values.type === "application") {
        const result = await inspectApplication(values.target);
        if (!result?.valid) {
          toast.error(result?.compatibility.message ?? "호환되는 Windows 실행 파일이 아닙니다.");
          return;
        }
      }
      const input: ResourceInput = {
        ...values,
        icon: values.type === "application" && !values.icon.trim() ? "app-window" : values.icon,
      };
      if (resource) {
        await updateResource(resource.id, input);
        toast.success("리소스를 수정했습니다.");
      } else {
        await createResource(workspaceId, input);
        toast.success("리소스를 추가했습니다.");
      }
      setOpen(false);
      reset(valuesFromResource(resource));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "리소스를 저장하지 못했습니다.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant={editing ? "secondary" : "default"}
            className={editing ? "h-8 px-3" : undefined}
          >
            {editing ? <Pencil className="size-3.5" /> : <Plus className="size-4" />}
            {editing ? t("edit") : t("addResource")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("editResource") : t("addResource")}</DialogTitle>
          <DialogDescription>{t("resourceFormDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            {t("type")}
            <select
              className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              disabled={isLoading}
              {...register("type")}
            >
              <option value="application">{t("application")}</option>
              <option value="website">{t("website")}</option>
              <option value="folder">{t("folder")}</option>
              <option value="file">{t("file")}</option>
            </select>
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            {t("name")} <span className="text-destructive">*</span>
            <Input autoFocus disabled={isLoading} {...register("name")} />
            {errors.name && (
              <span className="text-destructive block text-xs">{errors.name.message}</span>
            )}
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            {resourceType === "website" ? "URL" : t("targetPath")}{" "}
            <span className="text-destructive">*</span>
            <div className="flex gap-2">
              <Input
                placeholder={
                  resourceType === "website" ? "https://example.com" : t("pathPlaceholder")
                }
                disabled={isLoading}
                {...register("target")}
              />
              {resourceType !== "website" && (
                <Button
                  variant="secondary"
                  className="shrink-0 px-3"
                  onClick={() => void chooseTarget()}
                  disabled={isLoading}
                  aria-label={t("chooseFileFolder")}
                >
                  <FolderOpen className="size-4" />
                  {t("choose")}
                </Button>
              )}
            </div>
            {errors.target && (
              <span className="text-destructive block text-xs">{errors.target.message}</span>
            )}
            {resourceType === "application" && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground flex min-w-0 items-center gap-1">
                  {inspection?.valid ? (
                    <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
                  ) : inspection ? (
                    <ShieldX className="text-destructive size-4 shrink-0" />
                  ) : null}
                  {inspection
                    ? inspection.isInstaller
                      ? t("installerNotice")
                      : (inspection.compatibility.architecture ?? inspection.compatibility.message)
                    : t("validateBeforeSave")}
                </span>
                <Button
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => void inspectApplication()}
                  disabled={isLoading || isInspecting}
                >
                  {isInspecting ? t("inspecting") : t("compatibilityCheck")}
                </Button>
              </div>
            )}
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            {t("description")}
            <Textarea disabled={isLoading} {...register("description")} />
            {errors.description && (
              <span className="text-destructive block text-xs">{errors.description.message}</span>
            )}
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            {t("iconString")}
            <Input placeholder="예: 🚀" disabled={isLoading} {...register("icon")} />
            {errors.icon && (
              <span className="text-destructive block text-xs">{errors.icon.message}</span>
            )}
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-primary size-4"
              disabled={isLoading}
              {...register("isEnabled")}
            />
            {t("enabled")}
          </label>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isLoading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || isInspecting}>
              {isLoading || isInspecting ? t("checking") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

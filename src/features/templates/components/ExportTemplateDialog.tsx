import { zodResolver } from "@hookform/resolvers/zod";
import { save } from "@tauri-apps/plugin-dialog";
import { Download, TriangleAlert } from "lucide-react";
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
import { Input, Textarea } from "@/components/common/FormField";
import { templateApi } from "@/features/templates/templateApi";
import {
  exportTemplateFormSchema,
  type ExportTemplateFormValues,
} from "@/features/templates/templateSchema";
import { errorMessage } from "@/lib/errors";
import type { Workspace } from "@/types/workspace";
import { useI18n } from "@/features/i18n/i18n";

const defaultValues: ExportTemplateFormValues = {
  name: "",
  description: "",
  author: "TaskDeck User",
  category: "general",
};

function safeFileName(value: string): string {
  const normalized = value.replace(/[<>:"/\\|?*]/g, "_").trim();
  return normalized || "taskdeck-template";
}

export function ExportTemplateDialog({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExportTemplateFormValues>({
    resolver: zodResolver(exportTemplateFormSchema),
    defaultValues: { ...defaultValues, name: workspace.name },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset({ ...defaultValues, name: workspace.name });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const outputPath = await save({
        title: "TaskDeck 템플릿 저장",
        defaultPath: `${safeFileName(values.name)}.json`,
        filters: [{ name: "JSON 템플릿", extensions: ["json"] }],
      });
      if (!outputPath) return;
      setIsExporting(true);
      const result = await templateApi.export(workspace.id, outputPath, values);
      toast.success(`템플릿을 저장했습니다. (${result.resourceCount}개 리소스)`);
      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "템플릿을 내보내지 못했습니다."));
    } finally {
      setIsExporting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Download className="size-4" aria-hidden="true" />
          {t("exportTemplate")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("exportWorkspaceTemplate")}</DialogTitle>
          <DialogDescription>{t("exportTemplateDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <p>{t("templatePrivacyWarning")}</p>
        </div>

        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t("templateName")}</span>
            <Input {...register("name")} disabled={isExporting} />
            {errors.name && <span className="text-destructive text-xs">{errors.name.message}</span>}
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t("description")}</span>
            <Textarea {...register("description")} disabled={isExporting} />
            {errors.description && (
              <span className="text-destructive text-xs">{errors.description.message}</span>
            )}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t("author")}</span>
              <Input {...register("author")} disabled={isExporting} />
              {errors.author && (
                <span className="text-destructive text-xs">{errors.author.message}</span>
              )}
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t("category")}</span>
              <Input {...register("category")} disabled={isExporting} />
              {errors.category && (
                <span className="text-destructive text-xs">{errors.category.message}</span>
              )}
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isExporting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isExporting}>
              {isExporting ? t("saving") : t("chooseSaveLocation")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

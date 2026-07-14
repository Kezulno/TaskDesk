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
          템플릿으로 내보내기
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>워크스페이스 템플릿 내보내기</DialogTitle>
          <DialogDescription>워크스페이스와 리소스 구성만 JSON으로 저장합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <p>
            등록된 애플리케이션, 파일 및 폴더의 로컬 경로가 템플릿에 포함될 수 있습니다.
            <br />
            외부에 공유하기 전에 경로에 개인정보가 포함되어 있지 않은지 확인하세요.
          </p>
        </div>

        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">템플릿 이름</span>
            <Input {...register("name")} disabled={isExporting} />
            {errors.name && <span className="text-destructive text-xs">{errors.name.message}</span>}
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">설명</span>
            <Textarea {...register("description")} disabled={isExporting} />
            {errors.description && (
              <span className="text-destructive text-xs">{errors.description.message}</span>
            )}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">작성자</span>
              <Input {...register("author")} disabled={isExporting} />
              {errors.author && (
                <span className="text-destructive text-xs">{errors.author.message}</span>
              )}
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">카테고리</span>
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
              취소
            </Button>
            <Button type="submit" disabled={isExporting}>
              {isExporting ? "저장 중…" : "저장 위치 선택"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

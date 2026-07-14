import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, FileJson, FolderSearch, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ZodError } from "zod";

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
import { templateApi } from "@/features/templates/templateApi";
import {
  workspaceTemplatePreviewSchema,
  type WorkspaceTemplatePreview,
} from "@/features/templates/templateSchema";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { errorMessage } from "@/lib/errors";

function validationMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "JSON"}: ${issue.message}`)
      .join("\n");
  }
  return errorMessage(error, "템플릿을 검증하지 못했습니다.");
}

export function ImportTemplateDialog() {
  const navigate = useNavigate();
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const [openDialog, setOpenDialog] = useState(false);
  const [inputPath, setInputPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkspaceTemplatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const reset = () => {
    setInputPath(null);
    setPreview(null);
    setError(null);
    setIsValidating(false);
    setIsImporting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpenDialog(nextOpen);
    if (!nextOpen) reset();
  };

  const selectAndValidate = async () => {
    setError(null);
    setIsValidating(true);
    try {
      const selected = await open({
        title: "TaskDeck 템플릿 선택",
        multiple: false,
        directory: false,
        filters: [{ name: "JSON 템플릿", extensions: ["json"] }],
      });
      if (!selected) return;
      setInputPath(selected);
      setPreview(null);
      const rawPreview = await templateApi.validate(selected);
      setPreview(workspaceTemplatePreviewSchema.parse(rawPreview));
    } catch (validationError: unknown) {
      setError(validationMessage(validationError));
    } finally {
      setIsValidating(false);
    }
  };

  const importTemplate = async () => {
    if (!inputPath || !preview) return;
    setIsImporting(true);
    try {
      const result = await templateApi.import(inputPath);
      await fetchWorkspaces();
      toast.success(`새 작업 공간과 리소스 ${result.resourceCount}개를 가져왔습니다.`);
      handleOpenChange(false);
      void navigate(`/workspace/${result.workspace.id}`);
    } catch (importError: unknown) {
      const message = validationMessage(importError);
      setError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={openDialog} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="size-4" aria-hidden="true" />
          템플릿 가져오기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>워크스페이스 템플릿 가져오기</DialogTitle>
          <DialogDescription>
            최대 1MB의 schemaVersion 1 JSON 파일을 검증한 뒤 새 작업 공간으로 만듭니다.
          </DialogDescription>
        </DialogHeader>

        {!preview && (
          <div className="border-border rounded-lg border border-dashed p-8 text-center">
            <FileJson className="text-muted-foreground mx-auto size-10" aria-hidden="true" />
            <p className="mt-3 text-sm">가져올 TaskDeck JSON 템플릿을 선택하세요.</p>
            <Button
              className="mt-4"
              onClick={() => void selectAndValidate()}
              disabled={isValidating}
            >
              <FolderSearch className="size-4" aria-hidden="true" />
              {isValidating ? "검증 중…" : "JSON 파일 선택"}
            </Button>
          </div>
        )}

        {error && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="border-border bg-background rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{preview.template.name}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {preview.template.description || "템플릿 설명 없음"}
                  </p>
                </div>
                <span className="bg-secondary rounded px-2 py-1 text-xs">
                  {preview.template.category}
                </span>
              </div>
              <dl className="text-muted-foreground mt-3 grid gap-1 text-xs sm:grid-cols-2">
                <div>작성자: {preview.template.author}</div>
                <div>새 작업 공간: {preview.template.workspace.name}</div>
              </dl>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">리소스 {preview.resources.length}개</h3>
                <Button variant="ghost" className="h-8" onClick={() => void selectAndValidate()}>
                  다른 파일 선택
                </Button>
              </div>
              <div className="border-border max-h-72 divide-y overflow-y-auto rounded-lg border">
                {preview.resources.length === 0 && (
                  <p className="text-muted-foreground p-5 text-center text-sm">
                    리소스가 없습니다.
                  </p>
                )}
                {preview.resources.map((resource, index) => (
                  <div key={`${resource.type}-${resource.target}-${index}`} className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-secondary rounded px-2 py-0.5 text-xs">
                        {resource.type}
                      </span>
                      <strong className="min-w-0 truncate text-sm">{resource.name}</strong>
                      {resource.needsPathReview && (
                        <span className="ml-auto flex shrink-0 items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">
                          <AlertTriangle className="size-3" aria-hidden="true" /> 경로 확인 필요
                        </span>
                      )}
                    </div>
                    <p
                      className="text-muted-foreground mt-1 truncate text-xs"
                      title={resource.target}
                    >
                      {resource.target}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {preview.resources.some((resource) => resource.needsPathReview) && (
              <p className="flex gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-500">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                존재하지 않는 로컬 경로도 저장되지만 실행할 수 없습니다. 가져온 뒤 경로를
                수정하세요.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            취소
          </Button>
          <Button onClick={() => void importTemplate()} disabled={!preview || isImporting}>
            {isImporting ? "가져오는 중…" : "새 작업 공간으로 가져오기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

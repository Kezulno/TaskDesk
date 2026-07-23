import { open } from "@tauri-apps/plugin-dialog";
import { AppWindow, FileSearch, ShieldCheck, ShieldX } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import { applicationScanApi } from "@/features/resources/applicationScanApi";
import { useResourceStore } from "@/features/resources/resourceStore";
import { errorMessage } from "@/lib/errors";
import type { DetectedApplication } from "@/types/detectedApplication";
import type { Resource } from "@/types/resource";
import { useI18n } from "@/features/i18n/i18n";

export function DefaultApplicationDialog({
  workspaceId,
  resources,
  trigger,
}: {
  workspaceId: string;
  resources: Resource[];
  trigger: ReactNode;
}) {
  const { t } = useI18n();
  const [openDialog, setOpenDialog] = useState(false);
  const [application, setApplication] = useState<DetectedApplication | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const createResource = useResourceStore((state) => state.createResource);

  const duplicate = application
    ? resources.some(
        (resource) =>
          resource.type === "application" &&
          normalizePath(resource.target) === normalizePath(application.executablePath),
      )
    : false;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpenDialog(nextOpen);
    if (!nextOpen) {
      setApplication(null);
      setSelectedFile(null);
      setError(null);
    }
  };

  const chooseFile = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const selected = await open({ multiple: false, directory: false, title: "파일 선택" });
      if (!selected) return;
      setSelectedFile(selected);
      setApplication(await applicationScanApi.detectDefaultForFile(selected));
    } catch (lookupError: unknown) {
      setApplication(null);
      setError(errorMessage(lookupError, "파일의 기본 연결 앱을 찾지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  };

  const addApplication = async () => {
    if (!application?.valid || duplicate) return;
    setIsLoading(true);
    try {
      await createResource(workspaceId, {
        type: "application",
        name: application.name,
        target: application.executablePath,
        icon: "app-window",
        description: selectedFile ? `기본 연결 앱 · ${selectedFile}` : "파일 기본 연결 앱",
        isEnabled: true,
      });
      toast.success(`${application.name} 앱을 추가했습니다.`);
      handleOpenChange(false);
    } catch (addError: unknown) {
      toast.error(errorMessage(addError, "기본 연결 앱을 추가하지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={openDialog} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("defaultApp")}</DialogTitle>
          <DialogDescription>{t("defaultAppDescription")}</DialogDescription>
        </DialogHeader>

        <Button variant="secondary" onClick={() => void chooseFile()} disabled={isLoading}>
          <FileSearch className="size-4" />
          {isLoading ? t("checking") : t("selectFile")}
        </Button>

        {error && (
          <p className="text-destructive bg-destructive/10 rounded-md p-3 text-sm">{error}</p>
        )}

        {application && (
          <div className="border-border rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <span className="bg-secondary flex size-10 items-center justify-center rounded-md">
                <AppWindow className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{application.name}</p>
                <p
                  className="text-muted-foreground mt-1 truncate text-xs"
                  title={application.executablePath}
                >
                  {application.executablePath}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs">
                  {application.valid ? (
                    <ShieldCheck className="size-4 text-emerald-400" />
                  ) : (
                    <ShieldX className="text-destructive size-4" />
                  )}
                  {application.compatibility.architecture ?? application.compatibility.message}
                </p>
                {duplicate && <p className="mt-2 text-xs text-amber-400">{t("duplicateApp")}</p>}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => void addApplication()}
            disabled={!application?.valid || duplicate || isLoading}
          >
            {t("addApp")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizePath(path: string): string {
  return path.trim().replaceAll("/", "\\").replace(/\\+$/, "").toLocaleLowerCase();
}

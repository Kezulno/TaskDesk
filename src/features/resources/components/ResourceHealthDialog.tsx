import { CheckCircle2, RefreshCw, ShieldAlert, Stethoscope } from "lucide-react";
import { useState } from "react";

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
import { useLaunchStore } from "@/features/launcher/launchStore";
import { ResourceFormDialog } from "@/features/resources/components/ResourceFormDialog";
import { ResourceIcon } from "@/features/resources/components/ResourceIcon";
import type { Resource } from "@/types/resource";

interface ResourceHealthDialogProps {
  workspaceId: string;
  resources: Resource[];
}

export function ResourceHealthDialog({ workspaceId, resources }: ResourceHealthDialogProps) {
  const [open, setOpen] = useState(false);
  const validations = useLaunchStore((state) => state.validations);
  const isValidating = useLaunchStore((state) => state.isValidating);
  const validateResources = useLaunchStore((state) => state.validateResources);

  const checkedResources = resources.filter((resource) => validations[resource.id]);
  const invalidResources = checkedResources.filter((resource) => !validations[resource.id]?.valid);
  const validCount = checkedResources.length - invalidResources.length;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) void validateResources(resources);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={resources.length === 0}>
          <Stethoscope className="size-4" />
          경로 점검
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[calc(100vh-2rem)] max-h-[42rem] max-w-2xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>리소스 경로 점검</DialogTitle>
          <DialogDescription>
            등록된 앱, 웹사이트, 폴더와 파일을 검사하고 문제가 있는 경로를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex gap-3">
            <span className="text-emerald-400">정상 {validCount}</span>
            <span className="text-destructive">확인 필요 {invalidResources.length}</span>
            <span className="text-muted-foreground">전체 {resources.length}</span>
          </div>
          <Button
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => void validateResources(resources)}
            disabled={isValidating}
          >
            <RefreshCw className={isValidating ? "size-3.5 animate-spin" : "size-3.5"} />
            다시 점검
          </Button>
        </div>

        <div className="border-border min-h-0 overflow-y-auto overscroll-contain rounded-lg border">
          {isValidating ? (
            <div className="text-muted-foreground flex h-full min-h-48 items-center justify-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" />
              모든 리소스를 검사하고 있습니다…
            </div>
          ) : invalidResources.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center p-8 text-center">
              <CheckCircle2 className="size-9 text-emerald-400" />
              <p className="mt-3 font-medium">모든 리소스를 사용할 수 있습니다</p>
              <p className="text-muted-foreground mt-1 text-sm">수정이 필요한 경로가 없습니다.</p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {invalidResources.map((resource) => {
                const validation = validations[resource.id];
                return (
                  <li key={resource.id} className="flex items-center gap-3 p-3">
                    <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-md">
                      <ResourceIcon
                        icon={resource.icon}
                        type={resource.type}
                        target={resource.target}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{resource.name}</span>
                      <span
                        className="text-muted-foreground block truncate text-xs"
                        title={resource.target}
                      >
                        {resource.target}
                      </span>
                      <span className="text-destructive mt-1 flex items-center gap-1 text-xs">
                        <ShieldAlert className="size-3" />
                        {validation?.message ?? "대상을 사용할 수 없습니다."}
                      </span>
                    </span>
                    <ResourceFormDialog
                      workspaceId={workspaceId}
                      resource={resource}
                      trigger={
                        <Button variant="secondary" className="h-8 shrink-0 px-3 text-xs">
                          경로 수정
                        </Button>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { AppWindow, File, Folder, Globe, type LucideIcon } from "lucide-react";

import { applicationScanApi } from "@/features/resources/applicationScanApi";
import { resourceTypeIcons } from "@/features/resources/resourcePresentation";
import { cn } from "@/lib/utils";
import type { ResourceType } from "@/types/resource";

const storedIconMap: Record<string, LucideIcon> = {
  "app-window": AppWindow,
  globe: Globe,
  folder: Folder,
  file: File,
};

const applicationIconCache = new Map<string, string | null>();
const applicationIconRequests = new Map<string, Promise<string | null>>();

function loadApplicationIcon(target: string) {
  const key = target.trim().toLocaleLowerCase();
  if (applicationIconCache.has(key)) {
    return Promise.resolve(applicationIconCache.get(key) ?? null);
  }

  const pendingRequest = applicationIconRequests.get(key);
  if (pendingRequest) return pendingRequest;

  const request = applicationScanApi
    .icon(target)
    .then((iconDataUrl) => {
      applicationIconCache.set(key, iconDataUrl);
      return iconDataUrl;
    })
    .finally(() => applicationIconRequests.delete(key));

  applicationIconRequests.set(key, request);
  return request;
}

export function ResourceIcon({
  icon,
  type,
  target,
  className = "size-5",
}: {
  icon: string | null;
  type: ResourceType;
  target?: string;
  className?: string;
}) {
  const [loadedIcon, setLoadedIcon] = useState<{
    target: string;
    dataUrl: string | null;
  } | null>(null);

  useEffect(() => {
    let isCurrent = true;

    if (type !== "application" || !target?.trim()) return () => undefined;

    void loadApplicationIcon(target)
      .then((iconDataUrl) => {
        if (isCurrent) setLoadedIcon({ target, dataUrl: iconDataUrl });
      })
      .catch(() => {
        if (isCurrent) setLoadedIcon({ target, dataUrl: null });
      });

    return () => {
      isCurrent = false;
    };
  }, [target, type]);

  const applicationIcon = loadedIcon && loadedIcon.target === target ? loadedIcon.dataUrl : null;

  if (applicationIcon) {
    return (
      <img
        src={applicationIcon}
        alt=""
        className={cn(className, "object-contain")}
        draggable={false}
      />
    );
  }

  const Icon = icon ? storedIconMap[icon] : resourceTypeIcons[type];
  if (Icon) return <Icon className={className} aria-hidden="true" />;
  return <span aria-hidden="true">{icon}</span>;
}

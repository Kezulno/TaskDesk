import { AppWindow, File, Folder, Globe } from "lucide-react";

import type { ResourceType } from "@/types/resource";

export const resourceSections: Array<{ type: ResourceType; title: string }> = [
  { type: "application", title: "Applications" },
  { type: "website", title: "Websites" },
  { type: "folder", title: "Folders" },
  { type: "file", title: "Files" },
];

export const resourceTypeLabels: Record<ResourceType, string> = {
  application: "애플리케이션",
  website: "웹사이트",
  folder: "폴더",
  file: "파일",
};

export const resourceTypeIcons = {
  application: AppWindow,
  website: Globe,
  folder: Folder,
  file: File,
} satisfies Record<ResourceType, typeof AppWindow>;

import { FolderKanban, type LucideIcon } from "lucide-react";

import { workspaceIcons } from "@/features/workspaces/workspaceAppearanceData";

const iconMap = Object.fromEntries(workspaceIcons.map((item) => [item.value, item.icon])) as Record<
  string,
  LucideIcon
>;

export function WorkspaceIcon({
  value,
  className = "size-5",
}: {
  value: string | null;
  className?: string;
}) {
  const Icon = value ? iconMap[value] : undefined;
  if (Icon) return <Icon className={className} aria-hidden="true" />;
  if (value) return <span aria-hidden="true">{value}</span>;
  return <FolderKanban className={className} aria-hidden="true" />;
}

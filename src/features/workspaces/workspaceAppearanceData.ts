import {
  BarChart3,
  BriefcaseBusiness,
  Code2,
  FolderKanban,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Palette,
  Rocket,
  Search,
  Shield,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const workspaceColors = [
  { value: "#6366f1", label: "인디고" },
  { value: "#8b5cf6", label: "보라" },
  { value: "#ec4899", label: "분홍" },
  { value: "#ef4444", label: "빨강" },
  { value: "#f97316", label: "주황" },
  { value: "#eab308", label: "노랑" },
  { value: "#22c55e", label: "초록" },
  { value: "#14b8a6", label: "청록" },
  { value: "#06b6d4", label: "하늘" },
  { value: "#3b82f6", label: "파랑" },
];

export const workspaceIcons: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "folder-kanban", label: "작업", icon: FolderKanban },
  { value: "briefcase", label: "업무", icon: BriefcaseBusiness },
  { value: "code", label: "개발", icon: Code2 },
  { value: "shield", label: "보안", icon: Shield },
  { value: "palette", label: "디자인", icon: Palette },
  { value: "rocket", label: "시작", icon: Rocket },
  { value: "graduation-cap", label: "학습", icon: GraduationCap },
  { value: "heart-pulse", label: "건강", icon: HeartPulse },
  { value: "bar-chart", label: "분석", icon: BarChart3 },
  { value: "gamepad", label: "게임", icon: Gamepad2 },
  { value: "wrench", label: "도구", icon: Wrench },
  { value: "search", label: "조사", icon: Search },
];

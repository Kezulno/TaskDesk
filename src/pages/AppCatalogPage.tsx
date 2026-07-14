import {
  AppWindow,
  BrainCircuit,
  Bot,
  Braces,
  BriefcaseBusiness,
  CheckCircle2,
  Cloud,
  Compass,
  Database,
  ExternalLink,
  Film,
  Globe,
  LibraryBig,
  MessagesSquare,
  Network,
  NotebookPen,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/FormField";
import { PageHeader } from "@/components/common/PageHeader";
import { catalogApi } from "@/features/catalog/catalogApi";
import {
  catalogApplications,
  catalogCategories,
  type CatalogApplication,
} from "@/features/catalog/catalogData";
import { useApplicationScanStore } from "@/features/resources/applicationScanStore";
import { DetectedApplicationIcon } from "@/features/resources/components/DetectedApplicationIcon";
import { useResourceStore } from "@/features/resources/resourceStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { cn } from "@/lib/utils";
import type { DetectedApplication } from "@/types/detectedApplication";
import { useI18n } from "@/features/i18n/i18n";

const categoryEnglishNames: Record<string, string> = {
  development: "Development",
  "ai-coding": "AI Coding",
  reversing: "Reverse Engineering",
  forensics: "Digital Forensics",
  security: "Security",
  ai: "AI",
  browsers: "Browsers",
  office: "Office & Documents",
  communication: "Communication",
  storage: "Files & Cloud",
  utilities: "Utilities",
  media: "Media & Design",
  notes: "Notes & Productivity",
  data: "Data",
};

const categoryEnglishDescriptions: Record<string, string> = {
  development: "Coding, version control, and API development",
  "ai-coding": "AI coding agents, editors, and IDE extensions",
  reversing: "Binary analysis and debugging",
  forensics: "Disk, memory, and network analysis",
  security: "Web, network, and cryptography tools",
  ai: "AI assistants, local models, and generation tools",
  browsers: "Web browsers and private browsing",
  office: "Office suites, PDF, and email tools",
  communication: "Messaging, meetings, and collaboration",
  storage: "File transfer, sync, and management",
  utilities: "Compression, system tools, and media playback",
  media: "Video, recording, and design tools",
  notes: "Notes, documents, and research",
  data: "Analysis, visualization, and data science",
};

const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  development: Braces,
  "ai-coding": Bot,
  browsers: Compass,
  office: BriefcaseBusiness,
  communication: MessagesSquare,
  storage: Cloud,
  utilities: Wrench,
  reversing: Search,
  forensics: Database,
  security: ShieldCheck,
  ai: BrainCircuit,
  media: Film,
  notes: NotebookPen,
  data: Network,
};

export function AppCatalogPage() {
  const { language, t } = useI18n();
  const [searchParams] = useSearchParams();
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const applications = useApplicationScanStore((state) => state.applications);
  const isScanning = useApplicationScanStore((state) => state.isScanning);
  const hasScanned = useApplicationScanStore((state) => state.hasScanned);
  const scanError = useApplicationScanStore((state) => state.error);
  const scanApplications = useApplicationScanStore((state) => state.scanApplications);
  const createResource = useResourceStore((state) => state.createResource);
  const [categoryId, setCategoryId] = useState(searchParams.get("category") ?? "all");
  const [resourceKind, setResourceKind] = useState<"all" | "application" | "website">("all");
  const [workspaceId, setWorkspaceId] = useState(searchParams.get("workspaceId") ?? "");
  const [query, setQuery] = useState("");
  const [addingIds, setAddingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!hasScanned) void scanApplications();
  }, [hasScanned, scanApplications]);

  const selectedWorkspaceId = workspaceId || workspaces[0]?.id || "";

  const installedByCatalogId = useMemo(() => {
    const entries = catalogApplications.map(
      (catalogApp) => [catalogApp.id, findInstalledApplication(catalogApp, applications)] as const,
    );
    return new Map(entries);
  }, [applications]);

  const filteredApps = catalogApplications.filter((catalogApp) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const categoryMatches = categoryId === "all" || catalogApp.categoryId === categoryId;
    const typeMatches = resourceKind === "all" || catalogApp.resourceType === resourceKind;
    const queryMatches =
      !normalizedQuery ||
      catalogApp.name.toLocaleLowerCase().includes(normalizedQuery) ||
      catalogApp.description.toLocaleLowerCase().includes(normalizedQuery) ||
      catalogApp.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery));
    return categoryMatches && typeMatches && queryMatches;
  });

  const addToWorkspace = async (catalogApp: CatalogApplication) => {
    if (!selectedWorkspaceId) {
      toast.error("먼저 작업 공간을 선택해 주세요.");
      return;
    }
    const installed = installedByCatalogId.get(catalogApp.id);
    const target =
      catalogApp.resourceType === "website" ? catalogApp.websiteTarget : installed?.executablePath;
    if (!target) {
      toast.error("설치된 앱을 찾지 못했습니다. 공식 사이트에서 설치 후 다시 검색해 주세요.");
      return;
    }

    setAddingIds((current) => [...current, catalogApp.id]);
    try {
      await createResource(selectedWorkspaceId, {
        type: catalogApp.resourceType,
        name: catalogApp.name,
        target,
        description: "TaskDeck 앱 카탈로그에서 추가됨",
        icon: catalogApp.resourceType === "application" ? "app-window" : "globe",
        isEnabled: true,
      });
      toast.success(`${catalogApp.name}을(를) 작업 공간에 추가했습니다.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "작업 공간에 추가하지 못했습니다.");
    } finally {
      setAddingIds((current) => current.filter((id) => id !== catalogApp.id));
    }
  };

  const openOfficialWebsite = async (catalogApp: CatalogApplication) => {
    try {
      await catalogApi.openOfficialWebsite(catalogApp.officialUrl);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "공식 사이트를 열지 못했습니다.");
    }
  };

  return (
    <div>
      <PageHeader
        title={t("catalog")}
        description={t("catalogDescription")}
      />
      <section className="space-y-6 p-8">
        <div className="border-border bg-card grid gap-4 rounded-xl border p-5 lg:grid-cols-[1fr_18rem_auto]">
          <label className="space-y-1.5 text-sm font-medium">
            {t("toolSearch")}
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {t("targetWorkspace")}
            <select
              className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              value={selectedWorkspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
            >
              <option value="">{t("selectWorkspace")}</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            className="self-end"
            onClick={() => void scanApplications(true)}
            disabled={isScanning}
          >
            <RefreshCw className={cn("size-4", isScanning && "animate-spin")} />
            {t("rescanInstalled")}
          </Button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <CategoryButton active={categoryId === "all"} onClick={() => setCategoryId("all")}>
              <LibraryBig className="size-4" />
              {t("all")}
            </CategoryButton>
            {catalogCategories.map((category) => {
              const Icon = categoryIcons[category.id] ?? AppWindow;
              return (
                <CategoryButton
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                  title={
                    language === "en"
                      ? categoryEnglishDescriptions[category.id]
                      : category.description
                  }
                >
                  <Icon className="size-4" />
                  {language === "en" ? categoryEnglishNames[category.id] : category.name}
                </CategoryButton>
              );
            })}
          </div>
          <div className="border-border bg-card flex rounded-lg border p-1">
            {(
              [
                ["all", t("all")],
                ["application", t("apps")],
                ["website", t("sites")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  resourceKind === value
                    ? "bg-indigo-500 text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setResourceKind(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {scanError && <p className="text-destructive text-sm">{scanError}</p>}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("recommendedTools", { count: filteredApps.length })}
          </p>
          {isScanning && (
            <span className="text-muted-foreground flex items-center gap-2 text-xs">
              <RefreshCw className="size-3.5 animate-spin" />
              {t("checkingInstalled")}
            </span>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredApps.map((catalogApp) => {
            const installed = installedByCatalogId.get(catalogApp.id);
            const canAdd = catalogApp.resourceType === "website" || Boolean(installed?.valid);
            const isAdding = addingIds.includes(catalogApp.id);
            return (
              <article key={catalogApp.id} className="border-border bg-card rounded-xl border p-5">
                <div className="flex items-start gap-3">
                  <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-lg">
                    {installed ? (
                      <DetectedApplicationIcon executablePath={installed.executablePath} />
                    ) : catalogApp.resourceType === "website" ? (
                      <Globe className="size-5 text-cyan-400" />
                    ) : (
                      <AppWindow className="text-muted-foreground size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold">{catalogApp.name}</h2>
                      {installed?.valid ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          {t("installed")}
                        </span>
                      ) : catalogApp.resourceType === "website" ? (
                        <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-400">
                          {t("webTool")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground bg-secondary shrink-0 rounded-full px-2 py-0.5 text-xs">
                          {t("notInstalled")}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {language === "en"
                        ? t(
                            catalogApp.resourceType === "application"
                              ? "genericAppDescription"
                              : "genericWebsiteDescription",
                          )
                        : catalogApp.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {catalogApp.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-secondary text-muted-foreground rounded px-2 py-1 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {installed && (
                  <p
                    className="text-muted-foreground mt-3 truncate text-xs"
                    title={installed.executablePath}
                  >
                    {installed.executablePath}
                  </p>
                )}
                {catalogApp.privacyNotice && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-xs text-amber-300">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                    {catalogApp.privacyNotice}
                  </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    className="px-3"
                    onClick={() => void openOfficialWebsite(catalogApp)}
                  >
                    <ExternalLink className="size-4" />
                    {t("officialSite")}
                  </Button>
                  <Button
                    className="px-3"
                    onClick={() => void addToWorkspace(catalogApp)}
                    disabled={!canAdd || !selectedWorkspaceId || isAdding}
                  >
                    {isAdding ? t("adding") : t("addToWorkspace")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CategoryButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "border-border hover:bg-accent flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
        active && "border-indigo-400/50 bg-indigo-500/15 text-indigo-300",
        className,
      )}
      {...props}
    />
  );
}

function findInstalledApplication(
  catalogApp: CatalogApplication,
  applications: DetectedApplication[],
) {
  if (catalogApp.resourceType !== "application") return undefined;
  const executableNames = new Set(
    catalogApp.executableNames?.map((name) => name.toLocaleLowerCase()),
  );
  return applications.find((application) => {
    if (!application.valid) return false;
    const normalizedPath = application.executablePath.replaceAll("/", "\\").toLocaleLowerCase();
    const fileName = normalizedPath.split("\\").at(-1) ?? "";
    return (
      executableNames.has(fileName) ||
      catalogApp.pathFragments?.some((fragment) =>
        normalizedPath.includes(fragment.toLocaleLowerCase()),
      )
    );
  });
}

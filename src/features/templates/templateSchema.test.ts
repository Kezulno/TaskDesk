import { describe, expect, it } from "vitest";

import { workspaceTemplateSchema } from "@/features/templates/templateSchema";

function validTemplate() {
  return {
    schemaVersion: 1,
    name: "Security tools",
    description: null,
    author: "TaskDeck User",
    category: "security",
    exportedAt: "2026-09-04T00:00:00.000Z",
    workspace: {
      name: "Analysis",
      description: null,
      icon: "shield",
      color: "#6366f1",
    },
    resources: [
      {
        type: "website",
        name: "Reference",
        target: "https://example.com",
        icon: null,
        description: null,
        launchOrder: 0,
        isEnabled: true,
      },
    ],
  };
}

describe("workspace template schema", () => {
  it("accepts a supported template", () => {
    expect(workspaceTemplateSchema.safeParse(validTemplate()).success).toBe(true);
  });

  it("rejects unsafe website protocols and unknown resource types", () => {
    const unsafeUrl = validTemplate();
    unsafeUrl.resources[0].target = "javascript:alert(1)";
    expect(workspaceTemplateSchema.safeParse(unsafeUrl).success).toBe(false);

    const missingHost = validTemplate();
    missingHost.resources[0].target = "https:///missing-host";
    expect(workspaceTemplateSchema.safeParse(missingHost).success).toBe(false);

    const unknownType = validTemplate();
    unknownType.resources[0].type = "script";
    expect(workspaceTemplateSchema.safeParse(unknownType).success).toBe(false);
  });

  it("rejects unknown fields and more than 200 resources", () => {
    expect(
      workspaceTemplateSchema.safeParse({ ...validTemplate(), command: "calc.exe" }).success,
    ).toBe(false);
    const oversized = validTemplate();
    oversized.resources = Array.from({ length: 201 }, (_, index) => ({
      ...oversized.resources[0],
      name: `Resource ${index}`,
      launchOrder: index,
    }));
    expect(workspaceTemplateSchema.safeParse(oversized).success).toBe(false);
  });

  it("rejects a workspace color that is not a hex color", () => {
    const unsafeColor = validTemplate();
    unsafeColor.workspace.color = "url(file:///C:/secret)";
    expect(workspaceTemplateSchema.safeParse(unsafeColor).success).toBe(false);
  });
});

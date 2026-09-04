import { describe, expect, it } from "vitest";

import { workspaceFormSchema } from "@/features/workspaces/workspaceForm";

const baseWorkspace = {
  name: "Development",
  description: "",
  icon: "code",
  color: "#6366f1",
};

describe("workspace form schema", () => {
  it("trims and validates a workspace name", () => {
    expect(workspaceFormSchema.parse({ ...baseWorkspace, name: "  Development  " }).name).toBe(
      "Development",
    );
    expect(workspaceFormSchema.safeParse({ ...baseWorkspace, name: "   " }).success).toBe(false);
  });

  it("allows an empty color but rejects arbitrary CSS values", () => {
    expect(workspaceFormSchema.safeParse({ ...baseWorkspace, color: "" }).success).toBe(true);
    expect(
      workspaceFormSchema.safeParse({ ...baseWorkspace, color: "url(file:///C:/secret)" }).success,
    ).toBe(false);
  });
});

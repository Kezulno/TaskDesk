import { describe, expect, it } from "vitest";

import { isValidHexColor, isValidHttpUrl } from "@/lib/validation";

describe("shared input validation", () => {
  it("requires an explicit HTTP(S) host", () => {
    expect(isValidHttpUrl("https://example.com/path")).toBe(true);
    expect(isValidHttpUrl("HTTP://localhost:3000")).toBe(true);
    expect(isValidHttpUrl("https:///missing-host")).toBe(false);
    expect(isValidHttpUrl("file:///C:/Windows/win.ini")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });

  it("accepts only six-digit hex colors", () => {
    expect(isValidHexColor("#6366f1")).toBe(true);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("url(file:///C:/secret)")).toBe(false);
  });
});

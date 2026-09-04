import { describe, expect, it } from "vitest";

import {
  DEFAULT_LAUNCH_INTERVAL_MS,
  MAX_LAUNCH_INTERVAL_MS,
  normalizeLaunchInterval,
  parseLaunchInterval,
} from "@/features/settings/launchInterval";

describe("launch interval", () => {
  it("accepts only whole milliseconds inside the supported range", () => {
    expect(parseLaunchInterval("0")).toBe(0);
    expect(parseLaunchInterval(" 1250 ")).toBe(1_250);
    expect(parseLaunchInterval("5000")).toBe(MAX_LAUNCH_INTERVAL_MS);
    expect(parseLaunchInterval("")).toBeNull();
    expect(parseLaunchInterval("1.5")).toBeNull();
    expect(parseLaunchInterval("5001")).toBeNull();
  });

  it("normalizes programmatic values without allowing invalid numbers", () => {
    expect(normalizeLaunchInterval(-10)).toBe(0);
    expect(normalizeLaunchInterval(1_250.4)).toBe(1_250);
    expect(normalizeLaunchInterval(10_000)).toBe(MAX_LAUNCH_INTERVAL_MS);
    expect(normalizeLaunchInterval(Number.NaN)).toBe(DEFAULT_LAUNCH_INTERVAL_MS);
  });
});

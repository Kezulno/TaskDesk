export const DEFAULT_LAUNCH_INTERVAL_MS = 500;
export const MAX_LAUNCH_INTERVAL_MS = 5_000;

export function normalizeLaunchInterval(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LAUNCH_INTERVAL_MS;
  return Math.min(MAX_LAUNCH_INTERVAL_MS, Math.max(0, Math.round(value)));
}

export function parseLaunchInterval(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_LAUNCH_INTERVAL_MS
    ? parsed
    : null;
}

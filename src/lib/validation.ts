export function isValidHttpUrl(target: string): boolean {
  const separatorIndex = target.indexOf("://");
  if (separatorIndex < 0 || target.slice(separatorIndex + 3).startsWith("/")) return false;
  try {
    const url = new URL(target);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color);
}

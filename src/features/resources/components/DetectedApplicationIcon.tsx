import { AppWindow } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { applicationScanApi } from "@/features/resources/applicationScanApi";

const iconCache = new Map<string, string | null>();

export function DetectedApplicationIcon({ executablePath }: { executablePath: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [icon, setIcon] = useState<string | null>(
    () => iconCache.get(executablePath.toLocaleLowerCase()) ?? null,
  );

  useEffect(() => {
    const element = containerRef.current;
    const key = executablePath.toLocaleLowerCase();
    if (!element || !executablePath || iconCache.has(key)) return;

    let active = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void applicationScanApi
          .icon(executablePath)
          .then((dataUrl) => {
            iconCache.set(key, dataUrl);
            if (active) setIcon(dataUrl);
          })
          .catch(() => iconCache.set(key, null));
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [executablePath]);

  return (
    <span ref={containerRef} className="flex size-6 shrink-0 items-center justify-center">
      {icon ? (
        <img src={icon} alt="" className="size-6 object-contain" draggable={false} />
      ) : (
        <AppWindow className="text-muted-foreground size-5" />
      )}
    </span>
  );
}

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground focus:ring-ring h-9 w-full rounded-md border px-3 text-sm transition-shadow outline-none focus:ring-2 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground focus:ring-ring min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm transition-shadow outline-none focus:ring-2 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

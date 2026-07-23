import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "ghost";
}

export function Button({ className, type = "button", variant = "default", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "focus-visible:ring-ring inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "destructive" && "bg-destructive hover:bg-destructive/90 text-white",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

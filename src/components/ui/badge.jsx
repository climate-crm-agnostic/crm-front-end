import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variant === "default" &&
          "bg-primary/10 text-primary-text ring-primary/20 dark:bg-primary/40",
        variant === "secondary" &&
          "bg-muted text-foreground ring-border",
        variant === "outline" &&
          "bg-transparent text-muted-foreground ring-border",
        variant === "success" &&
          "bg-green-100 text-green-700 ring-green-200 dark:bg-green-500/15 dark:text-green-400 dark:ring-green-500/30",
        variant === "destructive" &&
          "bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/30",
        className
      )}
      {...props}
    />
  );
}

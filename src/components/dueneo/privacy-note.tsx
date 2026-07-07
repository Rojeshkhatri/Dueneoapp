"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

/**
 * Privacy note shown near tool input areas. Reusable across all tools,
 * per DUENEO_BIBLE section 2.2.
 */
export function PrivacyNote({
  level = "file",
  className,
  children,
}: {
  level?: "file" | "sensitive" | "standard";
  className?: string;
  children?: React.ReactNode;
}) {
  const note =
    level === "sensitive"
      ? "This is a sensitive tool. Your input is processed locally and never leaves your device — not even temporarily."
      : level === "file"
      ? "Your file is processed locally in your browser. It is not uploaded to Dueneo."
      : "Your input is processed locally in your browser. It is not uploaded to Dueneo.";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300",
        className
      )}
      role="note"
    >
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none" />
      <span>{children ?? note}</span>
    </div>
  );
}

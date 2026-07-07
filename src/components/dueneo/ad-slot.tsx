"use client";

import { cn } from "@/lib/utils";

/**
 * Network-agnostic ad slot, per DUENEO_BIBLE 8.3.
 *
 * In production this component would decide which ad network to invoke
 * based on placement, category and consent. In this build we render a
 * reserved-height placeholder so the layout never shifts when ads load
 * (per 12.2) and so that the page is still useful if ads are disabled.
 */
export function AdSlot({
  id,
  placement,
  className,
  label = "Advertisement",
}: {
  id: string;
  placement: "after-tool" | "after-content" | "after-game" | "homepage" | "category";
  className?: string;
  label?: string;
}) {
  // Reserve height by placement to prevent layout shift.
  const heightClass =
    placement === "after-tool" || placement === "after-game"
      ? "min-h-[90px]"
      : placement === "homepage" || placement === "category"
      ? "min-h-[120px]"
      : "min-h-[100px]";

  return (
    <div
      id={id}
      data-ad-placement={placement}
      aria-label="Advertisement"
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground",
        heightClass,
        className
      )}
    >
      {label} · reserved space
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ADSENSE } from "@/lib/dueneo/adsense";

type Placement = "after-tool" | "after-content" | "after-game" | "homepage" | "category";

/**
 * Ad slot that renders a real Google AdSense unit when configured,
 * or a reserved-height placeholder when not.
 */
export function AdSlot({
  id,
  placement,
  className,
  label = "Advertisement",
}: {
  id: string;
  placement: Placement;
  className?: string;
  label?: string;
}) {
  const heightClass =
    placement === "after-tool" || placement === "after-game"
      ? "min-h-[90px]"
      : placement === "homepage" || placement === "category"
      ? "min-h-[120px]"
      : "min-h-[100px]";

  const slotId = ADSENSE.slots[placement];
  const isConfigured = Boolean(ADSENSE.publisherId && slotId);

  React.useEffect(() => {
    if (!isConfigured) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {}
  }, [isConfigured]);

  if (!isConfigured) {
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

  return (
    <div
      id={id}
      data-ad-placement={placement}
      aria-label="Advertisement"
      className={cn("flex items-center justify-center overflow-hidden", className)}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE.publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

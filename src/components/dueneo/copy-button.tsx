"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "sm",
  variant = "outline",
}: {
  value: string | (() => string | Promise<string>);
  label?: string;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "secondary" | "ghost" | "default";
}) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      const v = typeof value === "function" ? await value() : value;
      if (!v) {
        toast.error("Nothing to copy yet.");
        return;
      }
      await navigator.clipboard.writeText(v);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — please copy manually.");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size === "icon" ? "icon" : size}
      onClick={onCopy}
      className={cn(className)}
      aria-label={size === "icon" ? "Copy to clipboard" : undefined}
    >
      {copied ? (
        <Check className={size === "icon" ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5"} />
      ) : (
        <Copy className={size === "icon" ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5"} />
      )}
      {size !== "icon" && (copied ? "Copied" : label)}
    </Button>
  );
}

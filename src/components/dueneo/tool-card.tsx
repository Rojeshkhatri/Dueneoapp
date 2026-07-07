"use client";

import { RouterLink } from "@/lib/dueneo/router";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type ToolDefinition,
} from "@/data/tools";
import { getCategory } from "@/data/categories";
import { ArrowRight } from "lucide-react";

export function ToolCard({ tool, className }: { tool: ToolDefinition; className?: string }) {
  const category = getCategory(tool.category);
  return (
    <RouterLink
      to={`/${tool.slug}`}
      className={cn(
        "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl",
        className
      )}
    >
      <Card className="h-full p-4 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{tool.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.summary}</p>
          </div>
          {category && (
            <span
              className={cn(
                "flex-none rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                category.accent,
                category.color
              )}
            >
              {category.slug}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{tool.difficulty}</span>
          <span className="inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Card>
    </RouterLink>
  );
}

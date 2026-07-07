"use client";

import { ChevronRight, Home } from "lucide-react";
import { RouterLink } from "@/lib/dueneo/router";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-sm text-muted-foreground", className)}
    >
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <RouterLink
            to="/"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Home</span>
          </RouterLink>
        </li>
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {c.to ? (
              <RouterLink to={c.to} className="hover:text-foreground">
                {c.label}
              </RouterLink>
            ) : (
              <span className="text-foreground" aria-current="page">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

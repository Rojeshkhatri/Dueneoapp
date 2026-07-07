"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { Wrench } from "lucide-react";
import { RouterLink } from "@/lib/dueneo/router";
import { getCategory } from "@/data/categories";
import type { ToolDefinition } from "@/data/tools";
import { RelatedTools } from "./related-items";
import { PrivacyNote } from "./privacy-note";
import { Button } from "@/components/ui/button";

export function ComingSoonTool({ tool }: { tool: ToolDefinition }) {
  const category = getCategory(tool.category);
  const crumbs = category
    ? [
        { label: category.name, to: `/${category.route}` },
        { label: tool.name },
      ]
    : [{ label: tool.name }];

  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={crumbs} />
      <div className="mt-10 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Wrench className="h-3 w-3" /> Coming soon
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
        <p className="mt-3 text-muted-foreground">{tool.summary}</p>
        <div className="mt-6">
          <PrivacyNote level={tool.privacyLevel} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          This tool is part of Dueneo&apos;s planned registry but hasn&apos;t
          shipped yet. It will run 100% in your browser — no upload, no
          signup — once it&apos;s ready.
        </p>
        <div className="mt-6 flex gap-2">
          {category && (
            <Button asChild variant="outline" size="sm">
              <RouterLink to={`/${category.route}`}>Back to {category.name}</RouterLink>
            </Button>
          )}
          <Button asChild size="sm">
            <RouterLink to="/">Back home</RouterLink>
          </Button>
        </div>
      </div>
      <div className="mt-12">
        <RelatedTools tool={tool} />
      </div>
    </main>
  );
}

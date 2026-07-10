"use client";

import { RouterLink } from "@/lib/dueneo/router";
import { ToolCard } from "./tool-card";
import { GameCard } from "./game-card";
import { Card } from "@/components/ui/card";
import { ArrowRight, Wrench, Gamepad2 } from "lucide-react";
import { getRelatedTools, type ToolDefinition } from "@/data/tools";
import { getRelatedGames, type GameDefinition } from "@/data/games";
import { getCategory } from "@/data/categories";

/**
 * Related-links section used on tool and game pages.
 * Per DUENEO_BIBLE 11.10: 3-6 related items per page.
 */
export function RelatedItems({
  items,
  kind,
  title,
  viewAllTo,
}: {
  items: ToolDefinition[] | GameDefinition[];
  kind: "tool" | "game";
  title?: string;
  viewAllTo: string;
}) {
  if (items.length === 0) return null;
  const heading = title ?? (kind === "tool" ? "Related tools" : "Related games");
  return (
    <section aria-label={heading} className="scroll-mt-20">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {kind === "tool" ? <Wrench className="h-5 w-5 text-primary" /> : <Gamepad2 className="h-5 w-5 text-primary" />}
          {heading}
        </h2>
        <RouterLink
          to={viewAllTo}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </RouterLink>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map((item) =>
          kind === "tool" ? (
            <ToolCard key={item.slug} tool={item as ToolDefinition} />
          ) : (
            <GameCard key={item.slug} game={item as GameDefinition} />
          )
        )}
      </div>
    </section>
  );
}

export function RelatedTools({ tool }: { tool: ToolDefinition }) {
  const category = getCategory(tool.category);
  return (
    <RelatedItems
      kind="tool"
      items={getRelatedTools(tool)}
      viewAllTo={category ? `/${category.route}` : "/tools"}
    />
  );
}

export function RelatedGames({ game }: { game: GameDefinition }) {
  return <RelatedItems kind="game" items={getRelatedGames(game)} viewAllTo="/games" />;
}

/**
 * Placeholder card shown when a tool/game is in the registry but not
 * yet implemented in this build.
 */
export function ComingSoonCard({ name, summary }: { name: string; summary: string }) {
  return (
    <Card className="relative h-full overflow-hidden p-4 opacity-70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{summary}</p>
        </div>
        <span className="flex-none rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      </div>
    </Card>
  );
}

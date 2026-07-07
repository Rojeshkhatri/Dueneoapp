"use client";

import { RouterLink } from "@/lib/dueneo/router";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GameDefinition } from "@/data/games";
import { ArrowRight } from "lucide-react";

export function GameCard({ game, className }: { game: GameDefinition; className?: string }) {
  return (
    <RouterLink
      to={`/games/${game.slug}`}
      className={cn(
        "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl",
        className
      )}
    >
      <Card className="relative h-full overflow-hidden p-4 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-lg", game.accent)}>
              <game.icon className={cn("h-5 w-5", game.color)} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{game.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{game.summary}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("rounded px-1.5 py-0.5 font-medium", game.accent, game.color)}>
              {game.difficulty}
            </span>
            <span className="text-muted-foreground">{game.playTime}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Play <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Card>
    </RouterLink>
  );
}

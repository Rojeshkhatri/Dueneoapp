"use client";

import * as React from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { AdSlot } from "./ad-slot";
import { FAQ, type QA } from "./faq";
import { RelatedGames } from "./related-items";
import type { GameDefinition } from "@/data/games";
import { gameStructuredData } from "@/lib/dueneo/seo";
import { Gamepad2, Keyboard, Smartphone } from "lucide-react";
import { usePageMetadata } from "@/lib/dueneo/client-metadata";

export interface GameContent {
  intro: React.ReactNode;
  game: React.ReactNode;
  rules: React.ReactNode;
  tips?: React.ReactNode;
  controls?: React.ReactNode;
  faq: QA[];
}

export function GameLayout({ game, content }: { game: GameDefinition; content: GameContent }) {
  const crumbs: Crumb[] = [
    { label: "Games", to: "/games" },
    { label: game.name },
  ];

  usePageMetadata({
    title: game.seoTitle,
    description: game.metaDescription,
    pathname: `/games/${game.slug}`,
  });

  React.useEffect(() => {
    const data = gameStructuredData(game);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [game]);

  return (
    <article className="dueneo-container py-6 sm:py-10">
      <Breadcrumbs items={crumbs} />

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full ${game.accent} px-2.5 py-0.5 text-xs font-medium ${game.color}`}>
            <Gamepad2 className="h-3 w-3" /> Game
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {game.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {game.playTime}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{game.name}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{content.intro}</p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-primary" /> Mobile-friendly
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5 text-emerald-500" /> Keyboard support
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Gamepad2 className="h-3.5 w-3.5 text-violet-500" /> No installs
          </li>
        </ul>
      </header>

      <section aria-label={`${game.name} board`} className="mt-6">
        {content.game}
      </section>

      <div className="mt-10">
        <AdSlot id="ad-after-game" placement="after-game" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <section aria-label="How to play" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold tracking-tight">How to play</h2>
            <div className="mt-4 text-sm leading-relaxed text-muted-foreground">{content.rules}</div>
          </section>
          {content.tips && (
            <section aria-label="Strategy tips" className="scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight">Strategy tips</h2>
              <div className="mt-4 text-sm leading-relaxed text-muted-foreground">{content.tips}</div>
            </section>
          )}
          {content.controls && (
            <section aria-label="Controls" className="scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight">Controls</h2>
              <div className="mt-4 text-sm leading-relaxed text-muted-foreground">{content.controls}</div>
            </section>
          )}
        </div>
        <aside className="space-y-6">
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <h3 className="font-semibold">About this game</h3>
            <p className="mt-2 text-muted-foreground">
              Lightweight, browser-based, and runs entirely on your device. No
              accounts, no servers, no installs.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <FAQ items={content.faq} />
      </div>

      <div className="mt-10">
        <AdSlot id="ad-after-content" placement="after-content" />
      </div>

      <div className="mt-12">
        <RelatedGames game={game} />
      </div>
    </article>
  );
}

"use client";

import * as React from "react";
import { RouterLink } from "@/lib/dueneo/router";
import { SearchBox } from "@/components/dueneo/search-box";
import { categories } from "@/data/categories";
import { tools } from "@/data/tools";
import { games } from "@/data/games";
import { ToolCard } from "@/components/dueneo/tool-card";
import { GameCard } from "@/components/dueneo/game-card";
import { AdSlot } from "@/components/dueneo/ad-slot";
import { websiteStructuredData, organizationStructuredData } from "@/lib/dueneo/seo";
import {
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  ArrowRight,
  Gamepad2,
} from "lucide-react";
import { usePageMetadata } from "@/lib/dueneo/client-metadata";

const popularToolSlugs = [
  "image-compressor",
  "pdf-merge",
  "json-formatter",
  "password-generator",
  "invoice-generator",
  "qr-code-generator",
  "word-counter",
  "color-picker",
  "base64-encoder",
  "unit-converter",
  "uuid-generator",
  "regex-tester",
];

const popularGameSlugs = ["sudoku", "2048", "minesweeper", "tic-tac-toe", "memory-match", "connect-four"];

export function HomePage() {
  usePageMetadata({
    title: "Dueneo — Free Browser Tools & Classic Games",
    description:
      "Fast, private browser-based tools for images, PDFs, developers, text, business, finance, design, and SEO — plus lightweight classic games.",
    pathname: "/",
  });
  const popularTools = popularToolSlugs
    .map((s) => tools.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const popularGames = popularGameSlugs
    .map((s) => games.find((g) => g.slug === s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const implementedTools = tools.filter((t) => t.implemented);
  const implementedGames = games.filter((g) => g.implemented);
  const categoryStats = categories.map((category) => ({
    ...category,
    count:
      category.slug === "games"
        ? implementedGames.length
        : implementedTools.filter((tool) => tool.category === category.slug).length,
  }));
  const toolCategoryCount = categories.filter((category) => category.slug !== "games").length;

  const websiteJsonLd = websiteStructuredData();
  const orgJsonLd = organizationStructuredData();

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* HERO */}
      <section className="relative border-b bg-gradient-to-b from-muted/40 to-background">
        <div className="dueneo-container py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              {implementedTools.length} tools · {implementedGames.length} games · all browser-only
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Free browser tools &<br className="hidden sm:block" /> classic games.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Fast, private browser-based tools for images, PDFs, developers,
              text, business, finance, design and SEO — plus lightweight
              classic games you can play instantly. No uploads, no signup.
            </p>
            <div className="mx-auto mt-7 max-w-2xl">
              <SearchBox variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="dueneo-container py-12 sm:py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {toolCategoryCount} tool categories plus a games arcade — pick what you need.
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <RouterLink
              key={c.slug}
              to={`/${c.route}`}
              className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.accent}`}>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Browse <ArrowRight className="h-3 w-3" />
              </span>
            </RouterLink>
          ))}
        </div>
      </section>

      {/* POPULAR TOOLS */}
      <section className="border-y bg-muted/20 py-12 sm:py-16">
        <div className="dueneo-container">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                <Sparkles className="h-5 w-5 text-primary" /> Popular tools
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The most useful utilities, all running locally in your browser.
              </p>
            </div>
            <RouterLink
              to="/tools"
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              View all tools <ArrowRight className="h-3.5 w-3.5" />
            </RouterLink>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popularTools.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY EXPLAINER */}
      <section className="dueneo-container py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Most Dueneo tools run locally in your browser.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your files and data stay on your device. We don&apos;t upload
              tool input, we don&apos;t log your data, and we don&apos;t
              require an account. Ads, when shown, never see your tool input.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <span>
                  <strong>Private by default.</strong> Tool input never leaves
                  your browser unless you choose to download the result.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <span>
                  <strong>Fast.</strong> Static, lightweight pages built for
                  Core Web Vitals. No server processing for your tool input.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <span>
                  <strong>Trustworthy.</strong> No accounts, no dark patterns,
                  no paywalls. Just useful tools that respect your data.
                </span>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categoryStats.map((c) => (
              <RouterLink
                key={c.slug}
                to={`/${c.route}`}
                className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <div className="mt-3 text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.count} available</div>
              </RouterLink>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR GAMES */}
      <section className="border-t bg-muted/20 py-12 sm:py-16">
        <div className="dueneo-container">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                <Gamepad2 className="h-5 w-5 text-indigo-500" /> Classic games
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lightweight, instant, no installs. Perfect for a quick break.
              </p>
            </div>
            <RouterLink
              to="/games"
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              All games <ArrowRight className="h-3.5 w-3.5" />
            </RouterLink>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popularGames.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </div>
      </section>

      <div className="dueneo-container py-12">
        <AdSlot id="ad-homepage" placement="homepage" label="Sponsored" />
      </div>
    </main>
  );
}

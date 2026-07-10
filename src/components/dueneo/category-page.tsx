"use client";

import * as React from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { ToolCard } from "./tool-card";
import { GameCard } from "./game-card";
import { SearchBox } from "./search-box";
import { AdSlot } from "./ad-slot";
import { FAQ } from "./faq";
import type { QA } from "./faq";
import { RouterLink } from "@/lib/dueneo/router";
import type { Category } from "@/data/categories";
import { tools, getToolsByCategory } from "@/data/tools";
import { games } from "@/data/games";
import { categories } from "@/data/categories";
import { categoryStructuredData, faqStructuredData } from "@/lib/dueneo/seo";
import { ArrowRight, Filter } from "lucide-react";
import { ComingSoonCard } from "./related-items";
import { usePageMetadata } from "@/lib/dueneo/client-metadata";

export function CategoryPage({ category }: { category: Category }) {
  const [query, setQuery] = React.useState("");

  const isGames = category.slug === "games";

  const items = isGames ? games : getToolsByCategory(category.slug as Exclude<Category["slug"], "games">);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) =>
      `${item.name} ${"summary" in item ? item.summary : ""} ${"keywords" in item ? (item as { keywords?: string[] }).keywords?.join(" ") : ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  // Adjacent categories (excluding self).
  const adjacent = categories.filter((c) => c.slug !== category.slug).slice(0, 6);

  const faqItems: QA[] = [
    {
      q: `Are these ${category.name.toLowerCase()} free to use?`,
      a: `Yes. Every ${category.name.toLowerCase().replace(" tools", "").replace(" games", "")} ${isGames ? "game" : "tool"} on Dueneo is completely free. There is no signup, no account and no hidden paywall.`,
    },
    {
      q: "Do my files leave my browser?",
      a: "No. All Dueneo tools process your data locally in your browser. Your files and inputs are never uploaded to Dueneo or any third party.",
    },
    {
      q: "Do these tools work on mobile?",
      a: "Yes. Dueneo is mobile-first and works in modern mobile browsers including Mobile Safari and Chrome on Android.",
    },
    {
      q: "Do I need to install anything?",
      a: "No. Everything runs directly in your browser. Just open the page and start using the tool or playing the game.",
    },
  ];

  usePageMetadata({
    title: `Free ${category.name} — Browser-Based Utilities`,
    description: category.longDescription,
    pathname: `/${category.route}`,
  });

  const catJsonLd = categoryStructuredData(category);
  const faqJsonLd = faqStructuredData(
    faqItems.filter((item): item is { q: string; a: string } => typeof item.a === "string"),
    `https://dueneo.com/${category.route}/`
  );

  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Breadcrumbs items={[{ label: category.name }]} />

      <header className="mt-4">
        <div className="flex items-start gap-4">
          <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${category.accent}`}>
            <category.icon className={`h-6 w-6 ${category.color}`} />
          </span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{category.name}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{category.longDescription}</p>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {filtered.length} {isGames ? "games" : "tools"} available
        </div>
        <div className="w-full sm:w-80">
          <SearchBox variant="default" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) =>
          isGames ? (
            <GameCard key={item.slug} game={item as typeof games[number]} />
          ) : (
            <ToolCard key={item.slug} tool={item as typeof tools[number]} />
          )
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No {isGames ? "games" : "tools"} match “{query}”. Try a different search.
        </div>
      )}

      <div className="mt-12">
        <AdSlot id="ad-category" placement="category" />
      </div>

      {/* Adjacent categories */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Other categories</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {adjacent.map((c) => (
            <RouterLink
              key={c.slug}
              to={`/${c.route}`}
              className="group rounded-xl border bg-card p-3 text-center transition-all hover:border-primary/40 hover:shadow-md"
            >
              <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg ${c.accent}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </span>
              <div className="mt-2 truncate text-xs font-medium">{c.name}</div>
            </RouterLink>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <FAQ items={faqItems} />
      </div>
    </main>
  );
}

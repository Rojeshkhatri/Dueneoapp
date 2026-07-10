"use client";

import * as React from "react";
import { Search, Star, Trash2, Wrench } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { RouterLink } from "@/lib/dueneo/router";
import { categories, getCategory } from "@/data/categories";
import { tools, type ToolDefinition } from "@/data/tools";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  clearRecentTools,
  toggleFavoriteTool,
  useToolLibrary,
} from "@/lib/dueneo/tool-library";
import { usePageMetadata } from "@/lib/dueneo/client-metadata";

type View = "all" | "favorites" | "recent";

export function AllToolsPage() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [view, setView] = React.useState<View>("all");
  const library = useToolLibrary();

  usePageMetadata({
    title: "All Free Browser Tools — Dueneo",
    description:
      "Browse and filter all free Dueneo image, PDF, developer, business, finance, design, SEO, utility and creator tools.",
    pathname: "/tools",
  });

  const visibleTools = React.useMemo(() => {
    const implemented = tools.filter((tool) => tool.implemented);
    const ordered = view === "recent"
      ? library.recent.flatMap((slug) => implemented.filter((tool) => tool.slug === slug))
      : view === "favorites"
        ? library.favorites.flatMap((slug) => implemented.filter((tool) => tool.slug === slug))
        : implemented.toSorted((a, b) => a.name.localeCompare(b.name));
    const needle = query.trim().toLowerCase();
    return ordered.filter((tool) => {
      const categoryMatch = category === "all" || tool.category === category;
      const searchMatch = !needle || `${tool.name} ${tool.summary} ${tool.keywords.join(" ")}`.toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [category, library.favorites, library.recent, query, view]);

  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={[{ label: "All tools" }]} />
      <header className="mt-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wrench className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">All browser tools</h1>
            <p className="mt-1 text-muted-foreground">
              Search and filter {tools.filter((tool) => tool.implemented).length} private, browser-based utilities.
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Tool filters" className="mt-6 rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="relative">
            <span className="sr-only">Search all tools</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by task, input, or output…"
              className="pl-9"
            />
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All categories</SelectItem>
                {categories
                  .filter((item) => item.slug !== "games")
                  .map((item) => (
                    <SelectItem key={item.slug} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["all", "favorites", "recent"] as View[]).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={view === item ? "default" : "outline"}
              onClick={() => setView(item)}
            >
              {item === "all" ? "All tools" : item === "favorites" ? `Favorites (${library.favorites.length})` : `Recent (${library.recent.length})`}
            </Button>
          ))}
          {view === "recent" && library.recent.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={clearRecentTools}>
              <Trash2 data-icon="inline-start" /> Clear recent
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{visibleTools.length} shown</span>
        </div>
      </section>

      {visibleTools.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleTools.map((tool) => (
            <LibraryToolCard
              key={tool.slug}
              tool={tool}
              favorite={library.favorites.includes(tool.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No matching tools</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another search or category, or return to All tools.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setView("all");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
    </main>
  );
}

function LibraryToolCard({ tool, favorite }: { tool: ToolDefinition; favorite: boolean }) {
  const category = getCategory(tool.category);
  return (
    <Card className="relative h-full p-4 transition-all hover:border-primary/40 hover:shadow-md">
      <RouterLink
        to={`/${tool.slug}`}
        className="block rounded-md pr-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <h2 className="text-sm font-semibold">{tool.name}</h2>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.summary}</p>
        {category && <p className="mt-3 text-xs font-medium text-primary">{category.name}</p>}
      </RouterLink>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
        aria-pressed={favorite}
        onClick={() => toggleFavoriteTool(tool.slug)}
        className="absolute right-2 top-2 size-8"
      >
        <Star className={cn(favorite && "fill-current text-primary")} />
      </Button>
    </Card>
  );
}

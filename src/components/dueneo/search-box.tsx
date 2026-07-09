"use client";

import * as React from "react";
import { Search, X, CornerDownLeft, Hash, Gamepad2 } from "lucide-react";
import { tools, searchTools } from "@/data/tools";
import { games } from "@/data/games";
import { RouterLink, useRouter } from "@/lib/dueneo/router";
import { categories, getCategory } from "@/data/categories";
import { cn } from "@/lib/utils";

interface SearchHit {
  type: "tool" | "game" | "category";
  label: string;
  description: string;
  href: string;
  category?: string;
}

function searchAll(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];

  for (const tool of searchTools(q).slice(0, 8)) {
    hits.push({
      type: "tool",
      label: tool.name,
      description: tool.summary,
      href: `/${tool.slug}`,
      category: getCategory(tool.category)?.name,
    });
  }

  const gameMatches = games
    .filter((g) => {
      const hay = `${g.name} ${g.summary} ${g.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 4);
  for (const game of gameMatches) {
    hits.push({
      type: "game",
      label: game.name,
      description: game.summary,
      href: `/games/${game.slug}`,
      category: "Game",
    });
  }

  const catMatches = categories
    .filter((c) => `${c.name} ${c.description}`.toLowerCase().includes(q))
    .slice(0, 3);
  for (const cat of catMatches) {
    hits.push({
      type: "category",
      label: cat.name,
      description: cat.description,
      href: `/${cat.route}`,
      category: "Category",
    });
  }

  return hits;
}

export function SearchBox({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "hero";
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();

  const results = React.useMemo(() => searchAll(query), [query]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (hit: SearchHit) => {
    navigate(hit.href);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[activeIndex]);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      role="search"
    >
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-background transition-shadow",
          variant === "hero"
            ? "h-12 shadow-sm"
            : "h-10",
          open && "ring-2 ring-ring ring-offset-1 ring-offset-background"
        )}
      >
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          aria-label="Search Dueneo tools and games"
          placeholder={
            variant === "hero"
              ? "Search 100+ tools and games — image compressor, pdf merge, sudoku…"
              : "Search tools and games…"
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full w-full bg-transparent pl-10 pr-12 text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-3 hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        )}
      </div>

      {open && query && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[80vh] overflow-y-auto rounded-xl border bg-popover p-2 shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No tools or games match <span className="font-medium">“{query}”</span>.
            </div>
          ) : (
            <ul className="space-y-0.5" role="listbox">
              {results.map((hit, i) => (
                <li key={`${hit.type}-${hit.href}`} role="option" aria-selected={i === activeIndex}>
                  <RouterLink
                    to={hit.href}
                    onClick={() => {
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-md bg-muted">
                      {hit.type === "game" ? (
                        <Gamepad2 className="h-3.5 w-3.5 text-indigo-500" />
                      ) : hit.type === "category" ? (
                        <Hash className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{hit.label}</span>
                        {hit.category && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {hit.category}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.description}
                      </span>
                    </span>
                    {i === activeIndex && (
                      <CornerDownLeft className="mt-1.5 h-3.5 w-3.5 flex-none text-muted-foreground" />
                    )}
                  </RouterLink>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1 border-t px-3 py-2 text-[10px] text-muted-foreground">
            {tools.length} tools · {games.length} games · all browser-only
          </div>
        </div>
      )}
    </div>
  );
}

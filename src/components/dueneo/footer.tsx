"use client";

import { RouterLink } from "@/lib/dueneo/router";
import { categories } from "@/data/categories";
import { games } from "@/data/games";
import { Logo } from "./logo";
import { Heart } from "lucide-react";

const siteLinks = [
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms", to: "/terms" },
  { label: "Cookie Policy", to: "/cookie-policy" },
];

const toolCategoryLinks = [
  "image-tools",
  "pdf-tools",
  "developer-tools",
  "text-tools",
];

const businessCategoryLinks = [
  "business-tools",
  "finance-tools",
  "seo-tools",
  "design-tools",
];

const popularGames = ["sudoku", "2048", "minesweeper", "tic-tac-toe"];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="dueneo-container py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Free, fast and private browser tools plus lightweight classic
              games. Everything runs in your browser — no uploads, no signup.
            </p>
          </div>

          {/* Dueneo column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dueneo
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {siteLinks.map((l) => (
                <li key={l.to}>
                  <RouterLink
                    to={l.to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </RouterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tools
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {toolCategoryLinks.map((route) => {
                const cat = categories.find((c) => c.route === route);
                if (!cat) return null;
                return (
                  <li key={route}>
                    <RouterLink
                      to={`/${route}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {cat.name}
                    </RouterLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Business column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Business
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {businessCategoryLinks.map((route) => {
                const cat = categories.find((c) => c.route === route);
                if (!cat) return null;
                return (
                  <li key={route}>
                    <RouterLink
                      to={`/${route}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {cat.name}
                    </RouterLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Games column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Games
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {popularGames.map((slug) => {
                const game = games.find((g) => g.slug === slug);
                if (!game) return null;
                return (
                  <li key={slug}>
                    <RouterLink
                      to={`/games/${slug}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {game.name}
                    </RouterLink>
                  </li>
                );
              })}
              <li>
                <RouterLink
                  to="/games"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  All games →
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Dueneo. Free browser tools and classic games.</p>
          <p className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> for the open web.
          </p>
        </div>
      </div>
    </footer>
  );
}

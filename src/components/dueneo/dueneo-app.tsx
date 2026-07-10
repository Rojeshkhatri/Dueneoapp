"use client";

import * as React from "react";
import { useRouter } from "@/lib/dueneo/router";
import { Header } from "@/components/dueneo/header";
import { Footer } from "@/components/dueneo/footer";
import { HomePage } from "@/components/dueneo/home-page";
import { CategoryPage } from "@/components/dueneo/category-page";
import { AboutPage, ContactPage } from "@/components/dueneo/legal-pages";
import { PrivacyPolicyPage, TermsPage, CookiePolicyPage } from "@/components/dueneo/legal-content";
import { ComingSoonTool } from "@/components/dueneo/coming-soon-tool";
import { getTool, tools } from "@/data/tools";
import { getGame, games } from "@/data/games";
import { getCategoryByRoute, getCategory } from "@/data/categories";
import { ToolRouter } from "@/components/tools/tool-router";
import { GameRouter } from "@/components/games/game-router";
import { NotFoundPage } from "@/components/dueneo/not-found-page";
import { AllToolsPage } from "@/components/dueneo/all-tools-page";

/**
 * Top-level Dueneo application. Wraps every page in the shared
 * header / footer shell and dispatches to the right page based on the
 * current real URL path.
 */
export function DueneoApp() {
  const { path, segments } = useRouter();

  // Scroll to top whenever the path changes (handled in router navigate,
  // but also here for direct history navigation and back/forward).
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [path]);

  let body: React.ReactNode;

  if (path === "/" || segments.length === 0) {
    body = <HomePage />;
  } else if (segments.length === 1) {
    const seg = segments[0];
    // Legal pages.
    if (seg === "about") {
      body = <AboutPage />;
    } else if (seg === "tools") {
      body = <AllToolsPage />;
    } else if (seg === "contact") {
      body = <ContactPage />;
    } else if (seg === "privacy-policy") {
      body = <PrivacyPolicyPage />;
    } else if (seg === "terms") {
      body = <TermsPage />;
    } else if (seg === "cookie-policy") {
      body = <CookiePolicyPage />;
    } else {
      // Could be a category page (e.g. /image-tools) or a tool page (e.g. /image-compressor).
      const category = getCategoryByRoute(seg);
      if (category) {
        body = <CategoryPage category={category} />;
      } else {
        const tool = getTool(seg);
        if (tool) {
          body = tool.implemented && tool.component ? (
            <ToolRouter tool={tool} />
          ) : (
            <ComingSoonTool tool={tool} />
          );
        } else {
          body = <NotFoundPage path={path} />;
        }
      }
    }
  } else if (segments.length === 2 && segments[0] === "games") {
    const game = getGame(segments[1]);
    if (game) {
      body = game.implemented && game.component ? (
        <GameRouter game={game} />
      ) : (
        <NotFoundPage path={path} note={`${game.name} is in our registry but not yet playable in this build.`} />
      );
    } else {
      body = <NotFoundPage path={path} />;
    }
  } else {
    body = <NotFoundPage path={path} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Header />
      <div id="main-content" tabIndex={-1} className="contents">
        {body}
      </div>
      <Footer />
    </div>
  );
}

// Re-export so the page can import a single entry point.
export { tools, games, getCategory };

"use client";

import * as React from "react";

/**
 * Dueneo hash router.
 *
 * We are constrained to a single Next.js route (`/`), so multi-page
 * navigation is implemented with the URL hash. Examples:
 *
 *   #/                              → home
 *   #/image-compressor              → tool page
 *   #/games/sudoku                  → game page
 *   #/image-tools                   → category page
 *   #/about                         → legal/about page
 *
 * The router keeps `path` and a `navigate` function in sync with the
 * browser's location hash and the back/forward buttons.
 */

export interface RouterState {
  /** Hash path without the leading `#`, e.g. `/image-compressor`. */
  path: string;
  /** Segments of the path (split on `/`, empty strings removed). */
  segments: string[];
  navigate: (to: string) => void;
  back: () => void;
}

const RouterContext = React.createContext<RouterState | null>(null);

function readHash(): string {
  if (typeof window === "undefined") return "/";
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "/";
  // Normalise: ensure leading slash, no trailing slash (except root).
  let p = raw.startsWith("/") ? raw : `/${raw}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = React.useState<string>("/");

  React.useEffect(() => {
    setPath(readHash());
    const onHashChange = () => setPath(readHash());
    window.addEventListener("hashchange", onHashChange);
    // Also listen to popstate for full back-button support.
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  // Ensure the hash is initialised on first load.
  React.useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/");
    }
  }, []);

  const navigate = React.useCallback((to: string) => {
    let target = to.startsWith("/") ? to : `/${to}`;
    if (target.length > 1 && target.endsWith("/")) target = target.slice(0, -1);
    if (target === "/") {
      window.location.hash = "#/";
    } else {
      window.location.hash = `#${target}`;
    }
    // Scroll to top on navigation.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  const back = React.useCallback(() => {
    window.history.back();
  }, []);

  const segments = React.useMemo(
    () => path.split("/").filter(Boolean),
    [path]
  );

  const value = React.useMemo<RouterState>(
    () => ({ path, segments, navigate, back }),
    [path, segments, navigate, back]
  );

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterState {
  const ctx = React.useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return ctx;
}

/**
 * Anchor-style link that uses the hash router for navigation.
 */
export function RouterLink({
  to,
  children,
  className,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { navigate } = useRouter();
  const href = `#${to.startsWith("/") ? to : `/${to}`}`;
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        // Allow modifier-click to open normally.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

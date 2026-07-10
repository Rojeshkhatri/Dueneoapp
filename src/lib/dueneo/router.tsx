"use client";

import * as React from "react";

/**
 * Lightweight client router for Dueneo's statically generated real routes.
 * Every public path is emitted by Next.js at build time, while in-app
 * navigation stays instant through the History API.
 */

export interface RouterState {
  /** Normalized pathname, e.g. `/image-compressor`. */
  path: string;
  /** Segments of the path (split on `/`, empty strings removed). */
  segments: string[];
  navigate: (to: string) => void;
  back: () => void;
}

const RouterContext = React.createContext<RouterState | null>(null);

function normalizePath(raw: string): string {
  if (!raw) return "/";
  let p = raw.startsWith("/") ? raw : `/${raw}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function publicHref(path: string): string {
  const normalized = normalizePath(path);
  return normalized === "/" ? "/" : `${normalized}/`;
}

export function RouterProvider({
  children,
  initialPath = "/",
}: {
  children: React.ReactNode;
  initialPath?: string;
}) {
  const [path, setPath] = React.useState<string>(() => normalizePath(initialPath));

  React.useEffect(() => {
    // Preserve old shared links by upgrading them to the equivalent real URL.
    const legacyHash = window.location.hash.replace(/^#/, "");
    if (legacyHash.startsWith("/")) {
      window.location.replace(publicHref(legacyHash));
      return;
    }

    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const navigate = React.useCallback((to: string) => {
    const target = normalizePath(to);
    if (target === normalizePath(window.location.pathname)) return;
    window.history.pushState(null, "", publicHref(target));
    setPath(target);
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
 * Real anchor link enhanced with instant History API navigation.
 */
export function RouterLink({
  to,
  children,
  className,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { navigate } = useRouter();
  const href = publicHref(to);
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

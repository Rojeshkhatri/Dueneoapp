"use client";

import { useEffect } from "react";

/**
 * Adds <meta name="robots" content="noindex"> when served from
 * dueneoapp.pages.dev so Google doesn't index the duplicate site.
 * On the production domain (dueneo.com) this is a no-op.
 */
export function NoindexPagesDev() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host !== "dueneo.com" && !host.endsWith(".dueneo.com")) {
      const meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.appendChild(meta);
    }
  }, []);
  return null;
}

"use client";

import * as React from "react";

const BASE_URL = "https://dueneo.com";

function ensureMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}

export function usePageMetadata({
  title,
  description,
  pathname,
}: {
  title: string;
  description: string;
  pathname: string;
}) {
  React.useEffect(() => {
    const finalTitle = title.trim().endsWith("| Dueneo") || title.includes("— Dueneo")
      ? title
      : `${title} | Dueneo`;
    const normalizedPath = pathname === "/" ? "/" : `${pathname.replace(/\/$/, "")}/`;
    const canonicalUrl = `${BASE_URL}${normalizedPath}`;
    document.title = finalTitle;

    ensureMeta('meta[name="description"]', { name: "description", content: description });
    ensureMeta('meta[property="og:title"]', { property: "og:title", content: finalTitle });
    ensureMeta('meta[property="og:description"]', { property: "og:description", content: description });
    ensureMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    ensureMeta('meta[name="twitter:title"]', { name: "twitter:title", content: finalTitle });
    ensureMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [description, pathname, title]);
}

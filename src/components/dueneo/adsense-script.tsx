"use client";

import * as React from "react";
import { ADSENSE } from "@/lib/dueneo/adsense";

/**
 * Loads the Google AdSense script once per page.
 * Only renders when a publisher ID is configured.
 */
export function AdSenseScript() {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!ADSENSE.publisherId || loaded) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.publisherId}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    setLoaded(true);
  }, [loaded]);

  return null;
}

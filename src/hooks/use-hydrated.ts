"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false for server rendering and the first hydration pass, then true
 * on the client. This keeps time-, locale-, storage-, and randomness-based
 * interactive defaults out of the server/client comparison while preserving
 * the page's indexable title and explanatory content.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

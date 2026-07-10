"use client";

import * as React from "react";

const FAVORITES_KEY = "dueneo:favorite-tools:v1";
const RECENT_KEY = "dueneo:recent-tools:v1";
const CHANGE_EVENT = "dueneo:tool-library-change";
const EMPTY = "[]";

function readRaw(key: string): string {
  if (typeof window === "undefined") return EMPTY;
  try {
    return window.localStorage.getItem(key) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function parse(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, values: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Local library features are optional when storage is unavailable.
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useToolLibrary() {
  const favoritesRaw = React.useSyncExternalStore(
    subscribe,
    () => readRaw(FAVORITES_KEY),
    () => EMPTY
  );
  const recentRaw = React.useSyncExternalStore(
    subscribe,
    () => readRaw(RECENT_KEY),
    () => EMPTY
  );

  return React.useMemo(
    () => ({ favorites: parse(favoritesRaw), recent: parse(recentRaw) }),
    [favoritesRaw, recentRaw]
  );
}

export function toggleFavoriteTool(slug: string) {
  const current = parse(readRaw(FAVORITES_KEY));
  write(
    FAVORITES_KEY,
    current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current]
  );
}

export function recordRecentTool(slug: string) {
  const next = [slug, ...parse(readRaw(RECENT_KEY)).filter((item) => item !== slug)].slice(0, 12);
  write(RECENT_KEY, next);
}

export function clearRecentTools() {
  write(RECENT_KEY, []);
}

"use client";

import { RouterLink } from "@/lib/dueneo/router";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export function NotFoundPage({ path, note }: { path: string; note?: string }) {
  return (
    <main className="dueneo-container flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl font-bold tracking-tight text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {note ?? (
          <>
            We couldn&apos;t find <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{path}</code>.
            It may have moved, been renamed, or never existed.
          </>
        )}
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <RouterLink to="/">
            <Home className="mr-1.5 h-3.5 w-3.5" /> Back home
          </RouterLink>
        </Button>
        <Button asChild variant="outline">
          <RouterLink to="/image-tools">
            <Search className="mr-1.5 h-3.5 w-3.5" /> Browse tools
          </RouterLink>
        </Button>
      </div>
    </main>
  );
}

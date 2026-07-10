"use client";

import { RouterProvider } from "@/lib/dueneo/router";
import { DueneoApp } from "@/components/dueneo/dueneo-app";
import { Toaster as SonnerToaster } from "sonner";

export function AppShell({ initialPath }: { initialPath: string }) {
  return (
    <RouterProvider initialPath={initialPath}>
      <DueneoApp />
      <SonnerToaster position="top-center" richColors closeButton />
    </RouterProvider>
  );
}

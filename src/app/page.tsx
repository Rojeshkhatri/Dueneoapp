"use client";

import { RouterProvider } from "@/lib/dueneo/router";
import { DueneoApp } from "@/components/dueneo/dueneo-app";
import { Toaster as SonnerToaster } from "sonner";

export default function Page() {
  return (
    <RouterProvider>
      <DueneoApp />
      <SonnerToaster position="top-center" richColors closeButton />
    </RouterProvider>
  );
}

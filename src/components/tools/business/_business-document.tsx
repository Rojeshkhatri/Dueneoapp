"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

/**
 * Shared shell for the business-document tools (invoice, quote, receipt,
 * purchase order, delivery note). Renders a two-column layout: a form
 * panel on the left and a live preview on the right. The preview is
 * wrapped in a `.print-area` so the global `@media print` rules can hide
 * everything else and only print the document.
 *
 * Each tool supplies its own `form` and `preview` React nodes — this
 * shell handles the print button, the layout, and the print CSS.
 */
export function BusinessDocumentShell({
  form,
  preview,
  onReset,
  actions,
  printLabel = "Print / Save as PDF",
}: {
  form: React.ReactNode;
  preview: React.ReactNode;
  onReset?: () => void;
  actions?: React.ReactNode;
  printLabel?: string;
}) {
  const print = () => {
    // Defer the print so React flushes any pending state updates.
    setTimeout(() => {
      try {
        window.print();
      } catch {
        toast.error("Printing failed — please use your browser's Print menu.");
      }
    }, 50);
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">Document editor</h2>
          <p className="text-xs text-muted-foreground">
            Fill in the form to update the live preview. When you are happy, click Print
            and choose “Save as PDF”.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {actions}
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          )}
          <Button size="sm" onClick={print}>
            <Printer className="mr-1.5 h-4 w-4" /> {printLabel}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="no-print space-y-4">{form}</div>
        <div className="print-area space-y-0 rounded-xl border bg-white p-6 text-slate-900 shadow-sm sm:p-8">
          {preview}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
          .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>
    </div>
  );
}

/** Reusable form card with a heading. */
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Field label + input helper. */
export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  if (!htmlFor) {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {children}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

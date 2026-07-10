"use client";

import * as React from "react";
import type { ToolDefinition } from "@/data/tools";
import { TaxCalculator } from "./_tax-calculator";

export function GstCalculator({ tool }: { tool: ToolDefinition }) {
  return (
    <TaxCalculator
      tool={tool}
      config={{
        taxName: "GST",
        defaultRate: 18,
        presets: [0, 5, 12, 18, 28],
        currency: "USD",
        currencyStorageKey: "dueneo:currency:tax:gst:v2",
      }}
      content={{
        intro:
          "Add or remove Goods and Services Tax (GST) from any amount. Enter the value, pick the applicable GST rate and toggle between exclusive (add GST) or inclusive (extract GST) mode. Common Indian GST slabs — 0%, 5%, 12%, 18% and 28% — are one click away.",
        howTo: [
          {
            title: "Enter the amount",
            description:
              "Type the monetary value you want to compute GST on. The field accepts decimals and thousands separators.",
          },
          {
            title: "Pick the GST rate",
            description:
              "Use a quick preset chip (0%, 5%, 12%, 18%, 28%) or type a custom rate. The default is 18% — the most common Indian GST slab.",
          },
          {
            title: "Choose the mode",
            description:
              "“Add GST to net” applies GST to a tax-exclusive amount. “Remove GST from gross” extracts the GST component from a tax-inclusive price.",
          },
          {
            title: "Copy the breakdown",
            description:
              "Read the net, GST and gross totals, then click Copy to send the full summary to your clipboard.",
          },
        ],
        useCases: [
          "Work out the GST component of a tax-inclusive MRP before filing a return.",
          "Quote a tax-exclusive price to a business customer and add 18% GST on top.",
          "Split a mixed invoice line into taxable value and tax payable.",
          "Quickly verify the GST shown on a vendor bill by recomputing it from scratch.",
        ],
        faq: [
          {
            q: "Is my financial data sent to a server?",
            a: "No. All calculations run in your browser using plain arithmetic. The amount you type never leaves your device.",
          },
          {
            q: "Which GST slabs does this support?",
            a: "Any rate you enter is supported. The preset chips cover the standard Indian slabs (0%, 5%, 12%, 18%, 28%); simply type a different number for non-standard rates.",
          },
          {
            q: "What is the difference between inclusive and exclusive mode?",
            a: "Exclusive mode treats the entered amount as pre-tax and adds GST on top. Inclusive mode treats the entered amount as tax-inclusive and extracts the hidden GST component.",
          },
          {
            q: "Is this GST advice?",
            a: "No. This is a simple calculator that applies a flat percentage. Always confirm the applicable rate and treatment with a qualified tax professional.",
          },
        ],
      }}
    />
  );
}

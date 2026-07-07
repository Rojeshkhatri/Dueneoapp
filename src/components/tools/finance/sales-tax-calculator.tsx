"use client";

import * as React from "react";
import type { ToolDefinition } from "@/data/tools";
import { TaxCalculator } from "./_tax-calculator";

export function SalesTaxCalculator({ tool }: { tool: ToolDefinition }) {
  return (
    <TaxCalculator
      tool={tool}
      config={{
        taxName: "Sales Tax",
        defaultRate: 7,
        presets: [0, 4, 6, 7, 8.25, 8.875, 10],
        currency: "USD",
      }}
      content={{
        intro:
          "Calculate US-style sales tax on any purchase amount. Enter the pre-tax subtotal, pick the applicable state or local rate, and see the tax and grand total instantly. Inclusive mode extracts the sales tax already embedded in a final price.",
        howTo: [
          {
            title: "Enter the amount",
            description:
              "Type the purchase subtotal (typically the pre-tax price) or the receipt total, depending on the mode you pick next.",
          },
          {
            title: "Pick the sales-tax rate",
            description:
              "Use a quick preset (4%, 6%, 7%, 8.25%, 8.875%, 10%) or type your exact combined state + local rate. The default is 7%.",
          },
          {
            title: "Choose the mode",
            description:
              "“Add sales tax to net” adds the tax to the subtotal. “Remove sales tax from gross” extracts the tax already baked into a final price.",
          },
          {
            title: "Copy the breakdown",
            description:
              "The subtotal, sales tax and grand total update live. Copy puts the full summary on your clipboard.",
          },
        ],
        useCases: [
          "Estimate the all-in price of an online order before checking out.",
          "Reconcile the sales tax shown on a store receipt against your books.",
          "Back-calculate the pre-tax subtotal from a final price for expense reporting.",
          "Compare combined state + local rates between two jurisdictions.",
        ],
        faq: [
          {
            q: "Is my financial data sent to a server?",
            a: "No. The calculation runs locally in your browser. Nothing you type is uploaded.",
          },
          {
            q: "Does this know the sales-tax rate for my ZIP code?",
            a: "No — sales-tax rates vary by state, county, city and special district. Enter the combined rate that applies to your transaction. You can find it on your state revenue department's website.",
          },
          {
            q: "Why is the inclusive mode result slightly off from my receipt?",
            a: "Receipts often round the per-line tax to the nearest cent. This calculator applies the rate to the full subtotal, so cent-level rounding may differ by a penny on rare transactions.",
          },
          {
            q: "Is this tax advice?",
            a: "No. It is a simple percentage calculator. Confirm rates and exemptions with your state's department of revenue or a tax professional.",
          },
        ],
      }}
    />
  );
}

"use client";

import * as React from "react";
import type { ToolDefinition } from "@/data/tools";
import { TaxCalculator } from "./_tax-calculator";

export function VatCalculator({ tool }: { tool: ToolDefinition }) {
  return (
    <TaxCalculator
      tool={tool}
      config={{
        taxName: "VAT",
        defaultRate: 20,
        presets: [0, 5, 9, 13.5, 20, 23, 25],
        currency: "EUR",
      }}
      content={{
        intro:
          "Add or remove Value Added Tax (VAT) from any amount. Enter the value, choose the applicable VAT rate and switch between exclusive (add VAT) or inclusive (extract VAT) mode. Common EU/UK standard rates are preset for one-click access.",
        howTo: [
          {
            title: "Enter the amount",
            description:
              "Type the monetary value you want to compute VAT on. Decimals and thousands separators are accepted.",
          },
          {
            title: "Pick the VAT rate",
            description:
              "Choose a quick preset (5%, 20%, 23%, 25% etc.) or type a custom rate. The default is 20% — the UK standard rate.",
          },
          {
            title: "Choose the mode",
            description:
              "“Add VAT to net” applies VAT to a tax-exclusive amount. “Remove VAT from gross” extracts the VAT component from a tax-inclusive price.",
          },
          {
            title: "Copy the breakdown",
            description:
              "Net, VAT and gross totals are shown live. Click Copy to put the full summary on your clipboard.",
          },
        ],
        useCases: [
          "Convert a net B2B quote into a gross consumer-facing price.",
          "Extract the VAT component from a receipt to reconcile it against your books.",
          "Sanity-check the VAT charged by a supplier on a tax-inclusive invoice.",
          "Estimate the VAT refund you can claim on cross-border EU purchases.",
        ],
        faq: [
          {
            q: "Is my financial data sent to a server?",
            a: "No. All math runs in your browser. The amount you enter stays on your device.",
          },
          {
            q: "Which VAT rate should I use?",
            a: "It depends on the country, the goods or services and whether they qualify for a reduced or zero rate. Check the current rate published by your national revenue authority.",
          },
          {
            q: "Can this handle reverse-charge VAT?",
            a: "This tool calculates a flat VAT amount only. Reverse-charge mechanics, intra-EU supplies and import VAT require dedicated accounting software.",
          },
          {
            q: "Is this VAT advice?",
            a: "No. It is a simple percentage calculator. Always confirm rates and treatments with a qualified accountant or tax authority.",
          },
        ],
      }}
    />
  );
}

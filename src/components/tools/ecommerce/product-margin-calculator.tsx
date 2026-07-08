"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Package,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  parseNumber,
  formatCurrency,
  formatPercent,
  ECOMMERCE_DISCLAIMER,
  StatCard,
} from "./_ecommerce-helpers";

interface ProductRow {
  id: string;
  name: string;
  cost: string;
  price: string;
}

const SAMPLE_ROWS: ProductRow[] = [
  { id: "p1", name: "Premium T-shirt", cost: "12.00", price: "29.99" },
  { id: "p2", name: "Coffee mug", cost: "4.50", price: "14.99" },
  { id: "p3", name: "Sticker pack", cost: "0.75", price: "5.99" },
];

let rowCounter = 100;
function makeId(): string {
  rowCounter += 1;
  return `p${rowCounter}_${Date.now()}`;
}

interface ComputedRow {
  row: ProductRow;
  costNum: number;
  priceNum: number;
  profit: number;
  margin: number;
  markup: number;
  breakEven: number;
  isLoss: boolean;
  valid: boolean;
}

function computeRow(row: ProductRow): ComputedRow {
  const costNum = Math.max(0, parseNumber(row.cost));
  const priceNum = Math.max(0, parseNumber(row.price));
  const profit = priceNum - costNum;
  const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;
  const markup = costNum > 0 ? (profit / costNum) * 100 : 0;
  const breakEven = costNum; // Break-even = cover the cost.
  const isLoss = profit < 0 && priceNum > 0;
  const valid = priceNum > 0 || costNum > 0;
  return { row, costNum, priceNum, profit, margin, markup, breakEven, isLoss, valid };
}

export function ProductMarginCalculator({ tool }: { tool: ToolDefinition }) {
  const [rows, setRows] = React.useState<ProductRow[]>(SAMPLE_ROWS);

  const computed = rows.map(computeRow);
  const validRows = computed.filter((r) => r.valid);

  const totalCost = validRows.reduce((a, r) => a + r.costNum, 0);
  const totalRevenue = validRows.reduce((a, r) => a + r.priceNum, 0);
  const totalProfit = totalRevenue - totalCost;
  const blendedMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const blendedMarkup = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const updateRow = (id: string, patch: Partial<ProductRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: makeId(), name: "", cost: "", price: "" }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const reset = () => {
    setRows(SAMPLE_ROWS);
    toast.info("Reset.");
  };

  const summary = `Product margin summary (${validRows.length} product(s))
${validRows
  .map(
    (r) =>
      `  ${r.row.name || "Untitled"}: cost ${formatCurrency(r.costNum)}, price ${formatCurrency(r.priceNum)}, profit ${formatCurrency(r.profit)}, margin ${formatPercent(r.margin)}, markup ${formatPercent(r.markup)}`,
  )
  .join("\n")}

Totals:
  Total cost:      ${formatCurrency(totalCost)}
  Total revenue:   ${formatCurrency(totalRevenue)}
  Total profit:    ${formatCurrency(totalProfit)}
  Blended margin:  ${formatPercent(blendedMargin)}
  Blended markup:  ${formatPercent(blendedMarkup)}`;

  const toolBody = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatCurrency(totalRevenue)}
          tone="primary"
          icon={<Package className="h-3.5 w-3.5 text-primary" />}
          hint={`${validRows.length} product(s)`}
        />
        <StatCard
          label="Total cost"
          value={formatCurrency(totalCost)}
          icon={<TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Total profit"
          value={formatCurrency(totalProfit)}
          tone={totalProfit < 0 ? "rose" : "emerald"}
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
        />
        <StatCard
          label="Blended margin"
          value={formatPercent(blendedMargin)}
          tone={blendedMargin < 0 ? "rose" : "emerald"}
          hint={`Markup ${formatPercent(blendedMarkup)}`}
        />
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionLabel>Products</SectionLabel>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button variant="outline" size="sm" onClick={addRow} className="h-7 px-2 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add product
            </Button>
          </div>
        </div>

        {/* Desktop / tablet table view ------------------------------------ */}
        <div className="hidden md:block">
          <div className="max-h-[28rem] overflow-auto" style={{ scrollbarWidth: "thin" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%]">Product</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Markup</TableHead>
                  <TableHead className="text-right">Break-even</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {computed.map((r) => (
                  <TableRow key={r.row.id}>
                    <TableCell>
                      <Input
                        value={r.row.name}
                        onChange={(e) => updateRow(r.row.id, { name: e.target.value })}
                        placeholder="Product name"
                        className="h-8"
                        aria-label="Product name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        value={r.row.cost}
                        onChange={(e) => updateRow(r.row.id, { cost: e.target.value })}
                        placeholder="0.00"
                        className="h-8 text-right font-mono tabular-nums"
                        aria-label="Cost"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        value={r.row.price}
                        onChange={(e) => updateRow(r.row.id, { price: e.target.value })}
                        placeholder="0.00"
                        className="h-8 text-right font-mono tabular-nums"
                        aria-label="Selling price"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <span
                        className={
                          r.isLoss
                            ? "text-rose-600 dark:text-rose-400"
                            : r.profit > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }
                      >
                        {r.valid ? formatCurrency(r.profit) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.valid ? formatPercent(r.margin) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {r.valid && r.costNum > 0 ? formatPercent(r.markup) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {r.valid ? formatCurrency(r.breakEven) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(r.row.id)}
                        aria-label="Remove product"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {computed.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No products yet — click "Add product" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile card view ----------------------------------------------- */}
        <div className="space-y-3 md:hidden">
          {computed.map((r) => (
            <div key={r.row.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={r.row.name}
                  onChange={(e) => updateRow(r.row.id, { name: e.target.value })}
                  placeholder="Product name"
                  className="h-8 flex-1"
                  aria-label="Product name"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(r.row.id)}
                  aria-label="Remove product"
                  className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`m-cost-${r.row.id}`} className="text-[11px] text-muted-foreground">
                    Cost
                  </Label>
                  <Input
                    id={`m-cost-${r.row.id}`}
                    inputMode="decimal"
                    value={r.row.cost}
                    onChange={(e) => updateRow(r.row.id, { cost: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-right font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`m-price-${r.row.id}`} className="text-[11px] text-muted-foreground">
                    Price
                  </Label>
                  <Input
                    id={`m-price-${r.row.id}`}
                    inputMode="decimal"
                    value={r.row.price}
                    onChange={(e) => updateRow(r.row.id, { price: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-right font-mono tabular-nums"
                  />
                </div>
              </div>
              {r.valid && (
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Profit</span>
                  <span
                    className={
                      "text-right font-mono tabular-nums " +
                      (r.isLoss
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400")
                    }
                  >
                    {formatCurrency(r.profit)}
                  </span>
                  <span className="text-muted-foreground">Margin</span>
                  <span className="text-right font-mono tabular-nums">{formatPercent(r.margin)}</span>
                  <span className="text-muted-foreground">Markup</span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">
                    {r.costNum > 0 ? formatPercent(r.markup) : "—"}
                  </span>
                  <span className="text-muted-foreground">Break-even</span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatCurrency(r.breakEven)}
                  </span>
                </div>
              )}
            </div>
          ))}
          {computed.length === 0 && (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
              No products yet — tap "Add product" to start.
            </p>
          )}
        </div>
      </div>

      {totalProfit < 0 && totalRevenue > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <p>
            Total costs exceed total revenue across your products — you're losing{" "}
            {formatCurrency(Math.abs(totalProfit))} on this batch.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Margin</strong> = profit ÷ price
          (how much of each dollar is profit).{" "}
          <strong className="text-foreground">Markup</strong> = profit ÷ cost
          (how much you mark up the cost).{" "}
          <strong className="text-foreground">Break-even</strong> = cost — the
          minimum price to not lose money. Totals blend across all products.
        </p>
      </div>

      <div className="flex justify-end">
        <CopyButton value={summary} size="sm" />
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Compare profit, margin and markup across multiple products in one screen. Add as many rows as you need, type a cost and price for each, and instantly see profit per unit, gross margin percentage, markup on cost and the break-even price — plus blended totals across the whole product mix.",
    tool: toolBody,
    howTo: [
      {
        title: "Add products to the table",
        description:
          "Start with the three sample rows or click \"Add product\" to add more. Each row tracks name, cost and selling price.",
      },
      {
        title: "Type cost and price for each",
        description:
          "Cost is what you pay per unit; price is what your customer pays. Profit, margin, markup and break-even update instantly as you type.",
      },
      {
        title: "Read the per-row metrics",
        description:
          "Profit shows in green (profit) or red (loss). Margin is profit ÷ price. Markup is profit ÷ cost. Break-even is the cost price — the floor below which you lose money.",
      },
      {
        title: "Watch the blended totals",
        description:
          "Top-of-screen stat cards show total revenue, total cost, total profit and the blended margin/markup across all products.",
      },
    ],
    useCases: [
      "Audit a 10-product catalogue side-by-side to spot which SKUs drag the blended margin down.",
      "Model new product launches by adding rows with proposed cost/price points.",
      "Compare margin vs markup so sales and finance teams speak the same language.",
      "Decide which products to discontinue — anything with a negative margin drags the total down.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{ECOMMERCE_DISCLAIMER}</li>
        <li>
          This is <strong>gross</strong> margin — operating expenses, salaries,
          rent, payment-processing fees and shipping are excluded. A positive
          margin here does not guarantee overall business profitability.
        </li>
        <li>
          Break-even is shown as the cost price. To include overheads, add a
          loaded cost (e.g. cost + $2 allocated overhead) in the cost column.
        </li>
        <li>
          The blended margin divides total profit by total revenue across all
          rows. It does not weight by sales volume — use a weighted average if
          you sell very different quantities per SKU.
        </li>
        <li>
          All currency is USD; substitute your local currency mentally if needed.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What's the difference between margin and markup?",
        a: "Margin is profit divided by selling price (e.g. $25 profit on $100 sale = 25% margin). Markup is profit divided by cost (e.g. $25 profit on $75 cost = 33% markup). A 25% margin equals a 33% markup. Margin is the finance-friendly metric; markup is the sales-friendly one.",
      },
      {
        q: "How is break-even price calculated?",
        a: "Break-even is the cost price — the minimum you'd need to charge to recover your direct costs without losing money. To include overhead, advertising, or transaction fees, add those amounts to the cost column.",
      },
      {
        q: "Why is my blended margin different from the average of per-row margins?",
        a: "Blended margin is total profit ÷ total revenue — it weights each product by its revenue. A high-margin product that sells little contributes less than a low-margin product that sells a lot. The simple average of margins treats every row equally regardless of revenue.",
      },
      {
        q: "Can I add many products at once?",
        a: "Yes. Click \"Add product\" as many times as you need. There's no enforced limit, but performance may degrade past a few hundred rows. The table is scrollable when it overflows.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

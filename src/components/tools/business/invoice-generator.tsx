"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  BusinessDocumentShell,
  FormSection,
  Field,
} from "./_business-document";
import {
  parseNumber,
  formatCurrency,
  formatDate,
  todayISO,
  plusDaysISO,
  defaultDocumentNumber,
  makeLineItemId,
  lineTotal,
  subtotal,
  type LineItem,
} from "./_business-helpers";

const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "INR", symbol: "₹" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "JPY", symbol: "¥" },
];

export function InvoiceGenerator({ tool }: { tool: ToolDefinition }) {
  const [fromName, setFromName] = React.useState("Your Company LLC");
  const [fromAddress, setFromAddress] = React.useState(
    "123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States"
  );
  const [fromEmail, setFromEmail] = React.useState("billing@yourcompany.com");

  const [toName, setToName] = React.useState("Client Name");
  const [toAddress, setToAddress] = React.useState(
    "456 Client Avenue\nNew York, NY 10001\nUnited States"
  );

  const [invoiceNo, setInvoiceNo] = React.useState(defaultDocumentNumber("INV"));
  const [issueDate, setIssueDate] = React.useState(todayISO());
  const [dueDate, setDueDate] = React.useState(plusDaysISO(30));

  const [items, setItems] = React.useState<LineItem[]>([
    { id: makeLineItemId(), description: "Website design — landing page", quantity: "1", unitPrice: "1200" },
    { id: makeLineItemId(), description: "Copywriting (5 pages)", quantity: "5", unitPrice: "180" },
    { id: makeLineItemId(), description: "SEO audit & recommendations", quantity: "1", unitPrice: "450" },
  ]);
  const [taxRate, setTaxRate] = React.useState("8");
  const [notes, setNotes] = React.useState(
    "Payment due within 30 days. Please reference invoice number on your payment. Thank you for your business!"
  );
  const [currencyCode, setCurrencyCode] = React.useState("USD");
  const currency = CURRENCY_OPTIONS.find((c) => c.code === currencyCode) ?? CURRENCY_OPTIONS[0];

  const sub = subtotal(items);
  const tax = sub * (parseNumber(taxRate) / 100);
  const total = sub + tax;

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: makeLineItemId(), description: "", quantity: "1", unitPrice: "0" },
    ]);
  const removeItem = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));

  const reset = () => {
    setFromName("Your Company LLC");
    setFromAddress("123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States");
    setFromEmail("billing@yourcompany.com");
    setToName("Client Name");
    setToAddress("456 Client Avenue\nNew York, NY 10001\nUnited States");
    setInvoiceNo(defaultDocumentNumber("INV"));
    setIssueDate(todayISO());
    setDueDate(plusDaysISO(30));
    setItems([
      { id: makeLineItemId(), description: "Website design — landing page", quantity: "1", unitPrice: "1200" },
      { id: makeLineItemId(), description: "Copywriting (5 pages)", quantity: "5", unitPrice: "180" },
      { id: makeLineItemId(), description: "SEO audit & recommendations", quantity: "1", unitPrice: "450" },
    ]);
    setTaxRate("8");
    setNotes(
      "Payment due within 30 days. Please reference invoice number on your payment. Thank you for your business!"
    );
    setCurrencyCode("USD");
  };

  const form = (
    <>
      <FormSection title="Your business (from)">
        <Field label="Name" htmlFor="inv-from-name">
          <Input id="inv-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            rows={4}
            className="text-sm"
          />
        </Field>
        <Field label="Email" htmlFor="inv-from-email">
          <Input
            id="inv-from-email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Bill to (client)">
        <Field label="Name" htmlFor="inv-to-name">
          <Input id="inv-to-name" value={toName} onChange={(e) => setToName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            rows={4}
            className="text-sm"
          />
        </Field>
      </FormSection>

      <FormSection title="Invoice details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice #" htmlFor="inv-no">
            <Input id="inv-no" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Field>
          <Field label="Currency" htmlFor="inv-currency">
            <select
              id="inv-currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date" htmlFor="inv-issue">
            <Input
              id="inv-issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </Field>
          <Field label="Due date" htmlFor="inv-due">
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Line items">
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                placeholder="Description"
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unit price</Label>
                  <Input
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add line item
        </Button>
        <Field label="Tax rate (%)" htmlFor="inv-tax">
          <Input
            id="inv-tax"
            inputMode="decimal"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Notes / payment terms">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="text-sm"
          />
        </Field>
      </FormSection>
    </>
  );

  const preview = (
    <div className="space-y-6 text-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">INVOICE</div>
          <div className="mt-1 text-xs text-slate-500">#{invoiceNo}</div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-900">{fromName}</div>
          <div className="mt-1 whitespace-pre-line">{fromAddress}</div>
          {fromEmail && <div className="mt-1">{fromEmail}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Bill to</div>
          <div className="font-semibold text-slate-900">{toName}</div>
          <div className="whitespace-pre-line text-slate-600">{toAddress}</div>
        </div>
        <div className="text-right">
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Dates</div>
          <div>
            <span className="text-slate-500">Issue date:</span>{" "}
            <span className="font-medium text-slate-900">{formatDate(issueDate)}</span>
          </div>
          <div>
            <span className="text-slate-500">Due date:</span>{" "}
            <span className="font-medium text-slate-900">{formatDate(dueDate)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Unit price</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-900">
                  {item.description || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{item.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatCurrency(parseNumber(item.unitPrice), { currency: currency.code })}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                  {formatCurrency(lineTotal(item), { currency: currency.code })}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                  No line items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatCurrency(sub, { currency: currency.code })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({parseNumber(taxRate)}%)</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatCurrency(tax, { currency: currency.code })}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-2 text-base">
            <span className="font-bold text-slate-900">Total due</span>
            <span className="font-bold tabular-nums text-slate-900">
              {formatCurrency(total, { currency: currency.code })}
            </span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Notes</div>
          <div className="whitespace-pre-line">{notes}</div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Create a professional, printable invoice in your browser. Fill in your business and client details, add line items with quantities and unit prices, set a tax rate and notes, then click Print to save the invoice as a PDF. Nothing is uploaded — the document is generated entirely from the form on this page.",
    tool: (
      <BusinessDocumentShell form={form} preview={preview} onReset={reset} />
    ),
    howTo: [
      {
        title: "Enter your business details",
        description:
          "Fill in the “from” section with your company name, address and contact email. This appears top-right on the invoice.",
      },
      {
        title: "Enter the client and invoice details",
        description:
          "Add the bill-to name and address, then set the invoice number, issue date and due date. Sensible defaults are provided.",
      },
      {
        title: "Add line items",
        description:
          "For each item enter a description, quantity and unit price. The amount calculates automatically. Add or remove rows as needed.",
      },
      {
        title: "Print or save as PDF",
        description:
          "Click Print / Save as PDF. Your browser's print dialog opens with only the invoice visible — choose “Save as PDF” as the destination.",
      },
    ],
    useCases: [
      "Bill a freelance client for project work with itemised line items.",
      "Send a consulting invoice with a tax line and 30-day payment terms.",
      "Issue a recurring monthly retainer invoice by reusing the previous month's details.",
      "Generate a printable PDF invoice when you don't have dedicated accounting software.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The PDF is generated via your browser's print-to-PDF. The exact look depends on
          your browser's print settings — disable headers and footers for the cleanest
          result.
        </li>
        <li>
          This tool does not store anything. Refreshing the page resets the form to its
          defaults. Use the print dialog's PDF output to keep a copy.
        </li>
        <li>
          Currency formatting uses your browser's locale. Verify the symbol matches your
          intended currency before sending.
        </li>
        <li>
          No sequential invoice numbering, tax-ID validation or e-invoicing format — this
          is a free-form printable template.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my invoice data sent to a server?",
        a: "No. Everything you type stays in this browser tab. The PDF is produced by your browser's built-in print engine — no upload happens.",
      },
      {
        q: "How do I save the invoice as a PDF?",
        a: "Click Print / Save as PDF. In the browser's print dialog, choose “Save as PDF” as the destination and click Save.",
      },
      {
        q: "Can I add my company logo?",
        a: "Not yet in this version. You can prepend your company name with a logo character (★, ●) or paste a small ASCII mark in the name field. A logo-upload feature is on the roadmap.",
      },
      {
        q: "Does the invoice number increment automatically?",
        a: "A random four-digit suffix is generated by default. You can edit the invoice number to match your own sequence before printing.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

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
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

export function QuoteGenerator({ tool }: { tool: ToolDefinition }) {
  const [fromName, setFromName] = React.useState("Your Company LLC");
  const [fromAddress, setFromAddress] = React.useState(
    "123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States"
  );
  const [fromEmail, setFromEmail] = React.useState("sales@yourcompany.com");

  const [toName, setToName] = React.useState("Prospect Name");
  const [toAddress, setToAddress] = React.useState(
    "456 Client Avenue\nNew York, NY 10001\nUnited States"
  );

  const [quoteNo, setQuoteNo] = React.useState(defaultDocumentNumber("QUO"));
  const [issueDate, setIssueDate] = React.useState(todayISO());
  const [expiryDate, setExpiryDate] = React.useState(plusDaysISO(30));

  const [items, setItems] = React.useState<LineItem[]>([
    { id: makeLineItemId(), description: "Discovery workshop", quantity: "1", unitPrice: "1500" },
    { id: makeLineItemId(), description: "Design + development (per page)", quantity: "8", unitPrice: "650" },
    { id: makeLineItemId(), description: "Monthly maintenance retainer (3 months)", quantity: "3", unitPrice: "400" },
  ]);
  const [taxRate, setTaxRate] = React.useState("8");
  const [notes, setNotes] = React.useState(
    "This quote is valid for 30 days from the issue date. Prices are estimates based on the scope discussed and may change if requirements evolve. 50% deposit required to commence work."
  );
  const { code: currency, setCode: setCurrency } = useCurrency();

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
    setFromEmail("sales@yourcompany.com");
    setToName("Prospect Name");
    setToAddress("456 Client Avenue\nNew York, NY 10001\nUnited States");
    setQuoteNo(defaultDocumentNumber("QUO"));
    setIssueDate(todayISO());
    setExpiryDate(plusDaysISO(30));
    setItems([
      { id: makeLineItemId(), description: "Discovery workshop", quantity: "1", unitPrice: "1500" },
      { id: makeLineItemId(), description: "Design + development (per page)", quantity: "8", unitPrice: "650" },
      { id: makeLineItemId(), description: "Monthly maintenance retainer (3 months)", quantity: "3", unitPrice: "400" },
    ]);
    setTaxRate("8");
    setNotes(
      "This quote is valid for 30 days from the issue date. Prices are estimates based on the scope discussed and may change if requirements evolve. 50% deposit required to commence work."
    );
  };

  const form = (
    <>
      <FormSection title="Your business (from)">
        <Field label="Name" htmlFor="quo-from-name">
          <Input id="quo-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            rows={4}
            className="text-sm"
          />
        </Field>
        <Field label="Email" htmlFor="quo-from-email">
          <Input
            id="quo-from-email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Quote to (client)">
        <Field label="Name" htmlFor="quo-to-name">
          <Input id="quo-to-name" value={toName} onChange={(e) => setToName(e.target.value)} />
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

      <FormSection title="Quote details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quote #" htmlFor="quo-no">
            <Input id="quo-no" value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} />
          </Field>
          <Field label="Currency" htmlFor="quo-currency">
            <CurrencySelector
              value={currency}
              onChange={setCurrency}
              id="quo-currency"
              className="[&_label]:hidden"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date" htmlFor="quo-issue">
            <Input
              id="quo-issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </Field>
          <Field label="Valid until" htmlFor="quo-expiry">
            <Input
              id="quo-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
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
        <Field label="Tax rate (%)" htmlFor="quo-tax">
          <Input
            id="quo-tax"
            inputMode="decimal"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Notes / validity terms">
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
          <div className="text-2xl font-bold tracking-tight text-slate-900">QUOTE</div>
          <div className="mt-1 text-xs text-slate-500">#{quoteNo}</div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-900">{fromName}</div>
          <div className="mt-1 whitespace-pre-line">{fromAddress}</div>
          {fromEmail && <div className="mt-1">{fromEmail}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Quote to</div>
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
            <span className="text-slate-500">Valid until:</span>{" "}
            <span className="font-medium text-slate-900">{formatDate(expiryDate)}</span>
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
                  {formatCurrency(parseNumber(item.unitPrice), { currency })}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                  {formatCurrency(lineTotal(item), { currency })}
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
              {formatCurrency(sub, { currency })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({parseNumber(taxRate)}%)</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatCurrency(tax, { currency })}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-2 text-base">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-bold tabular-nums text-slate-900">
              {formatCurrency(total, { currency })}
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
      "Create a professional, printable price quote for prospective clients. Fill in your business and prospect details, add line items, set a tax rate and an expiry date, then click Print to save the quote as a PDF. All processing happens in your browser — nothing is uploaded.",
    tool: (
      <BusinessDocumentShell form={form} preview={preview} onReset={reset} />
    ),
    howTo: [
      {
        title: "Enter your business details",
        description:
          "Fill in the “from” section with your company name, address and contact email. This appears top-right on the quote.",
      },
      {
        title: "Enter the prospect and quote details",
        description:
          "Add the client name and address, then set the quote number, issue date and valid-until date. The default expiry is 30 days.",
      },
      {
        title: "Add line items",
        description:
          "For each item enter a description, quantity and unit price. The amount calculates automatically. Add or remove rows as needed.",
      },
      {
        title: "Print or save as PDF",
        description:
          "Click Print / Save as PDF. Your browser's print dialog opens with only the quote visible — choose “Save as PDF” as the destination.",
      },
    ],
    useCases: [
      "Send a fixed-price quote for a website build with itemised deliverables.",
      "Provide a services estimate with a 30-day validity period.",
      "Quote a hardware bundle with quantity discounts via the line items table.",
      "Generate a printable PDF quote when you don't have CRM software.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The PDF is generated via your browser's print-to-PDF. The exact look depends on
          your browser's print settings — disable headers and footers for the cleanest
          result.
        </li>
        <li>
          This tool does not store anything. Refreshing the page resets the form. Use the
          print dialog's PDF output to keep a copy.
        </li>
        <li>
          Quote pricing is fixed in the chosen currency; multi-currency quoting and
          exchange-rate conversion are not supported.
        </li>
        <li>
          No digital signature, version tracking or follow-up reminders — this is a
          free-form printable template.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my quote data sent to a server?",
        a: "No. Everything you type stays in this browser tab. The PDF is produced by your browser's built-in print engine — no upload happens.",
      },
      {
        q: "How do I save the quote as a PDF?",
        a: "Click Print / Save as PDF. In the browser's print dialog, choose “Save as PDF” as the destination and click Save.",
      },
      {
        q: "Can I show the expiry date prominently?",
        a: "Yes. The valid-until date appears in the Dates panel on the quote. We recommend restating it in the Notes section too (e.g. “Quote valid for 30 days”).",
      },
      {
        q: "Can a quote be converted into an invoice later?",
        a: "Not automatically. Use the related Invoice Generator tool and re-enter the same line items, or copy the PDF text across.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

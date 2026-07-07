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

export function PurchaseOrderGenerator({ tool }: { tool: ToolDefinition }) {
  const [buyerName, setBuyerName] = React.useState("Your Company LLC");
  const [buyerAddress, setBuyerAddress] = React.useState(
    "123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States"
  );
  const [buyerContact, setBuyerContact] = React.useState("procurement@yourcompany.com");

  const [vendorName, setVendorName] = React.useState("Vendor Inc.");
  const [vendorAddress, setVendorAddress] = React.useState(
    "789 Supplier Way\nAustin, TX 78701\nUnited States"
  );

  const [shipName, setShipName] = React.useState("Your Company LLC — Receiving");
  const [shipAddress, setShipAddress] = React.useState(
    "123 Market Street, Loading Bay\nSan Francisco, CA 94103\nUnited States"
  );

  const [poNo, setPoNo] = React.useState(defaultDocumentNumber("PO"));
  const [issueDate, setIssueDate] = React.useState(todayISO());
  const [deliveryDate, setDeliveryDate] = React.useState(plusDaysISO(14));

  const [items, setItems] = React.useState<LineItem[]>([
    { id: makeLineItemId(), description: "USB-C laptop charger (65W)", quantity: "20", unitPrice: "32" },
    { id: makeLineItemId(), description: "Wireless mouse", quantity: "20", unitPrice: "18" },
    { id: makeLineItemId(), description: "27-inch 4K monitor", quantity: "10", unitPrice: "320" },
  ]);
  const [taxRate, setTaxRate] = React.useState("8");
  const [shipping, setShipping] = React.useState("75");
  const [notes, setNotes] = React.useState(
    "Please confirm receipt of this purchase order within 2 business days. Goods must be delivered in original packaging. Net-30 payment terms apply."
  );
  const [currencyCode, setCurrencyCode] = React.useState("USD");
  const currency = CURRENCY_OPTIONS.find((c) => c.code === currencyCode) ?? CURRENCY_OPTIONS[0];

  const sub = subtotal(items);
  const tax = sub * (parseNumber(taxRate) / 100);
  const shippingNum = parseNumber(shipping);
  const total = sub + tax + shippingNum;

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
    setBuyerName("Your Company LLC");
    setBuyerAddress("123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States");
    setBuyerContact("procurement@yourcompany.com");
    setVendorName("Vendor Inc.");
    setVendorAddress("789 Supplier Way\nAustin, TX 78701\nUnited States");
    setShipName("Your Company LLC — Receiving");
    setShipAddress("123 Market Street, Loading Bay\nSan Francisco, CA 94103\nUnited States");
    setPoNo(defaultDocumentNumber("PO"));
    setIssueDate(todayISO());
    setDeliveryDate(plusDaysISO(14));
    setItems([
      { id: makeLineItemId(), description: "USB-C laptop charger (65W)", quantity: "20", unitPrice: "32" },
      { id: makeLineItemId(), description: "Wireless mouse", quantity: "20", unitPrice: "18" },
      { id: makeLineItemId(), description: "27-inch 4K monitor", quantity: "10", unitPrice: "320" },
    ]);
    setTaxRate("8");
    setShipping("75");
    setNotes(
      "Please confirm receipt of this purchase order within 2 business days. Goods must be delivered in original packaging. Net-30 payment terms apply."
    );
    setCurrencyCode("USD");
  };

  const form = (
    <>
      <FormSection title="Buyer (your company)">
        <Field label="Name" htmlFor="po-buyer-name">
          <Input id="po-buyer-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
        <Field label="Contact" htmlFor="po-buyer-contact">
          <Input
            id="po-buyer-contact"
            type="email"
            value={buyerContact}
            onChange={(e) => setBuyerContact(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Vendor (supplier)">
        <Field label="Name" htmlFor="po-vendor-name">
          <Input id="po-vendor-name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={vendorAddress}
            onChange={(e) => setVendorAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
      </FormSection>

      <FormSection title="Ship to">
        <Field label="Recipient" htmlFor="po-ship-name">
          <Input id="po-ship-name" value={shipName} onChange={(e) => setShipName(e.target.value)} />
        </Field>
        <Field label="Delivery address">
          <Textarea
            value={shipAddress}
            onChange={(e) => setShipAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
      </FormSection>

      <FormSection title="PO details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="PO #" htmlFor="po-no">
            <Input id="po-no" value={poNo} onChange={(e) => setPoNo(e.target.value)} />
          </Field>
          <Field label="Currency" htmlFor="po-currency">
            <select
              id="po-currency"
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
          <Field label="Issue date" htmlFor="po-issue">
            <Input
              id="po-issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </Field>
          <Field label="Delivery date" htmlFor="po-delivery">
            <Input
              id="po-delivery"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax rate (%)" htmlFor="po-tax">
            <Input
              id="po-tax"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </Field>
          <Field label="Shipping" htmlFor="po-shipping">
            <Input
              id="po-shipping"
              inputMode="decimal"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Notes / terms">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
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
          <div className="text-2xl font-bold tracking-tight text-slate-900">PURCHASE ORDER</div>
          <div className="mt-1 text-xs text-slate-500">#{poNo}</div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-900">{buyerName}</div>
          <div className="mt-1 whitespace-pre-line">{buyerAddress}</div>
          {buyerContact && <div className="mt-1">{buyerContact}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Vendor</div>
          <div className="font-semibold text-slate-900">{vendorName}</div>
          <div className="whitespace-pre-line text-slate-600">{vendorAddress}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Ship to</div>
          <div className="font-semibold text-slate-900">{shipName}</div>
          <div className="whitespace-pre-line text-slate-600">{shipAddress}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Issue date</div>
          <div className="font-medium text-slate-900">{formatDate(issueDate)}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
            Requested delivery
          </div>
          <div className="font-medium text-slate-900">{formatDate(deliveryDate)}</div>
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
          <div className="flex justify-between">
            <span className="text-slate-500">Shipping</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatCurrency(shippingNum, { currency: currency.code })}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-2 text-base">
            <span className="font-bold text-slate-900">Total</span>
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

      <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-xs text-slate-600">
        <div>
          <div className="mb-10 font-semibold uppercase tracking-wide text-slate-500">
            Authorised by
          </div>
          <div className="border-t border-slate-400 pt-1 text-slate-700">Signature</div>
        </div>
        <div className="text-right">
          <div className="mb-10 font-semibold uppercase tracking-wide text-slate-500">Date</div>
          <div className="border-t border-slate-400 pt-1 text-slate-700">
            {formatDate(issueDate)}
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Create a professional purchase order for procurement. Fill in your company and vendor details, specify the ship-to address, add line items with quantities and unit prices, set tax and shipping, then click Print to save the PO as a PDF. Everything stays in your browser — nothing is uploaded.",
    tool: <BusinessDocumentShell form={form} preview={preview} onReset={reset} />,
    howTo: [
      {
        title: "Enter your company (buyer) details",
        description:
          "Fill in the buyer name, address and contact email. This appears top-right on the PO.",
      },
      {
        title: "Enter the vendor and ship-to details",
        description:
          "Add the supplier's name and address, plus the delivery address where the goods should be received.",
      },
      {
        title: "Add line items, tax and shipping",
        description:
          "For each item enter a description, quantity and unit price. Add a tax rate and a shipping cost. The total updates live.",
      },
      {
        title: "Print or save as PDF",
        description:
          "Click Print / Save as PDF. Your browser's print dialog opens with only the PO visible — choose “Save as PDF” as the destination.",
      },
    ],
    useCases: [
      "Issue a PO for office equipment from an approved supplier.",
      "Place a bulk order for production materials with a delivery date.",
      "Formalise an order that was previously agreed by email.",
      "Provide a written authorisation for procurement-card purchases.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The PDF is generated via your browser's print-to-PDF. Disable headers and
          footers in the print dialog for the cleanest result.
        </li>
        <li>
          This tool does not store anything. Refreshing the page resets the form. Use the
          print dialog's PDF output to keep a copy.
        </li>
        <li>
          No approval workflow, vendor master data or budget-checking — this is a
          free-form printable template.
        </li>
        <li>
          Multi-currency conversion is not supported; the PO is fixed in the chosen
          currency.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my purchase order data sent to a server?",
        a: "No. Everything you type stays in this browser tab. The PDF is produced by your browser's built-in print engine — no upload happens.",
      },
      {
        q: "How do I save the PO as a PDF?",
        a: "Click Print / Save as PDF. In the browser's print dialog, choose “Save as PDF” as the destination and click Save.",
      },
      {
        q: "What is the difference between the buyer and the ship-to?",
        a: "The buyer is the company placing and paying for the order. The ship-to is where the goods should physically be delivered. They are often the same address but may differ for branch offices or third-party warehouses.",
      },
      {
        q: "Can I add an approval signature line?",
        a: "Yes — the PO preview includes an “Authorised by” signature line and date at the bottom for printing and signing on paper or in a PDF editor.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

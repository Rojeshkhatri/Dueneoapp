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
  formatDate,
  todayISO,
  defaultDocumentNumber,
  makeLineItemId,
} from "./_business-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";
import { LogoUpload, LogoPreview, getCompanyLogo } from "./_logo-upload";

interface DeliveryItem {
  id: string;
  description: string;
  quantityOrdered: string;
  quantityDelivered: string;
}

export function DeliveryNoteGenerator({ tool }: { tool: ToolDefinition }) {
  const [fromName, setFromName] = React.useState("Your Company LLC");
  const [fromAddress, setFromAddress] = React.useState(
    "123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States"
  );
  const [logo, setLogo] = React.useState<string | null>(getCompanyLogo);

  const [toName, setToName] = React.useState("Client Name");
  const [toAddress, setToAddress] = React.useState(
    "456 Client Avenue\nNew York, NY 10001\nUnited States"
  );

  const [noteNo, setNoteNo] = React.useState(defaultDocumentNumber("DN"));
  const [date, setDate] = React.useState(todayISO());
  const [poRef, setPoRef] = React.useState("PO-2024-7782");

  const [items, setItems] = React.useState<DeliveryItem[]>([
    { id: makeLineItemId(), description: "USB-C laptop charger (65W)", quantityOrdered: "20", quantityDelivered: "20" },
    { id: makeLineItemId(), description: "Wireless mouse", quantityOrdered: "20", quantityDelivered: "18" },
    { id: makeLineItemId(), description: "27-inch 4K monitor", quantityOrdered: "10", quantityDelivered: "10" },
  ]);

  const [notes, setNotes] = React.useState(
    "2 wireless mice are on backorder and will be shipped separately within 5 business days. Please inspect the goods on arrival and report any damage within 48 hours."
  );

  // Shared currency selector — no money is shown on a delivery note (prices
  // are intentionally excluded), but the choice persists across all Dueneo
  // money tools so it can be set here too.
  const { code: currency, setCode: setCurrency } = useCurrency();

  const updateItem = (id: string, patch: Partial<DeliveryItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: makeLineItemId(), description: "", quantityOrdered: "0", quantityDelivered: "0" },
    ]);
  const removeItem = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));

  const reset = () => {
    setFromName("Your Company LLC");
    setFromAddress("123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States");
    setToName("Client Name");
    setToAddress("456 Client Avenue\nNew York, NY 10001\nUnited States");
    setNoteNo(defaultDocumentNumber("DN"));
    setDate(todayISO());
    setPoRef("PO-2024-7782");
    setItems([
      { id: makeLineItemId(), description: "USB-C laptop charger (65W)", quantityOrdered: "20", quantityDelivered: "20" },
      { id: makeLineItemId(), description: "Wireless mouse", quantityOrdered: "20", quantityDelivered: "18" },
      { id: makeLineItemId(), description: "27-inch 4K monitor", quantityOrdered: "10", quantityDelivered: "10" },
    ]);
    setNotes(
      "2 wireless mice are on backorder and will be shipped separately within 5 business days. Please inspect the goods on arrival and report any damage within 48 hours."
    );
  };

  const form = (
    <>
      <FormSection title="From (sender)">
        <Field label="Name" htmlFor="dn-from-name">
          <Input id="dn-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
        <Field label="Logo">
          <LogoUpload value={logo} onChange={setLogo} />
        </Field>
      </FormSection>

      <FormSection title="Deliver to (recipient)">
        <Field label="Name" htmlFor="dn-to-name">
          <Input id="dn-to-name" value={toName} onChange={(e) => setToName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
      </FormSection>

      <FormSection title="Delivery details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Delivery note #" htmlFor="dn-no">
            <Input id="dn-no" value={noteNo} onChange={(e) => setNoteNo(e.target.value)} />
          </Field>
          <Field label="Date" htmlFor="dn-date">
            <Input
              id="dn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="PO reference (optional)" htmlFor="dn-po">
          <Input
            id="dn-po"
            value={poRef}
            onChange={(e) => setPoRef(e.target.value)}
            placeholder="e.g. PO-2024-7782"
          />
        </Field>
        <CurrencySelector value={currency} onChange={setCurrency} id="dn-currency" />
      </FormSection>

      <FormSection title="Items delivered">
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
                  aria-label={`Remove item ${idx + 1}: ${item.description || "untitled item"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Label htmlFor={`dn-item-description-${item.id}`} className="sr-only">Description for item {idx + 1}</Label>
              <Input
                id={`dn-item-description-${item.id}`}
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                placeholder="Description"
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`dn-item-ordered-${item.id}`} className="text-xs text-muted-foreground">Qty ordered</Label>
                  <Input
                    id={`dn-item-ordered-${item.id}`}
                    inputMode="decimal"
                    value={item.quantityOrdered}
                    onChange={(e) => updateItem(item.id, { quantityOrdered: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`dn-item-delivered-${item.id}`} className="text-xs text-muted-foreground">Qty delivered</Label>
                  <Input
                    id={`dn-item-delivered-${item.id}`}
                    inputMode="decimal"
                    value={item.quantityDelivered}
                    onChange={(e) => updateItem(item.id, { quantityDelivered: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
        </Button>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Notes / special instructions">
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
          <div className="text-2xl font-bold tracking-tight text-slate-900">DELIVERY NOTE</div>
          <div className="mt-1 text-xs text-slate-500">#{noteNo}</div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-900">{fromName}</div>
          {logo && <LogoPreview className="mb-2 ml-auto h-10 w-auto max-w-[140px] object-contain" />}
          <div className="mt-1 whitespace-pre-line">{fromAddress}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
            Deliver to
          </div>
          <div className="font-semibold text-slate-900">{toName}</div>
          <div className="whitespace-pre-line text-slate-600">{toAddress}</div>
        </div>
        <div className="text-right">
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Date</div>
          <div className="font-medium text-slate-900">{formatDate(date)}</div>
          {poRef && (
            <>
              <div className="mt-2 font-semibold uppercase tracking-wide text-slate-500">
                PO reference
              </div>
              <div className="font-mono text-slate-900">{poRef}</div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Qty ordered</th>
              <th className="px-3 py-2 text-right font-semibold">Qty delivered</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ordered = parseNumber(item.quantityOrdered);
              const delivered = parseNumber(item.quantityDelivered);
              const short = delivered < ordered;
              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">
                    {item.description || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {item.quantityOrdered}
                  </td>
                  <td
                    className={
                      "px-3 py-2 text-right font-medium tabular-nums " +
                      (short ? "text-amber-700" : "text-slate-900")
                    }
                  >
                    {item.quantityDelivered}
                    {short && " ⚠"}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
            Received by (signature)
          </div>
          <div className="border-t border-slate-400 pt-1 text-slate-700">Name &amp; signature</div>
        </div>
        <div className="text-right">
          <div className="mb-10 font-semibold uppercase tracking-wide text-slate-500">Date</div>
          <div className="border-t border-slate-400 pt-1 text-slate-700">DD / MM / YYYY</div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Create a printable delivery note (or packing slip) to accompany a shipment. List the items delivered, the quantities ordered vs delivered, and any special instructions. The recipient signs the printed copy on arrival. Click Print to save the delivery note as a PDF — all processing happens in your browser.",
    tool: <BusinessDocumentShell form={form} preview={preview} onReset={reset} />,
    howTo: [
      {
        title: "Enter sender and recipient details",
        description:
          "Fill in the “from” business name and address, then the “deliver to” name and address for the recipient.",
      },
      {
        title: "Set the delivery note number, date and PO reference",
        description:
          "A random delivery note number is generated by default. Add the date and an optional purchase-order reference so the recipient can match the shipment to their order.",
      },
      {
        title: "List items with ordered vs delivered quantities",
        description:
          "For each item enter the description, the quantity ordered and the quantity actually delivered. Short shipments are highlighted in amber with a warning icon.",
      },
      {
        title: "Print or save as PDF",
        description:
          "Click Print / Save as PDF. Your browser's print dialog opens with only the delivery note visible — choose “Save as PDF” as the destination.",
      },
    ],
    useCases: [
      "Accompany a courier shipment with a packing slip the recipient can sign.",
      "Document a partial delivery where some items are on backorder.",
      "Provide a paper trail for goods received from a warehouse transfer.",
      "Record customer acceptance of delivered goods without showing prices.",
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
          Prices are intentionally excluded — delivery notes accompany goods, they are not
          invoices. Use the related Invoice Generator for the financial document.
        </li>
        <li>
          No barcode, QR code or carrier tracking integration — this is a free-form
          printable template.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my delivery note data sent to a server?",
        a: "No. Everything you type stays in this browser tab. The PDF is produced by your browser's built-in print engine — no upload happens.",
      },
      {
        q: "How do I save the delivery note as a PDF?",
        a: "Click Print / Save as PDF. In the browser's print dialog, choose “Save as PDF” as the destination and click Save.",
      },
      {
        q: "Why are no prices shown?",
        a: "A delivery note (packing slip) accompanies the goods and is signed by the recipient on arrival. Prices belong on the commercial invoice, which is generated separately by the related Invoice Generator tool.",
      },
      {
        q: "How are short shipments flagged?",
        a: "When the delivered quantity is less than the ordered quantity, the delivered number is shown in amber with a warning icon. Add details in the Notes section (e.g. “2 units on backorder”).",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

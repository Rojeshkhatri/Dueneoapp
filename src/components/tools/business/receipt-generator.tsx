"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  defaultDocumentNumber,
} from "./_business-helpers";
import { useCurrency, CurrencySelector } from "@/components/dueneo/currency-selector";

const PAYMENT_METHODS = [
  "Cash",
  "Credit card",
  "Debit card",
  "Bank transfer",
  "Cheque",
  "PayPal",
  "Stripe",
  "Apple Pay",
  "Google Pay",
  "Other",
];

export function ReceiptGenerator({ tool }: { tool: ToolDefinition }) {
  const [receiptNo, setReceiptNo] = React.useState(defaultDocumentNumber("RCP"));
  const [date, setDate] = React.useState(todayISO());

  const [payeeName, setPayeeName] = React.useState("Your Company LLC");
  const [payeeAddress, setPayeeAddress] = React.useState(
    "123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States"
  );

  const [payerName, setPayerName] = React.useState("Client Name");
  const [payerAddress, setPayerAddress] = React.useState(
    "456 Client Avenue\nNew York, NY 10001\nUnited States"
  );

  const [amount, setAmount] = React.useState("1296.00");
  const [paymentMethod, setPaymentMethod] = React.useState("Bank transfer");
  const [reference, setReference] = React.useState("");
  const [description, setDescription] = React.useState(
    "Payment for invoice INV-2024-1042 — Website design and development services."
  );

  const { code: currency, setCode: setCurrency } = useCurrency();
  const amountNum = parseNumber(amount);

  const reset = () => {
    setReceiptNo(defaultDocumentNumber("RCP"));
    setDate(todayISO());
    setPayeeName("Your Company LLC");
    setPayeeAddress("123 Market Street\nSuite 400\nSan Francisco, CA 94103\nUnited States");
    setPayerName("Client Name");
    setPayerAddress("456 Client Avenue\nNew York, NY 10001\nUnited States");
    setAmount("1296.00");
    setPaymentMethod("Bank transfer");
    setReference("");
    setDescription(
      "Payment for invoice INV-2024-1042 — Website design and development services."
    );
  };

  const form = (
    <>
      <FormSection title="Receipt details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Receipt #" htmlFor="rcp-no">
            <Input id="rcp-no" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
          </Field>
          <Field label="Date" htmlFor="rcp-date">
            <Input
              id="rcp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Received from (payer)">
        <Field label="Name" htmlFor="rcp-payer-name">
          <Input
            id="rcp-payer-name"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
          />
        </Field>
        <Field label="Address">
          <Textarea
            value={payerAddress}
            onChange={(e) => setPayerAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
      </FormSection>

      <FormSection title="Received by (payee)">
        <Field label="Business name" htmlFor="rcp-payee-name">
          <Input
            id="rcp-payee-name"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
          />
        </Field>
        <Field label="Address">
          <Textarea
            value={payeeAddress}
            onChange={(e) => setPayeeAddress(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </Field>
      </FormSection>

      <FormSection title="Payment">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" htmlFor="rcp-amount">
            <Input
              id="rcp-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Currency" htmlFor="rcp-currency">
            <CurrencySelector
              value={currency}
              onChange={setCurrency}
              id="rcp-currency"
              className="[&_label]:hidden"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment method" htmlFor="rcp-method">
            <select
              id="rcp-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference (optional)" htmlFor="rcp-ref">
            <Input
              id="rcp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. invoice #, transaction ID"
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="rcp-desc">
          <Textarea
            id="rcp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <div className="text-2xl font-bold tracking-tight text-slate-900">RECEIPT</div>
          <div className="mt-1 text-xs text-slate-500">#{receiptNo}</div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-900">{payeeName}</div>
          <div className="mt-1 whitespace-pre-line">{payeeAddress}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
            Received from
          </div>
          <div className="font-semibold text-slate-900">{payerName}</div>
          <div className="whitespace-pre-line text-slate-600">{payerAddress}</div>
        </div>
        <div className="text-right">
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Date</div>
          <div className="font-medium text-slate-900">{formatDate(date)}</div>
          <div className="mt-2 font-semibold uppercase tracking-wide text-slate-500">
            Payment method
          </div>
          <div className="font-medium text-slate-900">{paymentMethod}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Amount received</div>
        <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
          {formatCurrency(amountNum, { currency })}
        </div>
      </div>

      {(description || reference) && (
        <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
          {description && (
            <div className="mb-2">
              <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                Description
              </div>
              <div className="whitespace-pre-line">{description}</div>
            </div>
          )}
          {reference && (
            <div>
              <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                Reference
              </div>
              <div className="whitespace-pre-line font-mono">{reference}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-xs text-slate-600">
        <div>
          <div className="mb-10 font-semibold uppercase tracking-wide text-slate-500">
            Signature
          </div>
          <div className="border-t border-slate-400 pt-1 text-slate-700">
            {payeeName}
          </div>
        </div>
        <div className="text-right">
          <div className="mb-10 font-semibold uppercase tracking-wide text-slate-500">
            Date
          </div>
          <div className="border-t border-slate-400 pt-1 text-slate-700">
            {formatDate(date)}
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Generate a clean, printable payment receipt. Fill in the payer and payee details, the amount, the payment method and an optional description or reference, then click Print to save the receipt as a PDF. All processing happens locally in your browser.",
    tool: <BusinessDocumentShell form={form} preview={preview} onReset={reset} />,
    howTo: [
      {
        title: "Enter the receipt number and date",
        description:
          "A random receipt number is generated by default. Edit it to match your own sequence and adjust the date if needed.",
      },
      {
        title: "Enter the payer (received from) and payee (received by)",
        description:
          "Fill in both parties' names and addresses. The payer's details appear on the left of the receipt.",
      },
      {
        title: "Enter the amount, currency and payment method",
        description:
          "Type the payment amount, pick a currency, and choose a payment method from the dropdown. Add an optional reference (e.g. invoice number).",
      },
      {
        title: "Print or save as PDF",
        description:
          "Click Print / Save as PDF. Your browser's print dialog opens with only the receipt visible — choose “Save as PDF” as the destination.",
      },
    ],
    useCases: [
      "Issue a receipt for a cash payment received from a customer.",
      "Acknowledge a bank transfer for a consulting engagement.",
      "Provide a payment confirmation alongside an invoice closure.",
      "Document a charitable donation received by a non-profit.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The PDF is generated via your browser's print-to-PDF. Disable headers and
          footers in the print dialog for the cleanest result.
        </li>
        <li>
          This tool does not store anything. Refreshing the page resets the form to its
          defaults. Use the print dialog's PDF output to keep a copy.
        </li>
        <li>
          No digital signature, cryptographic stamp or tamper-evident serial — this is a
          free-form printable template. For legally binding receipts, use dedicated
          accounting software.
        </li>
        <li>
          Tax breakdown is not shown — add it in the description field if needed.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is my receipt data sent to a server?",
        a: "No. Everything you type stays in this browser tab. The PDF is produced by your browser's built-in print engine — no upload happens.",
      },
      {
        q: "How do I save the receipt as a PDF?",
        a: "Click Print / Save as PDF. In the browser's print dialog, choose “Save as PDF” as the destination and click Save.",
      },
      {
        q: "Can I include a tax line on the receipt?",
        a: "Add the tax breakdown (e.g. “Includes 8% sales tax of $96.00”) in the Description field. A dedicated tax table is not included because most receipts simply show the total received.",
      },
      {
        q: "Can I add my logo?",
        a: "Not in this version. You can prepend your business name with a logo character (★, ●) or paste a small ASCII mark in the name field.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

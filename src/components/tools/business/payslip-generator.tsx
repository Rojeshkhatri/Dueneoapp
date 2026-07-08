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
} from "./_business-helpers";
import { useCurrency, CurrencySelector, money } from "@/components/dueneo/currency-selector";

interface EarningItem {
  id: string;
  label: string;
  amount: string;
}

interface DeductionItem {
  id: string;
  label: string;
  amount: string;
}

let idCounter = 0;
const makeId = () => `ps-${++idCounter}`;

export function PayslipGenerator({ tool }: { tool: ToolDefinition }) {
  // Company (employer) details
  const [companyName, setCompanyName] = React.useState("Your Company LLC");
  const [companyAddress, setCompanyAddress] = React.useState(
    "123 Business Park\nSuite 200\nSan Francisco, CA 94103"
  );
  const [companyEmail, setCompanyEmail] = React.useState("payroll@yourcompany.com");

  // Employee details
  const [employeeName, setEmployeeName] = React.useState("Jane Doe");
  const [employeeId, setEmployeeId] = React.useState("EMP-0042");
  const [employeeDesignation, setEmployeeDesignation] = React.useState("Senior Software Engineer");
  const [employeeAddress, setEmployeeAddress] = React.useState(
    "789 Residential Street\nApt 5B\nSan Francisco, CA 94110"
  );

  // Payslip details
  const [payslipNo, setPayslipNo] = React.useState(defaultDocumentNumber("PS"));
  const [payPeriodStart, setPayPeriodStart] = React.useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [payPeriodEnd, setPayPeriodEnd] = React.useState(todayISO());
  const [payDate, setPayDate] = React.useState(todayISO());
  const [payFrequency, setPayFrequency] = React.useState<"monthly" | "biweekly" | "weekly" | "semimonthly">("monthly");

  // Currency
  const { code: currency, setCode: setCurrency } = useCurrency();

  // Earnings
  const [earnings, setEarnings] = React.useState<EarningItem[]>([
    { id: makeId(), label: "Basic Salary", amount: "5000" },
    { id: makeId(), label: "House Rent Allowance", amount: "1500" },
    { id: makeId(), label: "Travel Allowance", amount: "300" },
  ]);

  // Deductions
  const [deductions, setDeductions] = React.useState<DeductionItem[]>([
    { id: makeId(), label: "Income Tax", amount: "650" },
    { id: makeId(), label: "Social Security", amount: "310" },
    { id: makeId(), label: "Health Insurance", amount: "120" },
  ]);

  const [notes, setNotes] = React.useState(
    "This is a computer-generated payslip and does not require a signature. Please contact payroll@yourcompany.com for any discrepancies."
  );

  // Calculations
  const totalEarnings = earnings.reduce((sum, e) => sum + parseNumber(e.amount), 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + parseNumber(d.amount), 0);
  const netPay = totalEarnings - totalDeductions;

  const fmt = (v: number) => money(v, currency);

  // Earnings handlers
  const addEarning = () =>
    setEarnings((prev) => [...prev, { id: makeId(), label: "", amount: "" }]);
  const updateEarning = (id: string, field: "label" | "amount", value: string) =>
    setEarnings((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  const removeEarning = (id: string) =>
    setEarnings((prev) => prev.filter((e) => e.id !== id));

  // Deductions handlers
  const addDeduction = () =>
    setDeductions((prev) => [...prev, { id: makeId(), label: "", amount: "" }]);
  const updateDeduction = (id: string, field: "label" | "amount", value: string) =>
    setDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  const removeDeduction = (id: string) =>
    setDeductions((prev) => prev.filter((d) => d.id !== id));

  const reset = () => {
    setCompanyName("Your Company LLC");
    setCompanyAddress("123 Business Park\nSuite 200\nSan Francisco, CA 94103");
    setCompanyEmail("payroll@yourcompany.com");
    setEmployeeName("Jane Doe");
    setEmployeeId("EMP-0042");
    setEmployeeDesignation("Senior Software Engineer");
    setEmployeeAddress("789 Residential Street\nApt 5B\nSan Francisco, CA 94110");
    setPayslipNo(defaultDocumentNumber("PS"));
    const d = new Date();
    d.setDate(1);
    setPayPeriodStart(d.toISOString().slice(0, 10));
    setPayPeriodEnd(todayISO());
    setPayDate(todayISO());
    setPayFrequency("monthly");
    setEarnings([
      { id: makeId(), label: "Basic Salary", amount: "5000" },
      { id: makeId(), label: "House Rent Allowance", amount: "1500" },
      { id: makeId(), label: "Travel Allowance", amount: "300" },
    ]);
    setDeductions([
      { id: makeId(), label: "Income Tax", amount: "650" },
      { id: makeId(), label: "Social Security", amount: "310" },
      { id: makeId(), label: "Health Insurance", amount: "120" },
    ]);
    setNotes(
      "This is a computer-generated payslip and does not require a signature. Please contact payroll@yourcompany.com for any discrepancies."
    );
  };

  const form = (
    <>
      <FormSection title="Currency">
        <CurrencySelector value={currency} onChange={setCurrency} />
      </FormSection>

      <FormSection title="Employer (from)">
        <Field label="Company name">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            rows={3}
            className="resize-none text-xs"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Employee">
        <Field label="Employee name">
          <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee ID">
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </Field>
          <Field label="Designation">
            <Input
              value={employeeDesignation}
              onChange={(e) => setEmployeeDesignation(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Address">
          <Textarea
            value={employeeAddress}
            onChange={(e) => setEmployeeAddress(e.target.value)}
            rows={2}
            className="resize-none text-xs"
          />
        </Field>
      </FormSection>

      <FormSection title="Pay period">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period start">
            <Input
              type="date"
              value={payPeriodStart}
              onChange={(e) => setPayPeriodStart(e.target.value)}
            />
          </Field>
          <Field label="Period end">
            <Input
              type="date"
              value={payPeriodEnd}
              onChange={(e) => setPayPeriodEnd(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pay date">
            <Input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </Field>
          <Field label="Payslip #">
            <Input value={payslipNo} onChange={(e) => setPayslipNo(e.target.value)} />
          </Field>
        </div>
        <Field label="Pay frequency">
          <select
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value as typeof payFrequency)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="semimonthly">Semi-monthly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>
      </FormSection>

      <FormSection title="Earnings">
        <div className="space-y-2">
          {earnings.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <Input
                value={e.label}
                onChange={(ev) => updateEarning(e.id, "label", ev.target.value)}
                placeholder="Earning type (e.g. Basic Salary)"
                className="flex-1"
              />
              <Input
                value={e.amount}
                onChange={(ev) => updateEarning(e.id, "amount", ev.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="w-28 text-right"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-none text-muted-foreground hover:text-destructive"
                onClick={() => removeEarning(e.id)}
                aria-label="Remove earning"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addEarning} className="w-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add earning
        </Button>
      </FormSection>

      <FormSection title="Deductions">
        <div className="space-y-2">
          {deductions.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <Input
                value={d.label}
                onChange={(ev) => updateDeduction(d.id, "label", ev.target.value)}
                placeholder="Deduction type (e.g. Income Tax)"
                className="flex-1"
              />
              <Input
                value={d.amount}
                onChange={(ev) => updateDeduction(d.id, "amount", ev.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="w-28 text-right"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-none text-muted-foreground hover:text-destructive"
                onClick={() => removeDeduction(d.id)}
                aria-label="Remove deduction"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addDeduction} className="w-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add deduction
        </Button>
      </FormSection>

      <FormSection title="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="resize-none text-xs"
        />
      </FormSection>
    </>
  );

  const frequencyLabel = {
    monthly: "Monthly Pay",
    semimonthly: "Semi-monthly Pay",
    biweekly: "Bi-weekly Pay",
    weekly: "Weekly Pay",
  }[payFrequency];

  const preview = (
    <div className="mx-auto max-w-[680px] text-[13px] leading-relaxed">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {companyName || "Your Company"}
          </h1>
          <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
            {companyAddress}
          </p>
          {companyEmail && (
            <p className="mt-1 text-xs text-slate-600">{companyEmail}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold uppercase tracking-wider text-slate-900">
            Payslip
          </p>
          <p className="mt-1 text-xs text-slate-600">{frequencyLabel}</p>
          <p className="mt-1 text-xs text-slate-600">#{payslipNo}</p>
        </div>
      </div>

      {/* Employee + pay period details */}
      <div className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Employee Details
          </h2>
          <p className="font-semibold text-slate-900">{employeeName || "—"}</p>
          <p className="text-xs text-slate-600">ID: {employeeId || "—"}</p>
          <p className="text-xs text-slate-600">
            {employeeDesignation || "—"}
          </p>
          <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
            {employeeAddress}
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pay Period
          </h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Period:</span>
              <span className="font-medium text-slate-900">
                {formatDate(payPeriodStart)} — {formatDate(payPeriodEnd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pay date:</span>
              <span className="font-medium text-slate-900">{formatDate(payDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Frequency:</span>
              <span className="font-medium text-slate-900">{frequencyLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings + Deductions table */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <h2 className="mb-2 bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white">
            Earnings
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-500">
                <th className="py-1.5 pr-2 font-medium">Description</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-2 text-center text-slate-400">
                    No earnings
                  </td>
                </tr>
              ) : (
                earnings.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 text-slate-700">
                      {e.label || "—"}
                    </td>
                    <td className="py-1.5 text-right text-slate-900">
                      {fmt(parseNumber(e.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold">
                <td className="py-2 pr-2 text-slate-900">Total Earnings</td>
                <td className="py-2 text-right text-slate-900">{fmt(totalEarnings)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <h2 className="mb-2 bg-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white">
            Deductions
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-500">
                <th className="py-1.5 pr-2 font-medium">Description</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {deductions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-2 text-center text-slate-400">
                    No deductions
                  </td>
                </tr>
              ) : (
                deductions.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 text-slate-700">
                      {d.label || "—"}
                    </td>
                    <td className="py-1.5 text-right text-slate-900">
                      {fmt(parseNumber(d.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold">
                <td className="py-2 pr-2 text-slate-900">Total Deductions</td>
                <td className="py-2 text-right text-slate-900">{fmt(totalDeductions)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net pay */}
      <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-900 px-5 py-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">
            Net Pay
          </p>
          <p className="text-xs text-slate-400">
            ({frequencyLabel.toLowerCase()})
          </p>
        </div>
        <p className="text-3xl font-bold tracking-tight">{fmt(netPay)}</p>
      </div>

      {/* Summary strip */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="text-slate-500">Gross</p>
          <p className="font-semibold text-slate-900">{fmt(totalEarnings)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="text-slate-500">Deductions</p>
          <p className="font-semibold text-slate-900">{fmt(totalDeductions)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="text-slate-500">Net</p>
          <p className="font-semibold text-slate-900">{fmt(netPay)}</p>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-5 border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500">{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] uppercase tracking-wider text-slate-400">
        Generated by Dueneo · {formatDate(todayISO())}
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Create professional payslips for your employees with full earnings and deductions breakdown. Add your company and employee details, itemise earnings and deductions, choose any currency, and download as a print-ready PDF. Everything runs in your browser — no signup, no upload.",
    tool: (
      <BusinessDocumentShell
        form={form}
        preview={preview}
        onReset={reset}
        printLabel="Print / Save as PDF"
      />
    ),
    howTo: [
      {
        title: "Choose your currency",
        description:
          "Pick the currency for this payslip from the currency selector at the top of the editor. Your choice is remembered across all Dueneo money tools.",
      },
      {
        title: "Enter employer and employee details",
        description:
          "Fill in your company name, address and email, plus the employee's name, ID, designation and address.",
      },
      {
        title: "Set the pay period",
        description:
          "Choose the period start and end dates, the pay date, and the pay frequency (monthly, semi-monthly, bi-weekly or weekly).",
      },
      {
        title: "Add earnings and deductions",
        description:
          "Itemise each earning (basic salary, allowances, bonuses) and each deduction (tax, social security, insurance). Add as many lines as you need.",
      },
      {
        title: "Print or save as PDF",
        description:
          "Click “Print / Save as PDF” and choose “Save as PDF” as the destination in your browser's print dialog. The payslip prints cleanly without the editor UI.",
      },
    ],
    useCases: [
      "Small businesses issuing monthly payslips to employees.",
      "Freelancers and contractors generating pay records for clients.",
      "HR departments producing standardised payslip templates.",
      "Employers needing payslips in multiple currencies for international staff.",
      "Self-employed people documenting income for loan applications.",
    ],
    limitations: (
      <p>
        This tool generates a printable payslip for record-keeping and
        employee communication. It does not calculate tax withholdings
        automatically — you must enter the deduction amounts yourself based
        on your local tax tables. For official tax filings, always consult a
        qualified accountant or payroll provider. The currency selector
        changes the display currency only; it does not perform currency
        conversion.
      </p>
    ),
    faq: [
      {
        q: "Is my employee data uploaded anywhere?",
        a: "No. All data you enter stays in your browser. The payslip is generated entirely client-side — nothing is sent to Dueneo or any third party.",
      },
      {
        q: "Can I change the currency?",
        a: "Yes. Use the currency selector at the top of the editor. We support 58 world currencies including USD, EUR, GBP, INR, AUD, JPY, CNY, AED and many more. Your choice persists across all Dueneo money tools.",
      },
      {
        q: "How do I save the payslip as a PDF?",
        a: "Click “Print / Save as PDF”. In your browser's print dialog, choose “Save as PDF” as the destination. The print layout automatically hides the editor and shows only the payslip.",
      },
      {
        q: "Can I add multiple earnings and deductions?",
        a: "Yes. Click “Add earning” or “Add deduction” to add as many line items as you need. You can remove any line with the trash icon.",
      },
      {
        q: "Does this calculate tax automatically?",
        a: "No. Tax rules vary by country, region, income bracket and filing status. You must enter the deduction amounts yourself based on your local tax tables. The tool handles the layout and net-pay calculation only.",
      },
      {
        q: "Can I use this for multiple employees?",
        a: "Yes — generate one payslip per employee. After saving a PDF, change the employee details and generate the next one. Your company details, currency and layout stay the same.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

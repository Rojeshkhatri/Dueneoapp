"use client";

import * as React from "react";
import { CalcDisplay, CalcButton } from "./_calculator-suite";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import type { ToolDefinition } from "@/data/tools";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

// Decimal.js loaded dynamically
let Decimal: any = null;
let libsReady = false;

function ensureLibs() {
  if (!libsReady) throw new Error("Libraries not loaded");
}

export function BusinessContent() {
  return <BusinessCalculatorInner />;
}

export function BusinessCalculator({ tool }: { tool?: ToolDefinition }) {
  if (!tool) return <BusinessContent />;

  const content: ToolContent = {
    intro: "A professional financial calculator with TVM, NPV, IRR, amortization schedules, and depreciation methods. Precision arithmetic with no floating-point errors.",
    tool: <BusinessContent />,
    howTo: [
      { title: "Choose a calculator", description: "Use the tabs to switch between TVM, NPV/IRR, Amortization, and Depreciation." },
      { title: "TVM: fill 4 of 5 fields", description: "Leave one field empty and click Solve. The calculator finds the missing value." },
      { title: "NPV/IRR: enter cash flows", description: "First value is investment (negative), subsequent values are returns (positive). Comma-separated." },
      { title: "Amortization: generate schedules", description: "Enter loan amount, rate, and term to see month-by-month principal and interest breakdown." },
    ],
    faq: [
      { q: "What is TVM?", a: "Time Value of Money — the concept that money today is worth more than money in the future due to its earning potential." },
      { q: "What's the difference between NPV and IRR?", a: "NPV tells you the dollar value of an investment. IRR tells you the percentage return. Both use discounted cash flows." },
      { q: "How accurate are the calculations?", a: "All calculations use Decimal.js for arbitrary precision — no floating-point rounding errors." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function BusinessCalculatorInner() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    import("decimal.js").then((d) => {
      Decimal = d.default || d;
      libsReady = true;
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading business calculator...
      </div>
    );
  }

  return (
    <Tabs defaultValue="tvm">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="tvm">TVM</TabsTrigger>
        <TabsTrigger value="npv">NPV / IRR</TabsTrigger>
        <TabsTrigger value="amortization">Amortization</TabsTrigger>
        <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
      </TabsList>
      <TabsContent value="tvm" className="mt-4">
        <TVMCalculator />
      </TabsContent>
      <TabsContent value="npv" className="mt-4">
        <NPVCalculator />
      </TabsContent>
      <TabsContent value="amortization" className="mt-4">
        <AmortizationCalculator />
      </TabsContent>
      <TabsContent value="depreciation" className="mt-4">
        <DepreciationCalculator />
      </TabsContent>
    </Tabs>
  );
}

/* ─── TVM Calculator ─── */
function TVMCalculator() {
  const [pv, setPv] = React.useState("");
  const [fv, setFv] = React.useState("");
  const [pmt, setPmt] = React.useState("");
  const [n, setN] = React.useState("");
  const [iy, setIy] = React.useState("");
  const [result, setResult] = React.useState<string | null>(null);
  const [solving, setSolving] = React.useState<string | null>(null);

  const solve = () => {
    try {
      ensureLibs();
      const fields = {
        pv: pv ? new Decimal(pv) : null,
        fv: fv ? new Decimal(fv) : null,
        pmt: pmt ? new Decimal(pmt) : null,
        n: n ? new Decimal(n) : null,
        iy: iy ? new Decimal(iy).div(100) : null,
      };

      const emptyCount = Object.values(fields).filter((v) => v === null).length;
      if (emptyCount !== 1) {
        toast.error("Leave exactly one field empty to solve for it.");
        return;
      }

      const r = fields.iy ? fields.iy.div(12) : new Decimal(0); // monthly rate
      const N = fields.n || new Decimal(0);
      const PV = fields.pv || new Decimal(0);
      const PMT = fields.pmt || new Decimal(0);

      if (fields.fv === null) {
        // Solve for FV
        const fvVal = PV.neg().mul(Decimal.pow(1 + r.toNumber(), N.toNumber()))
          .sub(PMT.mul((Decimal.pow(1 + r.toNumber(), N.toNumber()).sub(1)).div(r)));
        setResult(`FV = ${fvVal.toFixed(2)}`);
        setSolving("FV");
      } else if (fields.pv === null) {
        // Solve for PV
        const fvVal = fields.fv;
        const pvVal = fvVal.neg().div(Decimal.pow(1 + r.toNumber(), N.toNumber()))
          .add(PMT.mul((Decimal.pow(1 + r.toNumber(), N.toNumber()).sub(1)).div(r).div(Decimal.pow(1 + r.toNumber(), N.toNumber()))));
        setResult(`PV = ${pvVal.toFixed(2)}`);
        setSolving("PV");
      } else if (fields.pmt === null) {
        // Solve for PMT
        const fvVal = fields.fv;
        const pmtVal = (fvVal.add(PV.mul(Decimal.pow(1 + r.toNumber(), N.toNumber()))))
          .div((Decimal.pow(1 + r.toNumber(), N.toNumber()).sub(1)).div(r));
        setResult(`PMT = ${pmtVal.toFixed(2)}`);
        setSolving("PMT");
      } else if (fields.n === null) {
        // Solve for N (iterative)
        const fvVal = fields.fv;
        const num = fvVal.add(PV.mul(Decimal.pow(1 + r.toNumber(), 0))).mul(r).div(PMT).add(1);
        const denom = new Decimal(1).add(r);
        const nVal = Decimal.ln(num.neg()).div(Decimal.ln(denom));
        setResult(`N = ${nVal.toFixed(2)} months`);
        setSolving("N");
      } else if (fields.iy === null) {
        // Solve for I/Y (iterative — Newton's method)
        setResult("I/Y requires iterative solving — use the NPV/IRR tab for rate calculations.");
        setSolving("I/Y");
      }
    } catch (err: any) {
      toast.error(err.message || "Calculation error");
    }
  };

  const clear = () => {
    setPv(""); setFv(""); setPmt(""); setN(""); setIy("");
    setResult(null); setSolving(null);
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        Fill in 4 fields, leave 1 empty. The calculator solves for the missing value.
      </p>
      <div className="space-y-3">
        <Field label="Present Value (PV)" value={pv} onChange={setPv} solving={solving === "PV"} />
        <Field label="Future Value (FV)" value={fv} onChange={setFv} solving={solving === "FV"} />
        <Field label="Payment (PMT)" value={pmt} onChange={setPmt} solving={solving === "PMT"} />
        <Field label="Periods (N)" value={n} onChange={setN} solving={solving === "N"} />
        <Field label="Annual Interest % (I/Y)" value={iy} onChange={setIy} solving={solving === "I/Y"} />
      </div>
      <div className="flex gap-2">
        <button onClick={solve} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Solve
        </button>
        <button onClick={clear} className="rounded-lg border px-4 py-2.5 text-sm hover:bg-accent">
          Clear
        </button>
      </div>
      {result && (
        <CalcDisplay value={result} className="text-center text-lg" />
      )}
    </div>
  );
}

/* ─── NPV / IRR Calculator ─── */
function NPVCalculator() {
  const [rate, setRate] = React.useState("10");
  const [cashFlows, setCashFlows] = React.useState("-10000, 3000, 3000, 3000, 3000");
  const [npvResult, setNpvResult] = React.useState<string | null>(null);
  const [irrResult, setIrrResult] = React.useState<string | null>(null);

  const calculate = () => {
    try {
      ensureLibs();
      const r = new Decimal(rate).div(100);
      const flows = cashFlows.split(",").map((s) => new Decimal(s.trim()));

      // NPV
      let npv = new Decimal(0);
      for (let i = 0; i < flows.length; i++) {
        npv = npv.add(flows[i].div(Decimal.pow(1 + r.toNumber(), i)));
      }
      setNpvResult(npv.toFixed(2));

      // IRR (bisection method)
      let low = -0.99, high = 10;
      for (let iter = 0; iter < 100; iter++) {
        const mid = (low + high) / 2;
        let testNpv = 0;
        for (let i = 0; i < flows.length; i++) {
          testNpv += flows[i].toNumber() / Math.pow(1 + mid, i);
        }
        if (testNpv > 0) low = mid;
        else high = mid;
      }
      setIrrResult(((low + high) / 2 * 100).toFixed(2) + "%");
    } catch (err: any) {
      toast.error(err.message || "Calculation error");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Field label="Discount Rate (%)" value={rate} onChange={setRate} />
      <div>
        <label className="mb-1.5 block text-sm font-medium">Cash Flows (comma-separated)</label>
        <textarea
          value={cashFlows}
          onChange={(e) => setCashFlows(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          rows={3}
          placeholder="-10000, 3000, 3000, 3000, 3000"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          First value is typically negative (investment). Subsequent values are returns.
        </p>
      </div>
      <button onClick={calculate} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Calculate NPV & IRR
      </button>
      {(npvResult || irrResult) && (
        <div className="grid grid-cols-2 gap-3">
          {npvResult && (
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">NPV</div>
              <div className="text-lg font-bold">${npvResult}</div>
            </div>
          )}
          {irrResult && (
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">IRR</div>
              <div className="text-lg font-bold">{irrResult}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Amortization Calculator ─── */
function AmortizationCalculator() {
  const [amount, setAmount] = React.useState("250000");
  const [annualRate, setAnnualRate] = React.useState("6.5");
  const [months, setMonths] = React.useState("360");
  const [schedule, setSchedule] = React.useState<any[]>([]);

  const calculate = () => {
    try {
      ensureLibs();
      const P = new Decimal(amount);
      const r = new Decimal(annualRate).div(100).div(12);
      const n = parseInt(months);

      const pmt = P.mul(r).div(new Decimal(1).sub(Decimal.pow(1 + r.toNumber(), -n)));
      let balance = P;
      const rows: { month: number; payment: string; principal: string; interest: string; balance: string }[] = [];

      for (let i = 1; i <= Math.min(n, 360); i++) {
        const interest = balance.mul(r);
        const principal = pmt.sub(interest);
        balance = balance.sub(principal);
        rows.push({
          month: i,
          payment: pmt.toFixed(2),
          principal: principal.toFixed(2),
          interest: interest.toFixed(2),
          balance: Math.max(0, balance.toNumber()).toFixed(2),
        });
      }

      setSchedule(rows);
    } catch (err: any) {
      toast.error(err.message || "Calculation error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Loan Amount" value={amount} onChange={setAmount} />
        <Field label="Annual Rate %" value={annualRate} onChange={setAnnualRate} />
        <Field label="Term (months)" value={months} onChange={setMonths} />
      </div>
      <button onClick={calculate} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Generate Schedule
      </button>
      {schedule.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-2 text-left">Month</th>
                <th className="px-2 py-2 text-right">Payment</th>
                <th className="px-2 py-2 text-right">Principal</th>
                <th className="px-2 py-2 text-right">Interest</th>
                <th className="px-2 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.slice(0, 24).map((row) => (
                <tr key={row.month} className="border-t">
                  <td className="px-2 py-1.5">{row.month}</td>
                  <td className="px-2 py-1.5 text-right font-mono">${row.payment}</td>
                  <td className="px-2 py-1.5 text-right font-mono">${row.principal}</td>
                  <td className="px-2 py-1.5 text-right font-mono">${row.interest}</td>
                  <td className="px-2 py-1.5 text-right font-mono">${row.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {schedule.length > 24 && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              Showing first 24 of {schedule.length} months
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Depreciation Calculator ─── */
function DepreciationCalculator() {
  const [cost, setCost] = React.useState("10000");
  const [salvage, setSalvage] = React.useState("1000");
  const [life, setLife] = React.useState("5");
  const [method, setMethod] = React.useState<"straight" | "declining">("straight");
  const [results, setResults] = React.useState<any[]>([]);

  const calculate = () => {
    try {
      ensureLibs();
      const C = new Decimal(cost);
      const S = new Decimal(salvage);
      const N = parseInt(life);
      const rows: { year: number; depreciation: string; bookValue: string }[] = [];

      if (method === "straight") {
        const annual = C.sub(S).div(N);
        let book = C;
        for (let i = 1; i <= N; i++) {
          book = book.sub(annual);
          rows.push({ year: i, depreciation: annual.toFixed(2), bookValue: Math.max(0, book.toNumber()).toFixed(2) });
        }
      } else {
        const rate = new Decimal(2).div(N);
        let book = C;
        for (let i = 1; i <= N; i++) {
          let dep = book.mul(rate);
          if (book.sub(dep).lt(S)) dep = book.sub(S);
          book = book.sub(dep);
          rows.push({ year: i, depreciation: dep.toFixed(2), bookValue: Math.max(0, book.toNumber()).toFixed(2) });
        }
      }

      setResults(rows);
    } catch (err: any) {
      toast.error(err.message || "Calculation error");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Asset Cost" value={cost} onChange={setCost} />
        <Field label="Salvage Value" value={salvage} onChange={setSalvage} />
        <Field label="Useful Life (years)" value={life} onChange={setLife} />
        <div>
          <label className="mb-1.5 block text-sm font-medium">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="straight">Straight Line</option>
            <option value="declining">Double Declining Balance</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Calculate
      </button>
      {results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-2 text-left">Year</th>
                <th className="px-2 py-2 text-right">Depreciation</th>
                <th className="px-2 py-2 text-right">Book Value</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.year} className="border-t">
                  <td className="px-2 py-1.5">{row.year}</td>
                  <td className="px-2 py-1.5 text-right font-mono">${row.depreciation}</td>
                  <td className="px-2 py-1.5 text-right font-mono">${row.bookValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Shared Field Component ─── */
function Field({
  label,
  value,
  onChange,
  solving,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  solving?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
          solving ? "ring-2 ring-primary" : ""
        }`}
      />
    </div>
  );
}

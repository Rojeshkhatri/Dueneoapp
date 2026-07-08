"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  RotateCcw,
  Trophy,
  Clock,
  Briefcase,
  Star,
  Plane,
  Gift,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { formatCurrency, formatNumber, parseNumber } from "./_hr-helpers";

interface Offer {
  id: string;
  company: string;
  baseSalary: number;
  bonus: number;
  equityAnnualized: number;
  benefitsValue: number;
  commuteMinutesPerDay: number;
  ptoDays: number;
}

function uid(): string {
  return `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_OFFERS: Offer[] = [
  {
    id: "o1",
    company: "Acme Corp",
    baseSalary: 140000,
    bonus: 15000,
    equityAnnualized: 20000,
    benefitsValue: 12000,
    commuteMinutesPerDay: 60,
    ptoDays: 20,
  },
  {
    id: "o2",
    company: "Beta Inc",
    baseSalary: 130000,
    bonus: 20000,
    equityAnnualized: 30000,
    benefitsValue: 15000,
    commuteMinutesPerDay: 30,
    ptoDays: 25,
  },
  {
    id: "o3",
    company: "Gamma Labs",
    baseSalary: 150000,
    bonus: 10000,
    equityAnnualized: 10000,
    benefitsValue: 10000,
    commuteMinutesPerDay: 90,
    ptoDays: 15,
  },
];

interface OfferMetrics {
  totalComp: number;
  // Effective hourly rate: total comp / annual work hours adjusted for commute.
  // Annual work hours = (52 weeks × 5 work days − PTO days) × 8 hours.
  // Commute adds commuteMinutesPerDay × work days to the &quot;time cost&quot; of the job.
  annualWorkHours: number;
  annualCommuteHours: number;
  totalHours: number;
  effectiveHourlyRate: number;
  ptoValueAtDailyRate: number;
}

function computeMetrics(o: Offer): OfferMetrics {
  const totalComp = o.baseSalary + o.bonus + o.equityAnnualized + o.benefitsValue;
  const workDays = Math.max(0, 52 * 5 - o.ptoDays);
  const annualWorkHours = workDays * 8;
  const annualCommuteHours = (o.commuteMinutesPerDay / 60) * workDays;
  const totalHours = annualWorkHours + annualCommuteHours;
  const effectiveHourlyRate = totalHours > 0 ? totalComp / totalHours : 0;
  // PTO value at the daily rate (base + bonus + equity + benefits / work days)
  const dailyRate = workDays > 0 ? totalComp / workDays : 0;
  const ptoValueAtDailyRate = o.ptoDays * dailyRate;
  return {
    totalComp,
    annualWorkHours,
    annualCommuteHours,
    totalHours,
    effectiveHourlyRate,
    ptoValueAtDailyRate,
  };
}

export function OfferComparisonTool({ tool }: { tool: ToolDefinition }) {
  const [offers, setOffers] = React.useState<Offer[]>(DEFAULT_OFFERS);

  const addOffer = () => {
    if (offers.length >= 4) {
      toast.error("Maximum 4 offers supported");
      return;
    }
    setOffers((p) => [
      ...p,
      {
        id: uid(),
        company: `Offer ${p.length + 1}`,
        baseSalary: 0,
        bonus: 0,
        equityAnnualized: 0,
        benefitsValue: 0,
        commuteMinutesPerDay: 0,
        ptoDays: 0,
      },
    ]);
  };

  const removeOffer = (id: string) => {
    setOffers((p) => p.filter((o) => o.id !== id));
  };

  const updateOffer = (id: string, patch: Partial<Offer>) => {
    setOffers((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const reset = () => {
    setOffers(DEFAULT_OFFERS);
    toast.success("Reset to sample offers");
  };

  const metrics = React.useMemo(() => offers.map(computeMetrics), [offers]);

  const bestTotalCompIdx = React.useMemo(() => {
    if (metrics.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < metrics.length; i++) {
      if (metrics[i].totalComp > metrics[best].totalComp) best = i;
    }
    return best;
  }, [metrics]);

  const bestHourlyIdx = React.useMemo(() => {
    if (metrics.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < metrics.length; i++) {
      if (metrics[i].effectiveHourlyRate > metrics[best].effectiveHourlyRate) best = i;
    }
    return best;
  }, [metrics]);

  const toolBody = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={addOffer} disabled={offers.length >= 4}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add offer ({offers.length}/4)
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {/* Offer input cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {offers.map((o, idx) => {
          const m = metrics[idx];
          const isBestComp = idx === bestTotalCompIdx;
          const isBestHourly = idx === bestHourlyIdx;
          return (
            <div key={o.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <Input
                  value={o.company}
                  onChange={(e) => updateOffer(o.id, { company: e.target.value })}
                  className="h-9 flex-1 font-semibold"
                  aria-label="Company name"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOffer(o.id)}
                  aria-label={`Remove ${o.company}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`base-${o.id}`} className="text-xs">Base salary</Label>
                  <Input
                    id={`base-${o.id}`}
                    type="number"
                    min={0}
                    value={o.baseSalary || ""}
                    onChange={(e) => updateOffer(o.id, { baseSalary: parseNumber(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`bonus-${o.id}`} className="text-xs">Annual bonus</Label>
                  <Input
                    id={`bonus-${o.id}`}
                    type="number"
                    min={0}
                    value={o.bonus || ""}
                    onChange={(e) => updateOffer(o.id, { bonus: parseNumber(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`equity-${o.id}`} className="text-xs">Equity (annualised $)</Label>
                  <Input
                    id={`equity-${o.id}`}
                    type="number"
                    min={0}
                    value={o.equityAnnualized || ""}
                    onChange={(e) => updateOffer(o.id, { equityAnnualized: parseNumber(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ben-${o.id}`} className="text-xs">Benefits value</Label>
                  <Input
                    id={`ben-${o.id}`}
                    type="number"
                    min={0}
                    value={o.benefitsValue || ""}
                    onChange={(e) => updateOffer(o.id, { benefitsValue: parseNumber(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`commute-${o.id}`} className="text-xs">Commute (min/day)</Label>
                  <Input
                    id={`commute-${o.id}`}
                    type="number"
                    min={0}
                    value={o.commuteMinutesPerDay || ""}
                    onChange={(e) => updateOffer(o.id, { commuteMinutesPerDay: parseNumber(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`pto-${o.id}`} className="text-xs">PTO (days/yr)</Label>
                  <Input
                    id={`pto-${o.id}`}
                    type="number"
                    min={0}
                    value={o.ptoDays || ""}
                    onChange={(e) => updateOffer(o.id, { ptoDays: parseNumber(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div
                  className={`rounded-lg border p-2.5 ${
                    isBestComp ? "border-emerald-500/50 bg-emerald-500/10" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Briefcase className="h-3 w-3" /> Total comp
                  </div>
                  <div className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                    {formatCurrency(m.totalComp)}
                  </div>
                  {isBestComp && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      <Trophy className="h-2.5 w-2.5" /> Best total comp
                    </div>
                  )}
                </div>
                <div
                  className={`rounded-lg border p-2.5 ${
                    isBestHourly ? "border-sky-500/50 bg-sky-500/10" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3 w-3" /> Eff. hourly rate
                  </div>
                  <div className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                    {formatCurrency(m.effectiveHourlyRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {isBestHourly && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                      <Star className="h-2.5 w-2.5" /> Best hourly
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-side comparison table */}
      {offers.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" /> Side-by-side comparison
          </h3>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Component</TableHead>
                  {offers.map((o, idx) => (
                    <TableHead key={o.id} className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold">{o.company || `Offer ${idx + 1}`}</span>
                        {idx === bestTotalCompIdx && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Trophy className="h-2.5 w-2.5" /> Top comp
                          </Badge>
                        )}
                        {idx === bestHourlyIdx && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Star className="h-2.5 w-2.5" /> Top hourly
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Base salary</TableCell>
                  {offers.map((o) => (
                    <TableCell key={o.id} className="text-right font-mono tabular-nums">
                      {formatCurrency(o.baseSalary)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Annual bonus</TableCell>
                  {offers.map((o) => (
                    <TableCell key={o.id} className="text-right font-mono tabular-nums">
                      {formatCurrency(o.bonus)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Equity (annualised)</TableCell>
                  {offers.map((o) => (
                    <TableCell key={o.id} className="text-right font-mono tabular-nums">
                      {formatCurrency(o.equityAnnualized)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5 text-primary" /> Benefits value
                    </span>
                  </TableCell>
                  {offers.map((o) => (
                    <TableCell key={o.id} className="text-right font-mono tabular-nums">
                      {formatCurrency(o.benefitsValue)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <Plane className="h-3.5 w-3.5 text-primary" /> PTO (days)
                    </span>
                  </TableCell>
                  {offers.map((o) => (
                    <TableCell key={o.id} className="text-right font-mono tabular-nums">
                      {formatNumber(o.ptoDays, { maximumFractionDigits: 1 })}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Commute (min/day)
                    </span>
                  </TableCell>
                  {offers.map((o) => (
                    <TableCell key={o.id} className="text-right font-mono tabular-nums">
                      {formatNumber(o.commuteMinutesPerDay, { maximumFractionDigits: 0 })}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-t-2 border-primary/20">
                  <TableCell className="font-bold">Total compensation</TableCell>
                  {metrics.map((m, idx) => (
                    <TableCell
                      key={idx}
                      className={`text-right font-mono font-bold tabular-nums ${
                        idx === bestTotalCompIdx ? "text-emerald-600 dark:text-emerald-400" : ""
                      }`}
                    >
                      {formatCurrency(m.totalComp)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Annual work hours</TableCell>
                  {metrics.map((m, idx) => (
                    <TableCell key={idx} className="text-right font-mono tabular-nums">
                      {formatNumber(m.annualWorkHours, { maximumFractionDigits: 0 })}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Annual commute hours</TableCell>
                  {metrics.map((m, idx) => (
                    <TableCell key={idx} className="text-right font-mono tabular-nums">
                      {formatNumber(m.annualCommuteHours, { maximumFractionDigits: 0 })}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold">Effective hourly rate</TableCell>
                  {metrics.map((m, idx) => (
                    <TableCell
                      key={idx}
                      className={`text-right font-mono font-bold tabular-nums ${
                        idx === bestHourlyIdx ? "text-sky-600 dark:text-sky-400" : ""
                      }`}
                    >
                      {formatCurrency(m.effectiveHourlyRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <Trophy className="h-4 w-4" /> Best by total compensation
              </div>
              <p className="mt-1 text-sm">
                {offers[bestTotalCompIdx]?.company || "—"} pays the highest total comp at{" "}
                <span className="font-mono font-semibold">
                  {formatCurrency(metrics[bestTotalCompIdx]?.totalComp ?? 0)}
                </span>
                .
              </p>
            </div>
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-300">
                <Star className="h-4 w-4" /> Best by effective hourly rate
              </div>
              <p className="mt-1 text-sm">
                {offers[bestHourlyIdx]?.company || "—"} has the highest effective hourly rate at{" "}
                <span className="font-mono font-semibold">
                  {formatCurrency(metrics[bestHourlyIdx]?.effectiveHourlyRate ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  /hr
                </span>{" "}
                — factoring in commute time and PTO.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Compare 2–4 job offers side by side. Enter base salary, bonus, annualised equity, benefits value, commute time and PTO days per offer. Dueneo calculates total compensation and effective hourly rate (factoring in commute time and PTO), highlights the best offer by each metric, and renders a side-by-side comparison table. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Add 2–4 offers",
        description:
          "Click \"Add offer\" to add up to 4 offers. Each card represents one offer with its full compensation breakdown.",
      },
      {
        title: "Fill in compensation components",
        description:
          "For each offer enter: base salary, annual bonus, annualised equity value (use a 4-year vest divided by 4 for annualised), benefits value (health, retirement match, perks in $/yr), commute minutes per day, and PTO days per year.",
      },
      {
        title: "Read total comp and effective hourly rate",
        description:
          "Each card shows total compensation (sum of all components) and effective hourly rate (total comp / (work hours + commute hours)). The best offer by each metric is highlighted.",
      },
      {
        title: "Compare side-by-side in the table",
        description:
          "The comparison table shows every component for every offer in one row, so you can see at a glance which offer wins on which dimension. Use the two summary cards to decide between max comp and max hourly.",
      },
    ],
    useCases: [
      "Decide between a higher-salary offer and a higher-equity offer by comparing total comp.",
      "Reveal that a high-salary offer with a 90-minute commute is actually worth less per hour than a lower-salary remote role.",
      "Quantify the value of PTO and benefits when comparing offers with very different structures.",
      "Negotiate: see exactly which lever (base, bonus, equity, benefits) to push on to close a gap with a competing offer.",
      "Compare a full-time offer against a contract rate by entering the contract annualised.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Equity is entered as an annualised dollar value. Convert your grant to annualised:
          (total shares × current strike price or FMV) / vesting years. This tool does not
          model vesting cliffs, accelerated vesting, or the risk that equity ends up worth $0.
        </li>
        <li>
          Effective hourly rate assumes 8-hour work days, 5 days/week, 52 weeks/year minus PTO.
          It does not account for actual overtime, on-call, or work-from-home time savings.
        </li>
        <li>
          Commute time is entered as minutes per day round-trip. The tool multiplies by working
          days (52×5 − PTO) to get annual commute hours and adds them to the time-cost denominator.
        </li>
        <li>
          Tax differences between jurisdictions are not modelled. Two offers with the same total
          comp can have very different post-tax value depending on state/country and equity
          treatment (RSU vs ISO vs NSO). Use a tax-aware calculator for the final decision.
        </li>
        <li>
          Benefits value is a single number you provide. It should aggregate health insurance
          premium value, retirement match, gym/learning stipends, parental leave above statutory,
          and other quantifiable perks. Subjective benefits (culture, growth) are not modelled.
        </li>
        <li>
          The tool does not factor in signing bonus (one-time) or relocation. Add signing bonus
          to year-1 total comp manually if you want it in the comparison.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How is effective hourly rate calculated?",
        a: "Effective hourly rate = total comp ÷ (annual work hours + annual commute hours). Annual work hours = (52 × 5 − PTO days) × 8. Annual commute hours = (commute minutes per day ÷ 60) × work days. A high-salary offer with a long commute can have a lower effective hourly rate than a lower-salary remote role.",
      },
      {
        q: "How should I annualise equity?",
        a: "Take the total grant value (shares × current FMV or strike price) and divide by the vesting period in years. A 4-year vest of $400K = $100K/year annualised. For RSUs use FMV; for stock options subtract the strike price. This is a simplification — actual vesting cliffs and acceleration are not modelled.",
      },
      {
        q: "Why are the best-by-total-comp and best-by-hourly offers different?",
        a: "Because the hourly rate factors in commute time and PTO. An offer with $20K more comp but 60 minutes more commute per day can end up with a lower hourly rate — you're trading extra life-hours for that extra comp. Both metrics matter; pick based on your priorities.",
      },
      {
        q: "Does this account for taxes?",
        a: "No. Tax differences between states/countries, equity treatment (RSU vs ISO), and 401(k) match are not modelled. Two offers with the same pre-tax total comp can differ by 10–15% after tax. Use a tax-aware calculator for the final decision.",
      },
      {
        q: "Can I add a signing bonus?",
        a: "Not as a separate field — signing bonus is one-time, not annual. If you want it in the comparison, add it to the base salary field (it inflates year-1 only) and note that year-2+ comp will be lower.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

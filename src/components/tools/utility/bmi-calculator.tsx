"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Activity, RotateCcw, Scale } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { formatNum } from "./_calc-date-helpers";
import { parseNumber } from "../finance/_finance-helpers";

type Unit = "metric" | "imperial";

interface BmiBand {
  label: string;
  min: number;
  max: number;
  color: string;
  bg: string;
}

const BMI_BANDS: BmiBand[] = [
  {
    label: "Underweight",
    min: 0,
    max: 18.5,
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-100 dark:bg-sky-950/40",
  },
  {
    label: "Normal weight",
    min: 18.5,
    max: 25,
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
  },
  {
    label: "Overweight",
    min: 25,
    max: 30,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-950/40",
  },
  {
    label: "Obese",
    min: 30,
    max: Infinity,
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-100 dark:bg-rose-950/40",
  },
];

function bandFor(bmi: number): BmiBand {
  return BMI_BANDS.find((b) => bmi >= b.min && bmi < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1];
}

export function BMICalculator({ tool }: { tool: ToolDefinition }) {
  const [unit, setUnit] = React.useState<Unit>("metric");

  // Metric inputs
  const [heightCm, setHeightCm] = React.useState<string>("175");
  const [weightKg, setWeightKg] = React.useState<string>("70");

  // Imperial inputs
  const [ft, setFt] = React.useState<string>("5");
  const [inch, setInch] = React.useState<string>("9");
  const [lb, setLb] = React.useState<string>("154");

  // Compute height in metres and weight in kg consistently
  const heightM = React.useMemo(() => {
    if (unit === "metric") {
      const cm = parseNumber(heightCm);
      return cm > 0 ? cm / 100 : 0;
    }
    const f = parseNumber(ft);
    const i = parseNumber(inch);
    const totalIn = f * 12 + i;
    return totalIn > 0 ? totalIn * 0.0254 : 0;
  }, [unit, heightCm, ft, inch]);

  const weightKgVal = React.useMemo(() => {
    if (unit === "metric") return parseNumber(weightKg);
    return parseNumber(lb) * 0.45359237;
  }, [unit, weightKg, lb]);

  const bmi = heightM > 0 && weightKgVal > 0 ? weightKgVal / (heightM * heightM) : 0;
  const hasInput = heightM > 0 && weightKgVal > 0;
  const band = hasInput ? bandFor(bmi) : null;

  // Healthy weight range: BMI 18.5 – 24.9 × height²
  const healthyLow = heightM > 0 ? 18.5 * heightM * heightM : 0;
  const healthyHigh = heightM > 0 ? 24.9 * heightM * heightM : 0;

  // Display helpers based on unit
  const formatWeight = (kg: number) =>
    unit === "metric" ? `${formatNum(kg, 1)} kg` : `${formatNum(kg / 0.45359237, 1)} lb`;
  const formatHeightDisplay = () => {
    if (unit === "metric") return `${formatNum(heightM * 100, 0)} cm`;
    const totalIn = heightM / 0.0254;
    const f = Math.floor(totalIn / 12);
    const i = totalIn - f * 12;
    return `${f} ft ${formatNum(i, 0)} in`;
  };

  const reset = () => {
    setUnit("metric");
    setHeightCm("175");
    setWeightKg("70");
    setFt("5");
    setInch("9");
    setLb("154");
  };

  const summary = hasInput
    ? `BMI ${formatNum(bmi, 1)} (${band?.label ?? ""}) — height ${formatHeightDisplay()}, weight ${formatWeight(
        weightKgVal
      )}. Healthy weight range: ${formatWeight(healthyLow)} – ${formatWeight(healthyHigh)}.`
    : "";

  // Band indicator position on a 0–40 scale
  const indicatorPct = hasInput ? Math.min(100, (bmi / 40) * 100) : 0;

  const toolBody = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={unit}
          onValueChange={(v) => v && setUnit(v as Unit)}
          variant="outline"
        >
          <ToggleGroupItem value="metric" aria-label="Metric units">
            Metric (cm / kg)
          </ToggleGroupItem>
          <ToggleGroupItem value="imperial" aria-label="Imperial units">
            Imperial (ft·in / lb)
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          {unit === "metric" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bmi-height-cm">Height (cm)</Label>
                <Input
                  id="bmi-height-cm"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmi-weight-kg">Weight (kg)</Label>
                <Input
                  id="bmi-weight-kg"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bmi-ft">Height (ft)</Label>
                <Input
                  id="bmi-ft"
                  inputMode="decimal"
                  value={ft}
                  onChange={(e) => setFt(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmi-in">Height (in)</Label>
                <Input
                  id="bmi-in"
                  inputMode="decimal"
                  value={inch}
                  onChange={(e) => setInch(e.target.value)}
                  placeholder="9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmi-lb">Weight (lb)</Label>
                <Input
                  id="bmi-lb"
                  inputMode="decimal"
                  value={lb}
                  onChange={(e) => setLb(e.target.value)}
                  placeholder="154"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            BMI is calculated as weight ÷ (height)². Switch units at any time — values
            are converted automatically.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Result</h3>
            {hasInput && <CopyButton value={summary} size="sm" />}
          </div>

          {!hasInput && (
            <p className="text-sm text-muted-foreground">
              Enter a valid height and weight to see your BMI.
            </p>
          )}

          {hasInput && band && (
            <>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-5xl font-bold tabular-nums text-foreground">
                  {formatNum(bmi, 1)}
                </span>
                <span className="text-sm text-muted-foreground">kg/m²</span>
              </div>

              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${band.bg} ${band.color}`}>
                <Activity className="h-3.5 w-3.5" />
                {band.label}
              </div>

              {/* BMI scale */}
              <div className="space-y-1.5">
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  <div className="flex-1 bg-sky-300 dark:bg-sky-800" />
                  <div className="flex-1 bg-emerald-300 dark:bg-emerald-800" />
                  <div className="flex-1 bg-amber-300 dark:bg-amber-800" />
                  <div className="flex-1 bg-rose-300 dark:bg-rose-800" />
                </div>
                <div className="relative h-3">
                  <div
                    className="absolute -translate-x-1/2"
                    style={{ left: `${indicatorPct}%`, top: 0 }}
                  >
                    <div className="h-3 w-3 rounded-full border-2 border-background bg-foreground shadow" />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0</span>
                  <span>18.5</span>
                  <span>25</span>
                  <span>30</span>
                  <span>40+</span>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Scale className="h-3.5 w-3.5 text-primary" /> Healthy weight range
                </div>
                <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                  {formatWeight(healthyLow)} – {formatWeight(healthyHigh)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  For your height of {formatHeightDisplay()}, the BMI 18.5–24.9 range corresponds
                  to this weight band.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Calculate your Body Mass Index (BMI) from your height and weight, see which category you fall into (underweight, normal, overweight or obese) and view the healthy weight range for your height. Switch between metric (cm / kg) and imperial (ft·in / lb) units at any time.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick your units",
        description:
          "Toggle between metric (centimetres / kilograms) and imperial (feet·inches / pounds). The conversion is handled for you.",
      },
      {
        title: "Enter height and weight",
        description:
          "Type your height and weight into the inputs. The BMI updates live as you type — no need to click calculate.",
      },
      {
        title: "Read the BMI and category",
        description:
          "Your BMI is shown as kg/m² along with a coloured category badge and a position marker on the BMI scale.",
      },
      {
        title: "Check your healthy range",
        description:
          "The healthy weight range shows the weight band corresponding to BMI 18.5–24.9 for your height.",
      },
    ],
    useCases: [
      "Track changes in your BMI as part of a fitness or weight-management programme.",
      "Quick screening during a doctor’s visit or insurance health check.",
      "Compare BMI between metric and imperial measurements without manual conversion.",
      "Set a realistic target weight by aiming for the middle of the healthy range.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          BMI is a screening tool, not a diagnostic of body fatness or health. Very muscular
          individuals often register as “overweight” despite low body fat.
        </li>
        <li>
          BMI does not distinguish between fat mass and lean mass, nor account for fat
          distribution (visceral vs subcutaneous).
        </li>
        <li>
          The healthy range (18.5–24.9) is the WHO adult classification and may not apply to
          children, athletes, pregnant people, or older adults. Consult a clinician for
          personal guidance.
        </li>
        <li>
          Categories use adult cutoffs; some Asian populations use lower thresholds (23 / 27.5)
          for elevated risk — this tool uses the international WHO cutoffs.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "What BMI categories does this use?",
        a: "Underweight < 18.5, Normal 18.5–24.9, Overweight 25–29.9, Obese 30+. These are the World Health Organization adult classifications.",
      },
      {
        q: "Is BMI accurate for athletes?",
        a: "Not really. BMI cannot tell muscle from fat, so a bodybuilder with low body fat may still fall into the “overweight” band. Body-fat percentage or waist-to-hip ratio are better metrics in that case.",
      },
      {
        q: "How is the healthy weight range calculated?",
        a: "We square your height in metres and multiply by 18.5 (lower bound) and 24.9 (upper bound). The result is the weight band that keeps your BMI in the normal range.",
      },
      {
        q: "Does this work for children?",
        a: "No. Pediatric BMI uses age- and sex-specific percentile charts, not the adult cutoffs. Please consult a pediatrician for children.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

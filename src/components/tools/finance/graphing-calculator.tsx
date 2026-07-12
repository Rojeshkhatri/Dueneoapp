"use client";

import * as React from "react";
import { CalcButton } from "./_calculator-suite";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

// function-plot loaded dynamically
let functionPlot: any = null;

interface PlotFunction {
  id: string;
  expr: string;
  color: string;
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];

export function GraphingContent() {
  return <GraphingCalculatorInner />;
}

export function GraphingCalculator({ tool }: { tool?: ToolDefinition }) {
  if (!tool) return <GraphingContent />;

  const content: ToolContent = {
    intro: "Plot mathematical functions with zoom, pan, and multi-function overlay. Supports trigonometry, logarithms, polynomials, and exponential functions.",
    tool: <GraphingContent />,
    howTo: [
      { title: "Enter a function", description: "Type a function of x in the input field (e.g., x^2, sin(x), 2*x+1). Press Enter or click Graph." },
      { title: "Add multiple functions", description: "Click + Graph to overlay multiple curves. Each gets a different color." },
      { title: "Navigate the graph", description: "Scroll to zoom, click and drag to pan. Use Reset to restore the default view." },
    ],
    faq: [
      { q: "What functions can I plot?", a: "Polynomials, trigonometric (sin, cos, tan), logarithmic (log, ln), exponential (e^x), roots (sqrt), and combinations." },
      { q: "How do I zoom?", a: "Use your mouse scroll wheel or trackpad pinch gesture. The graph scales around the cursor position." },
      { q: "Can I find intersections?", a: "Visually, yes — overlapping curves show intersections. For precise values, use the Scientific Calculator tab." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function GraphingCalculatorInner() {
  const [functions, setFunctions] = React.useState<PlotFunction[]>([
    { id: "1", expr: "sin(x)", color: COLORS[0] },
  ]);
  const [inputExpr, setInputExpr] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const plotRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);

  // Load function-plot
  React.useEffect(() => {
    import("function-plot").then((m) => {
      functionPlot = m.default || m;
      setReady(true);
    });
  }, []);

  // Render graph
  React.useEffect(() => {
    if (!ready || !plotRef.current || functions.length === 0) return;

    try {
      plotRef.current.innerHTML = "";
      functionPlot({
        target: plotRef.current,
        width: plotRef.current.clientWidth || 600,
        height: 400,
        grid: true,
        xAxis: { domain: [-10, 10] },
        yAxis: { domain: [-6, 6] },
        data: functions.map((f) => ({
          fn: f.expr.replace(/\^/g, "**"),
          color: f.color,
          graphType: "polyline",
        })),
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || "Invalid function");
    }
  }, [functions, ready]);

  const addFunction = () => {
    if (!inputExpr.trim()) return;
    const newFn: PlotFunction = {
      id: Date.now().toString(),
      expr: inputExpr.trim(),
      color: COLORS[functions.length % COLORS.length],
    };
    setFunctions((prev) => [...prev, newFn]);
    setInputExpr("");
  };

  const removeFunction = (id: string) => {
    setFunctions((prev) => prev.filter((f) => f.id !== id));
  };

  const resetView = () => {
    setFunctions([{ id: "1", expr: "sin(x)", color: COLORS[0] }]);
    setError(null);
  };

  const addPreset = (expr: string) => {
    const exists = functions.some((f) => f.expr === expr);
    if (exists) return;
    const newFn: PlotFunction = {
      id: Date.now().toString(),
      expr,
      color: COLORS[functions.length % COLORS.length],
    };
    setFunctions((prev) => [...prev, newFn]);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputExpr}
          onChange={(e) => setInputExpr(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addFunction(); }}
          placeholder="Enter function of x, e.g. x^2, sin(x), 2*x+1"
          className="flex-1 rounded-lg border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          aria-label="Function expression"
        />
        <button onClick={addFunction} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Graph
        </button>
      </div>
      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {functions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {functions.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
              <span className="font-mono text-xs">{f.expr}</span>
              <button onClick={() => removeFunction(f.id)} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      )}
      <div ref={plotRef} className="overflow-hidden rounded-xl border bg-white" style={{ minHeight: 400 }} />
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Quick add:</span>
        {["x^2", "sin(x)", "cos(x)", "tan(x)", "1/x", "sqrt(x)", "x^3", "log(x)", "e^x"].map((expr) => (
          <button key={expr} onClick={() => addPreset(expr)} className="rounded-md border px-2 py-0.5 text-xs font-mono hover:bg-accent">{expr}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={resetView} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>
    </div>
  );
}

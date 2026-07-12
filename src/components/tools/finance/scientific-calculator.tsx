"use client";

import * as React from "react";
import { CalculatorSuite, CalcDisplay, CalcButton, type CalculatorTab } from "./_calculator-suite";
import { GraphingContent } from "./graphing-calculator";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";

// Math.js loaded dynamically to keep initial bundle small
let math: typeof import("mathjs") | null = null;

function getMath() {
  if (!math) {
    // mathjs is loaded on first use
    throw new Error("MATH_NOT_LOADED");
  }
  return math;
}

export function ScientificCalculator({ tool }: { tool: ToolDefinition }) {
  const [tab, setTab] = React.useState<CalculatorTab>("scientific");
  const [expression, setExpression] = React.useState("");
  const [result, setResult] = React.useState("0");
  const [history, setHistory] = React.useState<{ expr: string; result: string }[]>([]);
  const [memory, setMemory] = React.useState(0);
  const [mathReady, setMathReady] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load mathjs on mount
  React.useEffect(() => {
    import("mathjs").then((m) => {
      math = m;
      setMathReady(true);
    });
  }, []);

  const evaluate = React.useCallback(() => {
    if (!expression.trim() || !mathReady) return;
    try {
      const m = getMath();
      // Convert display symbols to mathjs format
      let expr = expression
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/π/g, "pi")
        .replace(/√/g, "sqrt")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3");

      const evalResult = m.evaluate(expr);
      const numResult =
        typeof evalResult === "number"
          ? m.format(evalResult, { precision: 14 })
          : String(evalResult);

      setResult(numResult);
      setHistory((prev) => [{ expr: expression, result: numResult }, ...prev].slice(0, 50));
    } catch (err: any) {
      setResult("Error");
      toast.error(err.message || "Invalid expression");
    }
  }, [expression, mathReady]);

  const appendToExpression = (text: string) => {
    setExpression((prev) => prev + text);
    inputRef.current?.focus();
  };

  const clear = () => {
    setExpression("");
    setResult("0");
  };

  const backspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const memoryAdd = () => {
    try {
      const m = getMath();
      const val = Number(m.evaluate(expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")));
      setMemory((prev) => prev + val);
      toast.success(`Added to memory: ${val}`);
    } catch {}
  };

  const memoryRecall = () => {
    setExpression((prev) => prev + memory.toString());
  };

  const memoryClear = () => {
    setMemory(0);
    toast.success("Memory cleared");
  };

  // Keyboard support
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        evaluate();
      } else if (e.key === "Escape") {
        clear();
      } else if (e.key === "Backspace" && !e.metaKey) {
        // Let input handle its own backspace
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [evaluate]);

  const scientificContent = (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Display */}
      <CalcDisplay value={result} expression={expression || undefined} />

      {/* Expression input */}
      <input
        ref={inputRef}
        type="text"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") evaluate();
        }}
        placeholder="Type expression or use buttons..."
        className="w-full rounded-lg border bg-background px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label="Mathematical expression"
        autoFocus
      />

      {/* Memory indicator */}
      {memory !== 0 && (
        <div className="text-xs text-muted-foreground">
          Memory: {memory}
        </div>
      )}

      {/* Scientific functions */}
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: "sin", fn: "sin(" },
          { label: "cos", fn: "cos(" },
          { label: "tan", fn: "tan(" },
          { label: "log", fn: "log(" },
          { label: "ln", fn: "ln(" },
          { label: "asin", fn: "asin(" },
          { label: "acos", fn: "acos(" },
          { label: "atan", fn: "atan(" },
          { label: "√", fn: "sqrt(" },
          { label: "x²", fn: "^2" },
          { label: "x³", fn: "^3" },
          { label: "xⁿ", fn: "^(" },
          { label: "π", fn: "pi" },
          { label: "e", fn: "e" },
          { label: "abs", fn: "abs(" },
          { label: "ceil", fn: "ceil(" },
          { label: "floor", fn: "floor(" },
          { label: "%", fn: "%" },
          { label: "(", fn: "(" },
          { label: ")", fn: ")" },
        ].map((btn) => (
          <CalcButton
            key={btn.label}
            onClick={() => appendToExpression(btn.fn)}
            variant="function"
          >
            {btn.label}
          </CalcButton>
        ))}
      </div>

      {/* Number pad + operators */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* eslint-disable-next-line react-hooks/refs -- false positive: no refs accessed, only state setters */}
        {[
          { label: "MC", action: memoryClear, variant: "clear" as const },
          { label: "MR", action: memoryRecall, variant: "function" as const },
          { label: "M+", action: memoryAdd, variant: "function" as const },
          { label: "C", action: clear, variant: "clear" as const },
          { label: "7", action: () => appendToExpression("7") },
          { label: "8", action: () => appendToExpression("8") },
          { label: "9", action: () => appendToExpression("9") },
          { label: "÷", action: () => appendToExpression("÷"), variant: "operator" as const },
          { label: "4", action: () => appendToExpression("4") },
          { label: "5", action: () => appendToExpression("5") },
          { label: "6", action: () => appendToExpression("6") },
          { label: "×", action: () => appendToExpression("×"), variant: "operator" as const },
          { label: "1", action: () => appendToExpression("1") },
          { label: "2", action: () => appendToExpression("2") },
          { label: "3", action: () => appendToExpression("3") },
          { label: "−", action: () => appendToExpression("−"), variant: "operator" as const },
          { label: "0", action: () => appendToExpression("0") },
          { label: ".", action: () => appendToExpression(".") },
          { label: "⌫", action: backspace, variant: "function" as const },
          { label: "+", action: () => appendToExpression("+"), variant: "operator" as const },
        ].map((btn) => (
          <CalcButton
            key={btn.label}
            onClick={btn.action}
            variant={btn.variant || "default"}
          >
            {btn.label}
          </CalcButton>
        ))}
        <CalcButton onClick={evaluate} variant="equals" span={4}>
          =
        </CalcButton>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-medium">History</h3>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setExpression(h.expr)}
                className="flex w-full justify-between rounded px-2 py-1 text-xs hover:bg-accent"
              >
                <span className="font-mono text-muted-foreground">{h.expr}</span>
                <span className="font-mono font-semibold">= {h.result}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const guideData = {
    scientific: {
      title: "Scientific Calculator",
      sections: [
        {
          heading: "Basic Operations",
          content: (
            <p>
              Use the number pad and operator buttons (+, −, ×, ÷) for basic arithmetic.
              Press <strong>=</strong> or <strong>Enter</strong> to evaluate. Use <strong>⌫</strong> to
              delete the last character and <strong>C</strong> to clear everything.
            </p>
          ),
        },
        {
          heading: "Scientific Functions",
          content: (
            <ul className="list-disc space-y-1 pl-4">
              <li><strong>Trigonometry:</strong> sin, cos, tan and their inverses (asin, acos, atan). Input is in radians by default.</li>
              <li><strong>Logarithms:</strong> log (base 10), ln (natural log)</li>
              <li><strong>Powers:</strong> x² (square), x³ (cube), xⁿ (any power via ^)</li>
              <li><strong>Roots:</strong> √ (square root), use x^(1/n) for nth root</li>
              <li><strong>Constants:</strong> π ≈ 3.14159, e ≈ 2.71828</li>
              <li><strong>Rounding:</strong> ceil (round up), floor (round down), abs (absolute value)</li>
            </ul>
          ),
        },
        {
          heading: "Memory Functions",
          content: (
            <ul className="list-disc space-y-1 pl-4">
              <li><strong>M+</strong> — Add current result to memory</li>
              <li><strong>MR</strong> — Recall memory value into expression</li>
              <li><strong>MC</strong> — Clear memory</li>
            </ul>
          ),
        },
        {
          heading: "Keyboard Shortcuts",
          content: (
            <ul className="list-disc space-y-1 pl-4">
              <li><strong>Enter</strong> — Evaluate expression</li>
              <li><strong>Escape</strong> — Clear all</li>
              <li>Numbers and operators can be typed directly</li>
            </ul>
          ),
        },
        {
          heading: "Common Formulas",
          content: (
            <div className="space-y-2 font-mono text-xs">
              <p>Pythagorean theorem: <code>a² + b² = c²</code></p>
              <p>Quadratic formula: <code>x = (-b ± √(b²-4ac)) / 2a</code></p>
              <p>Compound interest: <code>A = P(1 + r/n)^(nt)</code></p>
              <p>Area of circle: <code>A = π × r²</code></p>
              <p>Distance formula: <code>d = √((x₂-x₁)² + (y₂-y₁)²)</code></p>
            </div>
          ),
        },
      ],
    },
    graphing: {
      title: "Graphing Calculator",
      sections: [
        {
          heading: "How to Graph",
          content: (
            <p>
              Enter a function of <strong>x</strong> in the input field (e.g.,{" "}
              <code>x^2</code>, <code>sin(x)</code>, <code>2*x + 1</code>).
              Press <strong>Graph</strong> or <strong>Enter</strong> to plot. Use standard math notation —
              multiplication must be explicit (<code>2*x</code> not <code>2x</code>).
            </p>
          ),
        },
        {
          heading: "Supported Functions",
          content: (
            <ul className="list-disc space-y-1 pl-4">
              <li><strong>Polynomials:</strong> x^2, x^3 - 2*x + 1</li>
              <li><strong>Trig:</strong> sin(x), cos(x), tan(x)</li>
              <li><strong>Logarithmic:</strong> log(x), ln(x), log(x, 10)</li>
              <li><strong>Exponential:</strong> e^x, 2^x, exp(x)</li>
              <li><strong>Roots:</strong> sqrt(x), abs(x)</li>
              <li><strong>Constants:</strong> pi, e</li>
            </ul>
          ),
        },
        {
          heading: "Navigation",
          content: (
            <ul className="list-disc space-y-1 pl-4">
              <li><strong>Zoom:</strong> Scroll wheel or pinch gesture</li>
              <li><strong>Pan:</strong> Click and drag</li>
              <li><strong>Reset:</strong> Click the reset button to restore default view</li>
            </ul>
          ),
        },
      ],
    },
  };

  const content: ToolContent = {
    intro: "A TI-89 inspired scientific calculator with trigonometry, logarithms, symbolic algebra, graphing, and financial calculations. All processing happens in your browser.",
    tool: (
      <CalculatorSuite
        activeTab={tab}
        onTabChange={setTab}
        scientific={scientificContent}
        graphing={<GraphingContent />}
        guide={guideData}
      />
    ),
    howTo: [
      { title: "Type or click", description: "Enter expressions using the on-screen buttons or your keyboard. Press Enter or = to evaluate." },
      { title: "Switch calculators", description: "Use the tabs at the top to switch between Scientific and Graphing calculators. For business calculations, use the dedicated Business Calculator tool." },
      { title: "Use the guide", description: "Expand the guide section below for formulas, function references, and worked examples." },
    ],
    faq: [
      { q: "Is this calculator free?", a: "Yes, completely free with no signup required. All calculations happen in your browser." },
      { q: "Does it work offline?", a: "After the first load, the calculator works offline since all computation is client-side." },
      { q: "How accurate are the financial calculations?", a: "Financial calculations use Decimal.js for precision — no floating-point rounding errors." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

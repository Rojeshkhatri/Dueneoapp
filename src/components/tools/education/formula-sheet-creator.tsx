"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Printer, RotateCcw, FunctionSquare } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, loadJSON, saveJSON, EDU_DISCLAIMER } from "./_edu-helpers";

interface Formula {
  id: string;
  name: string;
  formula: string;
  category: string;
}

const STORAGE_KEY = "dueneo:formula-sheet:v1";
const DEFAULT_CATEGORIES = ["Maths", "Physics", "Chemistry", "Statistics", "Other"];

/**
 * Render a plain-text or LaTeX-ish formula. KaTeX isn't installed in this
 * project, so we render in a monospace block and treat $...$ / $$...$$ as
 * plain text (no rendering). The user can paste LaTeX source as-is.
 */
function FormulaView({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed) {
    return <span className="italic text-muted-foreground">(empty formula)</span>;
  }
  return (
    <code className="block whitespace-pre-wrap break-words rounded-md bg-muted/60 px-3 py-2 font-mono text-sm leading-relaxed">
      {trimmed}
    </code>
  );
}

export function FormulaSheetCreator({ tool }: { tool: ToolDefinition }) {
  const [formulas, setFormulas] = React.useState<Formula[]>(() =>
    loadJSON<Formula[]>(STORAGE_KEY, [
      { id: uid(), name: "Quadratic formula", formula: "x = (-b ± √(b² - 4ac)) / 2a", category: "Maths" },
      { id: uid(), name: "Pythagoras", formula: "a² + b² = c²", category: "Maths" },
      { id: uid(), name: "Newton's 2nd law", formula: "F = m · a", category: "Physics" },
      { id: uid(), name: "Ideal gas law", formula: "PV = nRT", category: "Chemistry" },
    ])
  );
  const [name, setName] = React.useState("");
  const [formula, setFormula] = React.useState("");
  const [category, setCategory] = React.useState<string>("Maths");
  const [customCategory, setCustomCategory] = React.useState<string>("");

  React.useEffect(() => {
    saveJSON(STORAGE_KEY, formulas);
  }, [formulas]);

  const categories = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    formulas.forEach((f) => set.add(f.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [formulas]);

  const add = () => {
    if (!formula.trim()) {
      toast.error("Add a formula first.");
      return;
    }
    const cat = category === "__custom" ? (customCategory.trim() || "Other") : category;
    setFormulas((p) => [...p, { id: uid(), name: name.trim() || "Untitled", formula: formula.trim(), category: cat }]);
    setName("");
    setFormula("");
    setCustomCategory("");
    setCategory("Maths");
    toast.success("Formula added");
  };

  const remove = (id: string) => setFormulas((p) => p.filter((f) => f.id !== id));

  const reset = () => {
    if (formulas.length === 0) return;
    if (!confirm("Delete all formulas?")) return;
    setFormulas([]);
    toast.info("Cleared.");
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, Formula[]>();
    for (const f of formulas) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [formulas]);

  const printSheet = () => {
    if (formulas.length === 0) {
      toast.error("Add at least one formula first.");
      return;
    }
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Formula sheet</title>
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.4; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
  .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  .row { margin: 8px 0; page-break-inside: avoid; }
  .name { font-weight: 600; font-size: 13px; }
  .formula { font-family: 'JetBrains Mono', 'Courier New', monospace; background: #f4f4f5; padding: 6px 10px; border-radius: 4px; font-size: 14px; margin-top: 2px; white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<h1>Formula sheet</h1>
<div class="meta">${formulas.length} formulas · printed ${new Date().toLocaleDateString()}</div>
${grouped.map(([cat, list]) => `<h2>${escapeHtml(cat)}</h2>${list.map((f) => `<div class="row"><div class="name">${escapeHtml(f.name)}</div><div class="formula">${escapeHtml(f.formula)}</div></div>`).join("")}`).join("")}
</body>
</html>`;
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!w) {
      toast.error("Popup blocked — allow popups for this site to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.document.title = "Formula sheet";
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* ignore */ } }, 400);
    toast.success("Opened print view");
  };

  const content: ToolContent = {
    intro:
      "Build a personal formula sheet by adding formulas (LaTeX source or plain text) and grouping them by category. Organise by topic, render in a clean monospace block, and print a tidy one-pager via your browser's print dialog — perfect for cheat sheets you're allowed to bring into an exam.",
    tool: (
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FunctionSquare className="h-4 w-4 text-primary" /> Add a formula
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fs-name">Name</Label>
              <Input id="fs-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Quadratic formula" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fs-formula">Formula (LaTeX or plain text)</Label>
              <Textarea
                id="fs-formula"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                rows={2}
                placeholder="x = (-b ± √(b² - 4ac)) / 2a"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__custom">+ New category…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {category === "__custom" && (
              <div className="space-y-2">
                <Label htmlFor="fs-cat">New category name</Label>
                <Input id="fs-cat" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Biology" />
              </div>
            )}
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button onClick={add}>
                <Plus className="mr-1.5 h-4 w-4" /> Add formula
              </Button>
              <Button variant="outline" onClick={printSheet} disabled={formulas.length === 0}>
                <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
              </Button>
              <Button variant="ghost" onClick={reset} disabled={formulas.length === 0} className="ml-auto text-destructive">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {formulas.length} formula{formulas.length === 1 ? "" : "s"} · {grouped.length} categor{grouped.length === 1 ? "y" : "ies"}
          </h3>
          <Badge variant="outline">Saved in browser</Badge>
        </div>

        {formulas.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No formulas yet. Add one above — it will be saved automatically.
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([cat, list]) => (
              <Card key={cat}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{cat} · {list.length}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {list.map((f) => (
                    <div key={f.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{f.name}</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(f.id)} aria-label="Remove formula">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <FormulaView value={f.formula} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Add a formula",
        description: "Type a name, the formula (LaTeX source like $E=mc^2$ or plain text like E = mc²), and pick or create a category.",
      },
      {
        title: "Organise by category",
        description: "Formulas are grouped by category and sorted alphabetically. Add your own categories (e.g. 'Biology') on the fly.",
      },
      {
        title: "Print or save as PDF",
        description: "Click Print / Save as PDF to open a clean, page-formatted view. Use your browser's 'Save as PDF' option in the print dialog.",
      },
    ],
    useCases: [
      "Compile the formulas you're allowed to bring into an open-book exam.",
      "Build a personal cheat sheet for a unit you're studying.",
      "Print a tidy one-page reference for a class you teach.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>Formulas are rendered in monospace as plain text — LaTeX source is preserved but not typeset (no KaTeX in this build). Use Unicode superscripts (², ³) and operators (·, ±, √) for clean display.</li>
        <li>Your sheet is saved in this browser only. Use the print option to make a PDF backup.</li>
      </ul>
    ),
    faq: [
      {
        q: "Does this render LaTeX?",
        a: "Not yet — there's no KaTeX dependency in this build. Formulas are shown in a monospace block as-is. You can paste LaTeX source for safekeeping; just be aware it won't be typeset on screen.",
      },
      {
        q: "Can I bring the printed sheet into my exam?",
        a: "Only if your exam allows a formula sheet — check your syllabus. The tool just produces a clean printout; it doesn't grant any permissions.",
      },
      {
        q: "How are categories created?",
        a: "Pick from the defaults (Maths, Physics, Chemistry, Statistics, Other) or choose '+ New category…' and type a custom name. Categories are auto-sorted alphabetically.",
      },
      {
        q: "Where is my sheet stored?",
        a: "In your browser's localStorage under 'dueneo:formula-sheet:v1'. It persists across reloads but is not synced across devices — print to PDF to take it with you.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

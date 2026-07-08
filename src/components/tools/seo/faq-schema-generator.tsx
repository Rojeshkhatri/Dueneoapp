"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { downloadText } from "../developer/_dev-helpers";

interface QA {
  id: string;
  question: string;
  answer: string;
}

const newId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_QAS: QA[] = [
  {
    id: newId(),
    question: "What is FAQ schema?",
    answer:
      "FAQPage JSON-LD is structured data that marks up a page of frequently asked questions and answers. Google may display the Q&A pairs directly in search results as rich snippets.",
  },
  {
    id: newId(),
    question: "Does FAQ schema still work in 2025?",
    answer:
      "Yes, but Google only shows FAQ rich results for authoritative government and health websites by default. Other sites can still benefit from the structured data for general indexing.",
  },
  {
    id: newId(),
    question: "Where do I add FAQ schema?",
    answer:
      "Add a <script type=\"application/ld+json\"> block in the page's <head> or <body>. The JSON-LD must describe the questions and answers visible on that specific page.",
  },
];

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
}

function validateQAs(qas: QA[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (qas.length === 0) {
    issues.push({ severity: "error", message: "Add at least one Q&A pair to generate schema." });
    return issues;
  }

  qas.forEach((qa, i) => {
    if (!qa.question.trim()) {
      issues.push({ severity: "error", message: `Q&A ${i + 1}: question is empty.` });
    } else if (qa.question.length > 120) {
      issues.push({
        severity: "warning",
        message: `Q&A ${i + 1}: question is ${qa.question.length} chars — keep it concise for the snippet.`,
      });
    }
    if (!qa.answer.trim()) {
      issues.push({ severity: "error", message: `Q&A ${i + 1}: answer is empty.` });
    } else if (qa.answer.length < 30) {
      issues.push({
        severity: "info",
        message: `Q&A ${i + 1}: answer is only ${qa.answer.length} chars — fuller answers tend to perform better.`,
      });
    }
    if (qa.answer.includes("<")) {
      issues.push({
        severity: "warning",
        message: `Q&A ${i + 1}: answer contains HTML-like markup. Google may strip or ignore it; plain text is safest.`,
      });
    }
  });

  // Detect duplicate questions.
  const seen = new Set<string>();
  qas.forEach((qa, i) => {
    const k = qa.question.trim().toLowerCase();
    if (k && seen.has(k)) {
      issues.push({
        severity: "warning",
        message: `Q&A ${i + 1}: duplicate question "${qa.question.slice(0, 40)}…".`,
      });
    }
    seen.add(k);
  });

  return issues;
}

function buildSchema(qas: QA[]): string {
  const valid = qas.filter((q) => q.question.trim() && q.answer.trim());
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((q) => ({
      "@type": "Question",
      name: q.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer.trim(),
      },
    })),
  };
  return JSON.stringify(schema, null, 2);
}

function buildHtmlBlock(jsonLd: string): string {
  return `<script type="application/ld+json">\n${jsonLd}\n</script>`;
}

const SEVERITY_STYLE = {
  error: { icon: XCircle, cls: "text-rose-600 dark:text-rose-400" },
  warning: { icon: AlertTriangle, cls: "text-amber-600 dark:text-amber-400" },
  info: { icon: CheckCircle2, cls: "text-sky-600 dark:text-sky-400" },
} as const;

export function FaqSchemaGenerator({ tool }: { tool: ToolDefinition }) {
  const [qas, setQas] = React.useState<QA[]>(DEFAULT_QAS);

  const update = (id: string, patch: Partial<QA>) =>
    setQas((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const addQa = () =>
    setQas((prev) => [
      ...prev,
      { id: newId(), question: "", answer: "" },
    ]);

  const removeQa = (id: string) =>
    setQas((prev) =>
      prev.length === 1 ? prev : prev.filter((q) => q.id !== id)
    );

  const reset = () => {
    setQas(DEFAULT_QAS);
    toast.info("Reset to defaults.");
  };

  const issues = React.useMemo(() => validateQAs(qas), [qas]);
  const jsonLd = React.useMemo(() => buildSchema(qas), [qas]);
  const htmlBlock = React.useMemo(() => buildHtmlBlock(jsonLd), [jsonLd]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  const content: ToolContent = {
    intro:
      "Add question-and-answer pairs and the tool generates FAQPage JSON-LD structured data, ready to paste into your page's HTML. Each Q&A is validated for empty fields, length and duplicate questions.",
    tool: (
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Q&A pairs ({qas.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addQa}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Q&A
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {qas.map((qa, i) => (
              <div
                key={qa.id}
                className="rounded-lg border bg-background p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Q&A {i + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeQa(qa.id)}
                    disabled={qas.length === 1}
                    aria-label={`Remove Q&A ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`q-${qa.id}`} className="text-xs">
                      Question
                    </Label>
                    <Input
                      id={`q-${qa.id}`}
                      value={qa.question}
                      onChange={(e) =>
                        update(qa.id, { question: e.target.value })
                      }
                      placeholder="e.g. What is FAQ schema?"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {qa.question.length} chars
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`a-${qa.id}`} className="text-xs">
                      Answer
                    </Label>
                    <Textarea
                      id={`a-${qa.id}`}
                      value={qa.answer}
                      onChange={(e) =>
                        update(qa.id, { answer: e.target.value })
                      }
                      placeholder="Plain text answer. Avoid HTML — Google may strip it."
                      rows={3}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {qa.answer.length} chars
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation */}
        <div className="rounded-xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Validation</h3>
            <div className="flex gap-2 text-xs">
              <span className={errorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                {errorCount} error{errorCount === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className={warningCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                {warningCount} warning{warningCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          {issues.length === 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> All Q&A pairs look good.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {issues.map((iss, i) => {
                const style = SEVERITY_STYLE[iss.severity];
                const Icon = style.icon;
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-1.5 text-xs ${style.cls}`}
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 flex-none" />
                    <span>{iss.message}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Output */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Generated FAQPage JSON-LD</h3>
            <div className="flex gap-1.5">
              <CopyButton
                value={() => {
                  navigator.clipboard.writeText(htmlBlock);
                  return htmlBlock;
                }}
                label="Copy <script>"
                size="sm"
              />
              <CopyButton value={jsonLd} label="Copy JSON" size="sm" />
              <Button
                variant="outline"
                size="sm"
                disabled={qas.every((q) => !q.question.trim() || !q.answer.trim())}
                onClick={() => {
                  downloadText(
                    "faq-schema.json",
                    jsonLd,
                    "application/json"
                  );
                  toast.success("Downloaded faq-schema.json");
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg border bg-background p-3 font-mono text-xs">
            <code>{jsonLd}</code>
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste the JSON-LD inside a{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              &lt;script type="application/ld+json"&gt;
            </code>{" "}
            block on your FAQ page. Use "Copy &lt;script&gt;" to get the full block ready to paste.
          </p>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Add your Q&A pairs",
        description:
          "Type a question and answer for each FAQ entry. Click Add Q&A to append a new row, or the trash icon to remove one.",
      },
      {
        title: "Fix validation issues",
        description:
          "The validation panel flags empty questions/answers, over-long questions, short answers and duplicate questions. Fix any errors before deploying.",
      },
      {
        title: "Copy the JSON-LD or full script block",
        description:
          "Use Copy JSON for the bare JSON, or Copy <script> for the full HTML script tag ready to paste into your page.",
      },
      {
        title: "Download and deploy",
        description:
          "Download faq-schema.json as a backup, then paste the script block into your page's <head> or <body> and deploy.",
      },
    ],
    useCases: [
      "Add FAQ rich-result eligibility to a support page.",
      "Generate structured data for a product FAQ section.",
      "Bulk-convert a list of Q&A from a doc into deployable JSON-LD.",
      "Audit an existing FAQ page by re-entering the Q&A and checking validation.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          As of 2023, Google shows FAQ rich results only for authoritative
          government and health websites by default. Other sites still benefit
          from the structured data for general indexing.
        </li>
        <li>
          Answers are emitted as plain text. HTML in answers is flagged in
          validation — strip it before deploying for reliable rendering.
        </li>
        <li>
          The Q&A on the page must match the JSON-LD exactly. Don't add
          questions to the schema that aren't visible on the page.
        </li>
        <li>The tool does not generate HTML for the visible FAQ section — only the structured data.</li>
      </ul>
    ),
    faq: [
      {
        q: "Where do I paste the FAQ schema?",
        a: "Inside a <script type=\"application/ld+json\"> block anywhere in the page's HTML. Most sites put it in the <head> or just before </body>. Use the 'Copy <script>' button to get the ready-to-paste block.",
      },
      {
        q: "Will Google show my FAQ rich snippet?",
        a: "Since September 2023, Google shows FAQ rich results only for authoritative government and health websites by default. Other sites can still deploy the schema for general indexing benefits, but the visible rich snippet is not guaranteed.",
      },
      {
        q: "Can answers contain HTML or links?",
        a: "Google's FAQ spec expects plain text answers. HTML tags may be stripped or ignored. If you need links, include them visibly on the page and write the answer text without markup in the schema.",
      },
      {
        q: "How many Q&As can I include?",
        a: "There is no hard limit, but Google typically shows 2–4 FAQ pairs in the snippet. Prioritise the most important questions at the top of the list.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

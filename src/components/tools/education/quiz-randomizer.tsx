"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Shuffle, Download, FileText, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { shuffle, downloadText, EDU_DISCLAIMER } from "./_edu-helpers";

interface ParsedQuestion {
  prompt: string;
  options: string[];
  answerIndex: number; // -1 if unknown
}

const SAMPLE = `Q: What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Ans: B

Q: Which planet is closest to the Sun?
A) Venus
B) Earth
C) Mercury
D) Mars
Ans: C

Q: 2 + 2 = ?
A) 3
B) 4
C) 5
D) 6
Ans: B`;

/**
 * Parse a pasted quiz. Supports several common formats:
 *  - "Q: ...?" or "1. ...?" or "...?" prompts
 *  - Options as "A) ...", "A. ...", "(A) ...", or just bullet lines
 *  - Answer as "Ans: B", "Answer: B", "Correct: B"
 */
function parseQuiz(raw: string): ParsedQuestion[] {
  const text = raw.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const questions: ParsedQuestion[] = [];
  let cur: ParsedQuestion | null = null;
  const answerRe = /^\s*(ans(?:wer)?|correct)\s*[:.\-)]\s*([A-Za-z0-9])/i;
  const optRe = /^\s*\(?\s*([A-Ha-h0-9])\s*\)?\s*[.)]?\s+(.+)$/;
  const qRe = /^\s*(?:(?:Q|Question)\s*[:.\-)]|^\s*\d+[.)])\s*(.+)$/i;

  const push = () => {
    if (cur && (cur.prompt || cur.options.length)) {
      questions.push(cur);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const aMatch = line.match(answerRe);
    if (aMatch && cur) {
      const tok = aMatch[2].toUpperCase();
      cur.answerIndex = parseLetter(tok, cur.options);
      continue;
    }
    const oMatch = line.match(optRe);
    if (oMatch && cur && cur.prompt) {
      cur.options.push(oMatch[2].trim());
      continue;
    }
    const qMatch = line.match(qRe);
    if (qMatch) {
      push();
      cur = { prompt: qMatch[1].trim(), options: [], answerIndex: -1 };
      continue;
    }
    // Plain line — if we already have a prompt and at least one option, treat as next option;
    // otherwise extend the prompt.
    if (cur) {
      if (cur.prompt && cur.options.length > 0) {
        cur.options.push(line.trim());
      } else if (!cur.prompt) {
        cur.prompt = line.trim();
      } else {
        cur.prompt += " " + line.trim();
      }
    } else {
      cur = { prompt: line.trim(), options: [], answerIndex: -1 };
    }
  }
  push();
  return questions;
}

function parseLetter(tok: string, options: string[]): number {
  if (/^\d+$/.test(tok)) {
    const n = parseInt(tok, 10) - 1;
    return n >= 0 && n < options.length ? n : -1;
  }
  const code = tok.toUpperCase().charCodeAt(0) - 65; // A=0
  return code >= 0 && code < options.length ? code : -1;
}

function letterFor(index: number): string {
  return String.fromCharCode(65 + index);
}

interface Variant {
  questions: { prompt: string; options: string[]; answerLetter: string | null }[];
}

function buildVariant(questions: ParsedQuestion[]): Variant {
  return {
    questions: questions.map((q) => {
      const indices = q.options.map((_, i) => i);
      const order = shuffle(indices);
      let answerLetter: string | null = null;
      if (q.answerIndex >= 0) {
        const newPos = order.indexOf(q.answerIndex);
        answerLetter = letterFor(newPos);
      }
      return {
        prompt: q.prompt,
        options: order.map((i) => q.options[i]),
        answerLetter,
      };
    }),
  };
}

function variantToText(v: Variant, includeAnswers: boolean): string {
  const lines: string[] = [];
  v.questions.forEach((q, i) => {
    lines.push(`Q${i + 1}. ${q.prompt}`);
    q.options.forEach((o, j) => lines.push(`   ${letterFor(j)}) ${o}`));
    if (includeAnswers && q.answerLetter) {
      lines.push(`   Answer: ${q.answerLetter}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}

export function QuizRandomizer({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState<string>(SAMPLE);
  const [variantCount, setVariantCount] = React.useState<number>(3);
  const [variants, setVariants] = React.useState<Variant[]>([]);
  const [includeAnswers, setIncludeAnswers] = React.useState<boolean>(true);
  const [parsed, setParsed] = React.useState<ParsedQuestion[]>([]);

  const parseAndStore = React.useCallback(() => {
    const p = parseQuiz(raw);
    setParsed(p);
    if (p.length === 0) {
      toast.error("Couldn't find any questions. Try the format shown in the sample.");
      setVariants([]);
      return;
    }
    setVariants([]);
    toast.success(`Parsed ${p.length} question${p.length === 1 ? "" : "s"}.`);
  }, [raw]);

  const generate = () => {
    const p = parsed.length ? parsed : parseQuiz(raw);
    if (p.length === 0) {
      toast.error("Nothing to randomize. Paste questions first.");
      return;
    }
    setParsed(p);
    const list: Variant[] = [];
    for (let i = 0; i < variantCount; i++) {
      list.push(buildVariant(p));
    }
    setVariants(list);
    toast.success(`Generated ${variantCount} variant${variantCount === 1 ? "" : "s"}.`);
  };

  const downloadAll = () => {
    if (variants.length === 0) {
      toast.error("Generate variants first.");
      return;
    }
    const text = variants
      .map((v, i) => `===== Variant ${i + 1} =====\n\n${variantToText(v, includeAnswers)}`)
      .join("\n\n");
    downloadText("quiz-variants.txt", text);
    toast.success("Downloaded all variants");
  };

  const reset = () => {
    setRaw("");
    setVariants([]);
    setParsed([]);
    toast.info("Cleared.");
  };

  const content: ToolContent = {
    intro:
      "Paste a quiz as 'Q: ... A) ... B) ... Ans: B' blocks (or any similar format), and the randomizer will shuffle both the question order and the answer option order to produce multiple variants — perfect for in-class and makeup exams. Export each variant as printable text with or without the answer key.",
    tool: (
      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="qr-raw">Paste your quiz</Label>
              <Button size="sm" variant="ghost" onClick={() => setRaw(SAMPLE)}>
                Load sample
              </Button>
            </div>
            <Textarea
              id="qr-raw"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              placeholder="Q: What is the capital of France?&#10;A) London&#10;B) Paris&#10;C) Berlin&#10;D) Madrid&#10;Ans: B"
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={parseAndStore}>
                <FileText className="mr-1.5 h-4 w-4" /> Parse &amp; check
              </Button>
              <div className="flex items-center gap-3">
                <Label htmlFor="qr-count" className="text-xs text-muted-foreground">Variants</Label>
                <Input
                  id="qr-count"
                  type="number"
                  min={1}
                  max={5}
                  value={variantCount}
                  onChange={(e) => setVariantCount(Math.max(1, Math.min(5, parseInt(e.target.value || "1", 10))))}
                  className="h-8 w-16"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} />
                Include answer key
              </label>
              <Button onClick={generate}>
                <Shuffle className="mr-1.5 h-4 w-4" /> Generate variants
              </Button>
              <Button variant="ghost" onClick={reset} className="ml-auto">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
            {parsed.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{parsed.length} questions</Badge>
                <Badge variant="secondary">{parsed.reduce((n, q) => n + q.options.length, 0)} options total</Badge>
                <Badge variant="outline">
                  {parsed.filter((q) => q.answerIndex >= 0).length} answers detected
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {variants.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{variants.length} random variants</h3>
              <Button size="sm" variant="outline" onClick={downloadAll}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download all
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {variants.map((v, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Variant {i + 1}</CardTitle>
                      <div className="flex gap-1">
                        <CopyButton value={() => variantToText(v, includeAnswers)} label="Copy" size="sm" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadText(`quiz-variant-${i + 1}.txt`, variantToText(v, includeAnswers))}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">
                      {variantToText(v, includeAnswers)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your quiz",
        description: "Use 'Q:' or '1.' for prompts, 'A)', 'B)' … for options, and 'Ans: B' / 'Answer: B' / 'Correct: B' for the answer. Empty lines separate questions.",
      },
      {
        title: "Parse & check",
        description: "Click Parse & check to count questions, options and detected answers. If a question has no detected answer it will be shuffled without one.",
      },
      {
        title: "Pick variant count and options",
        description: "Choose 1–5 variants, toggle the answer key on/off, then Generate. Each variant has questions and answer options in a different order.",
      },
      {
        title: "Copy or download",
        description: "Copy a single variant, save it as a text file, or download all variants in one file.",
      },
    ],
    useCases: [
      "Print multiple versions of the same quiz to discourage cheating in a classroom.",
      "Build a makeup exam that tests the same content with a different order.",
      "Quickly generate practice versions for students to re-take at home.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>The parser is forgiving but not magical — stick to 'Q: ...', lettered options and 'Ans: X' for best results. Free-text answers and true/false without options may not parse cleanly.</li>
        <li>Answer letters are remapped after shuffling, so 'Ans: B' in the source becomes whatever letter the correct option lands on in each variant.</li>
        <li>Variants are generated with Math.random — for high-stakes exams, verify each printed variant by hand.</li>
      </ul>
    ),
    faq: [
      {
        q: "What if my quiz format is different?",
        a: "The parser recognises 'Q:', 'Question:', '1.' or a plain question line, then 'A)' / 'A.' / '(A)' for options and 'Ans:' / 'Answer:' / 'Correct:' for the answer. If your format differs, paste the sample to see the expected shape.",
      },
      {
        q: "Can I randomise only questions or only options?",
        a: "Right now both are always randomised together. To keep option order stable, generate one variant and copy it before re-generating — each click produces a fresh shuffle.",
      },
      {
        q: "Are answer keys included in the download?",
        a: "Only if the 'Include answer key' checkbox is on. Turn it off before generating to produce student-facing copies, then regenerate with it on for your master copy.",
      },
      {
        q: "Is my quiz content uploaded anywhere?",
        a: "No. Everything is parsed and shuffled in your browser. The text you paste never leaves your device.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

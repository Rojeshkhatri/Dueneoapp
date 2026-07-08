"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  FolderOpen,
  RotateCcw,
  ClipboardList,
  Star,
  Award,
  ListChecks,
  Scale,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";

interface Competency {
  id: string;
  name: string;
  weight: number; // 1-5 importance
  questions: string[];
}

interface ScorecardData {
  role: string;
  candidate: string;
  interviewer: string;
  date: string;
  competencies: Competency[];
}

const STORAGE_KEY = "dueneo:interview-scorecard:v1";

const DEFAULT_DATA: ScorecardData = {
  role: "Senior Software Engineer",
  candidate: "",
  interviewer: "",
  date: new Date().toISOString().slice(0, 10),
  competencies: [
    {
      id: "c1",
      name: "Technical Skills",
      weight: 5,
      questions: [
        "Walk me through a recent system you designed end-to-end.",
        "How do you decide between SQL and NoSQL for a new service?",
        "Describe a production incident you led the response on.",
      ],
    },
    {
      id: "c2",
      name: "Communication",
      weight: 4,
      questions: [
        "Explain a complex technical concept to a non-technical stakeholder.",
        "How do you handle disagreement with a teammate about architecture?",
      ],
    },
    {
      id: "c3",
      name: "Collaboration & Culture",
      weight: 3,
      questions: [
        "Tell me about a time you mentored a junior engineer.",
        "Describe how you've contributed to team culture in a previous role.",
      ],
    },
  ],
};

function uid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const RATING_SCALE = [1, 2, 3, 4, 5];
const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Outstanding",
};

// In-component state for ratings (not persisted in the scorecard definition).
interface RatingState {
  [competencyId: string]: { rating: number; notes: string };
}

export function InterviewScorecardBuilder({ tool }: { tool: ToolDefinition }) {
  const [data, setData] = React.useState<ScorecardData>(DEFAULT_DATA);
  const [ratings, setRatings] = React.useState<RatingState>({});

  // Load saved scorecard from localStorage on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScorecardData;
        if (parsed && Array.isArray(parsed.competencies)) {
          setData(parsed);
          toast.info("Loaded saved scorecard");
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const updateField = (field: keyof ScorecardData, value: string) => {
    setData((d) => ({ ...d, [field]: value }));
  };

  const addCompetency = () => {
    setData((d) => ({
      ...d,
      competencies: [
        ...d.competencies,
        { id: uid(), name: "New Competency", weight: 3, questions: [""] },
      ],
    }));
  };

  const updateCompetency = (id: string, patch: Partial<Competency>) => {
    setData((d) => ({
      ...d,
      competencies: d.competencies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCompetency = (id: string) => {
    setData((d) => ({
      ...d,
      competencies: d.competencies.filter((c) => c.id !== id),
    }));
    setRatings((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
  };

  const addQuestion = (id: string) => {
    setData((d) => ({
      ...d,
      competencies: d.competencies.map((c) =>
        c.id === id ? { ...c, questions: [...c.questions, ""] } : c
      ),
    }));
  };

  const updateQuestion = (competencyId: string, qIndex: number, value: string) => {
    setData((d) => ({
      ...d,
      competencies: d.competencies.map((c) =>
        c.id === competencyId
          ? { ...c, questions: c.questions.map((q, i) => (i === qIndex ? value : q)) }
          : c
      ),
    }));
  };

  const removeQuestion = (competencyId: string, qIndex: number) => {
    setData((d) => ({
      ...d,
      competencies: d.competencies.map((c) =>
        c.id === competencyId
          ? { ...c, questions: c.questions.filter((_, i) => i !== qIndex) }
          : c
      ),
    }));
  };

  const setRating = (competencyId: string, rating: number) => {
    setRatings((r) => ({
      ...r,
      [competencyId]: { rating, notes: r[competencyId]?.notes ?? "" },
    }));
  };

  const setNotes = (competencyId: string, notes: string) => {
    setRatings((r) => ({
      ...r,
      [competencyId]: { rating: r[competencyId]?.rating ?? 0, notes },
    }));
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      toast.success("Scorecard saved to this browser");
    } catch {
      toast.error("Could not save — browser storage unavailable");
    }
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        toast.error("No saved scorecard found");
        return;
      }
      const parsed = JSON.parse(raw) as ScorecardData;
      if (!parsed || !Array.isArray(parsed.competencies)) {
        toast.error("Saved scorecard is malformed");
        return;
      }
      setData(parsed);
      setRatings({});
      toast.success("Loaded saved scorecard");
    } catch {
      toast.error("Could not load saved scorecard");
    }
  };

  const reset = () => {
    setData(DEFAULT_DATA);
    setRatings({});
    toast.success("Reset to default scorecard template");
  };

  const printScorecard = () => {
    // Add a print-only class to the body so print CSS hides everything except the scorecard.
    document.body.classList.add("dueneo-print-scorecard");
    window.print();
    // Cleanup after a short delay so the print dialog has time to capture.
    window.setTimeout(() => {
      document.body.classList.remove("dueneo-print-scorecard");
    }, 1000);
  };

  // Weighted overall score.
  const totalWeight = data.competencies.reduce((s, c) => s + c.weight, 0);
  const ratedScore = data.competencies.reduce((s, c) => {
    const r = ratings[c.id]?.rating ?? 0;
    return s + (r > 0 ? r * c.weight : 0);
  }, 0);
  const ratedWeight = data.competencies.reduce(
    (s, c) => s + (ratings[c.id]?.rating ? c.weight : 0),
    0
  );
  const overall = ratedWeight > 0 ? ratedScore / ratedWeight : 0;

  const toolBody = (
    <div className="space-y-5">
      <style>{`
        @media print {
          body.dueneo-print-scorecard > * { visibility: hidden; }
          body.dueneo-print-scorecard #dueneo-printable-scorecard,
          body.dueneo-print-scorecard #dueneo-printable-scorecard * { visibility: visible; }
          body.dueneo-print-scorecard #dueneo-printable-scorecard {
            position: absolute; left: 0; top: 0; width: 100%; padding: 24px;
          }
          body.dueneo-print-scorecard .no-print { display: none !important; }
        }
      `}</style>

      <div className="rounded-xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="sc-role">Role</Label>
            <Input id="sc-role" value={data.role} onChange={(e) => updateField("role", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-candidate">Candidate</Label>
            <Input id="sc-candidate" value={data.candidate} onChange={(e) => updateField("candidate", e.target.value)} placeholder="Candidate name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-interviewer">Interviewer</Label>
            <Input id="sc-interviewer" value={data.interviewer} onChange={(e) => updateField("interviewer", e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-date">Date</Label>
            <Input id="sc-date" type="date" value={data.date} onChange={(e) => updateField("date", e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 no-print">
          <Button variant="outline" size="sm" onClick={save}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Load
          </Button>
          <Button variant="outline" size="sm" onClick={printScorecard}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / Save as PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Print-only scorecard layout (also visible on screen as the printable preview). */}
      <div id="dueneo-printable-scorecard" className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-xl font-bold">Interview Scorecard</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.role || "Untitled role"}
              {data.candidate ? ` · Candidate: ${data.candidate}` : ""}
              {data.interviewer ? ` · Interviewer: ${data.interviewer}` : ""}
              {data.date ? ` · ${data.date}` : ""}
            </p>
          </div>
          {overall > 0 && (
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Weighted overall
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-primary">
                {overall.toFixed(2)} / 5
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {data.competencies.map((c, idx) => {
            const r = ratings[c.id]?.rating ?? 0;
            return (
              <div key={c.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                  <Input
                    value={c.name}
                    onChange={(e) => updateCompetency(c.id, { name: e.target.value })}
                    className="h-8 flex-1 font-semibold"
                    aria-label={`Competency ${idx + 1} name`}
                  />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Scale className="h-3.5 w-3.5 text-primary" />
                    <span className="text-muted-foreground">Weight</span>
                    <Select
                      value={String(c.weight)}
                      onValueChange={(v) => updateCompetency(c.id, { weight: Number(v) })}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((w) => (
                          <SelectItem key={w} value={String(w)}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="no-print h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCompetency(c.id)}
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Rating scale */}
                <div className="mt-3 no-print">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Rating</span>
                    <div className="ml-2 flex gap-1">
                      {RATING_SCALE.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(c.id, n)}
                          className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                            r === n
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                          aria-label={`Rate ${n}`}
                          title={RATING_LABELS[n]}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {r > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {RATING_LABELS[r]}
                      </span>
                    )}
                  </div>
                </div>
                {/* Print-only rating line */}
                <div className="hidden text-sm print:block">
                  <span className="text-muted-foreground">Rating (1-5): </span>
                  <span className="font-mono font-semibold">{r || "___"}</span>
                  {r > 0 && <span className="ml-2 text-muted-foreground">({RATING_LABELS[r]})</span>}
                </div>

                {/* Questions */}
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" /> Questions
                  </div>
                  <ol className="mt-1.5 space-y-1.5">
                    {c.questions.map((q, qi) => (
                      <li key={qi} className="flex items-start gap-2">
                        <span className="mt-1.5 font-mono text-xs text-muted-foreground">{qi + 1}.</span>
                        <Input
                          value={q}
                          onChange={(e) => updateQuestion(c.id, qi, e.target.value)}
                          placeholder="Type the interview question…"
                          className="h-7 flex-1 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="no-print h-7 w-7 flex-none text-muted-foreground hover:text-destructive"
                          onClick={() => removeQuestion(c.id, qi)}
                          aria-label={`Remove question ${qi + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ol>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addQuestion(c.id)}
                    className="no-print mt-1.5 h-7 px-2 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add question
                  </Button>
                </div>

                {/* Notes */}
                <div className="mt-3">
                  <Label htmlFor={`notes-${c.id}`} className="text-xs font-medium text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    id={`notes-${c.id}`}
                    value={ratings[c.id]?.notes ?? ""}
                    onChange={(e) => setNotes(c.id, e.target.value)}
                    placeholder="Evidence, examples, follow-ups…"
                    className="mt-1 min-h-[60px] text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {data.competencies.length === 0 && (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
            No competencies yet. Click &ldquo;Add competency&rdquo; below to start.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 no-print">
          <Button variant="outline" size="sm" onClick={addCompetency}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add competency
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <ClipboardList className="h-3 w-3" /> {data.competencies.length} competency(ies)
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Award className="h-3 w-3" /> Total weight: {totalWeight}
            </Badge>
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <span>
              Rated: {ratedWeight}/{totalWeight} weight
              {overall > 0 && (
                <span className="ml-2 font-mono font-semibold text-primary">
                  {overall.toFixed(2)}/5
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Build a structured interview scorecard with weighted competencies, a 1–5 rating scale per competency, and per-competency question banks. Rate the candidate live during the interview, capture notes per competency, and see the weighted overall score in real time. Export as a printable PDF via your browser's print dialog, or save the scorecard template to localStorage to reuse for the next candidate. Everything runs locally in your browser.",
    tool: toolBody,
    howTo: [
      {
        title: "Fill in role, candidate and interviewer",
        description:
          "Enter the role you're hiring for, the candidate's name, your name and the interview date. These appear in the scorecard header when printed.",
      },
      {
        title: "Add competencies with weights and questions",
        description:
          "Each competency has a name (e.g. \"Technical Skills\"), a 1–5 weight reflecting its importance to the role, and a list of interview questions. Add or remove competencies and questions to match your rubric.",
      },
      {
        title: "Rate the candidate during the interview",
        description:
          "Click the 1–5 rating button for each competency. Add notes with specific evidence and examples. The weighted overall score updates live as you rate.",
      },
      {
        title: "Save or print the scorecard",
        description:
          "Save the template to localStorage so the next candidate uses the same rubric. Click Print to export a clean PDF via your browser's print dialog — only the scorecard prints, not the page chrome.",
      },
    ],
    useCases: [
      "Standardise interview evaluation across multiple interviewers for the same candidate.",
      "Reduce hiring bias by scoring each competency against a fixed rubric before debrief.",
      "Compare candidates side-by-side using weighted overall scores.",
      "Onboard new interviewers with a ready-made rubric they can load and reuse.",
      "Document hiring decisions for compliance and audit trails.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Ratings and notes are session state — they are not persisted in localStorage. Only the
          scorecard template (role, competencies, questions) is saved. Capture the printed PDF
          if you need a permanent record of a specific candidate&apos;s evaluation.
        </li>
        <li>
          The weighted overall score is the weighted mean of rated competencies. Competencies you
          haven&apos;t rated yet are excluded from the average. This prevents unrated competencies
          from dragging the score down.
        </li>
        <li>
          Print output uses the browser&apos;s native print dialog. To get a PDF, choose
          &ldquo;Save as PDF&rdquo; as the printer destination.
        </li>
        <li>
          The scorecard is single-interviewer. For panel interviews, each interviewer should
          fill in their own scorecard and the debrief aggregates them.
        </li>
        <li>
          localStorage is per-browser. Saved templates do not sync across devices or browsers.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Are ratings saved to localStorage?",
        a: "No. Only the scorecard template (role, competencies, questions) is saved. Ratings and notes are session state — they reset when you reload. This is intentional: you usually want a fresh rubric per candidate. Capture the printed PDF if you need a permanent record.",
      },
      {
        q: "How is the weighted overall score calculated?",
        a: "Sum of (rating × weight) for rated competencies, divided by sum of weights for rated competencies. Unrated competencies are excluded from both. So if you rate only \"Technical Skills\" (weight 5) as 4, the overall is 4.00/5 — not 4×5/12 = 1.67/5.",
      },
      {
        q: "How do I get a PDF?",
        a: "Click \"Print / Save as PDF\". Your browser's print dialog opens. Choose \"Save as PDF\" as the destination. Only the scorecard prints — the page navigation, ads and tool chrome are hidden via print CSS.",
      },
      {
        q: "Can I share the scorecard template with a co-interviewer?",
        a: "Not directly — localStorage is per-browser. Ask them to recreate the rubric, or you can copy the structure manually. A future version may add JSON export/import.",
      },
      {
        q: "Can I customise the rating scale (e.g. 1-10)?",
        a: "The scale is fixed at 1–5 in this version. For a 1–10 scale, multiply each competency weight by 2 and rate on the 5-scale (so a 4/5 becomes 8/10).",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

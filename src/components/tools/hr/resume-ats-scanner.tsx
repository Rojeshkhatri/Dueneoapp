"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  ScanSearch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  ClipboardList,
  Tag,
  LayoutList,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { toast } from "sonner";

const MAX_INPUT_BYTES = 200_000;

/** Common English stopwords to strip from the job description before keyword extraction. */
const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","for","to","of","in","on","at","by","with","from","as","is","are","be","been","being","was","were","will","would","should","could","can","may","might","must","shall","do","does","did","done","have","has","had","having","this","that","these","those","i","you","he","she","it","we","they","them","their","his","her","its","our","your","my","me","him","us","who","whom","which","what","whose","when","where","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","just","also","about","above","after","again","against","because","before","below","between","during","further","here","into","off","out","over","there","under","up","down","through","via","per","etc","across","within","without","along","among","around","behind","beyond","upon","you'll","we'll","they'll","their's","theirs","yours","ours","etc.",
]);

const SECTION_KEYWORDS: { key: string; label: string; patterns: RegExp[] }[] = [
  {
    key: "experience",
    label: "Experience / Work History",
    patterns: [
      /\b(work\s+experience|professional\s+experience|employment\s+history|work\s+history|experience)\b/i,
      /\b(employment)\b/i,
    ],
  },
  {
    key: "education",
    label: "Education",
    patterns: [/\b(education|academic|qualifications?|university|college|degree|bachelor|master|ph\.?d|diploma)\b/i],
  },
  {
    key: "skills",
    label: "Skills",
    patterns: [/\b(skills?|technical\s+skills|core\s+competenc(?:y|ies)|proficiencies|technologies)\b/i],
  },
  {
    key: "summary",
    label: "Summary / Objective",
    patterns: [/\b(summary|profile|objective|about\s+me|career\s+objective|professional\s+summary)\b/i],
  },
  {
    key: "projects",
    label: "Projects",
    patterns: [/\b(projects?|key\s+projects|selected\s+projects|portfolio)\b/i],
  },
  {
    key: "certifications",
    label: "Certifications",
    patterns: [/\b(certifications?|certified|licenses?|accreditations?)\b/i],
  },
  {
    key: "contact",
    label: "Contact",
    patterns: [/\b(email|phone|contact|address|linkedin|github)\b/i],
  },
];

interface AnalysisResult {
  score: number;
  keywordMatchPct: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  extraKeywords: string[];
  formattingIssues: string[];
  detectedSections: { key: string; label: string; found: boolean }[];
  suggestions: string[];
  jdKeywords: string[];
  resumeKeywords: string[];
}

/** Extract candidate keyword tokens from free text. */
function extractKeywords(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.length < 2) continue;
    if (STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    // Keep technical tokens like c#, c++, .net, node.js
    if (/[+#.]/.test(t) && t.length >= 2) {
      out.add(t);
      continue;
    }
    out.add(t);
  }
  return out;
}

/** Detect formatting issues that ATS systems often choke on. */
function detectFormattingIssues(resume: string): string[] {
  const issues: string[] = [];
  const lower = resume.toLowerCase();

  if (/\|/.test(resume) && (lower.includes("skill") || lower.includes("experience"))) {
    issues.push(
      "Pipe characters (|) detected — often used to fake table columns. ATS parsers may split these into garbled tokens. Replace with plain bullets or section headings."
    );
  }
  if (/\t.{1,80}\t.{1,80}\t/s.test(resume)) {
    issues.push("Tab-separated columns detected — ATS systems read top-to-bottom, not left-to-right. Convert to a single-column layout.");
  }
  if (/\u2022|\u25aa|\u25cf|\u25cb|\u25ab|\u2219/.test(resume)) {
    issues.push("Non-standard bullet glyphs (▪ ● ○ •) detected — some ATS parsers drop these or render them as �. Use a plain hyphen (-) or asterisk (*) for safety.");
  }
  if (/\u00a0/.test(resume)) {
    issues.push("Non-breaking spaces (U+00A0) detected — these can break word boundaries for ATS parsers. Replace with regular spaces.");
  }
  if (/[\u2010-\u2015]/.test(resume)) {
    issues.push("Typographic dashes (– — ―) detected — ATS parsers may not recognise these as hyphens in date ranges or compound words. Use plain hyphens (-).");
  }
  if (/\u201c|\u201d/.test(resume)) {
    issues.push("Smart quotes (“ ”) detected — some ATS parsers mis-tokenise these. Use straight quotes (\").");
  }
  if (/[\u2028\u2029]/.test(resume)) {
    issues.push("Line/paragraph separator Unicode characters detected — strip these and use plain newlines.");
  }
  // Multiple consecutive blank lines suggest heavy column-based layouts pasted as text.
  if (/\n\s*\n\s*\n\s*\n/.test(resume)) {
    issues.push("Four or more consecutive blank lines detected — may indicate a multi-column layout pasted as text. ATS reads top-to-bottom; convert to a single column.");
  }
  // Mixed-case ALL CAPS section headers longer than 4 words in caps may indicate image-style headers.
  const capsRuns = resume.match(/\b[A-Z][A-Z\s]{10,}\b/g);
  if (capsRuns && capsRuns.length > 6) {
    issues.push("Many ALL-CAPS runs detected — excessive capitalisation can confuse case-sensitive keyword matching. Use Title Case for section headers.");
  }
  // Very short resume (likely indicates content was an image/PDF that didn't paste cleanly).
  if (resume.trim().length < 200) {
    issues.push("Resume text is very short — if you pasted from a PDF, columns and images may not have transferred. Try pasting as plain text or export your resume as .txt/.docx.");
  }
  // Special characters that frequently break ATS parsers.
  if (/[\u2600-\u27bf\u2190-\u21ff\u2b00-\u2bff]/.test(resume)) {
    issues.push("Emoji, arrows or dingbat characters detected — these almost never survive ATS parsing. Remove them.");
  }
  return issues;
}

function analyze(resume: string, jd: string): AnalysisResult | null {
  if (!resume.trim() || !jd.trim()) return null;

  const jdKeywords = extractKeywords(jd);
  const resumeKeywords = extractKeywords(resume);

  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of jdKeywords) {
    if (resumeKeywords.has(k)) {
      matched.push(k);
    } else {
      missing.push(k);
    }
  }
  const extra: string[] = [];
  for (const k of resumeKeywords) {
    if (!jdKeywords.has(k)) extra.push(k);
  }

  const keywordMatchPct =
    jdKeywords.size === 0 ? 0 : (matched.length / jdKeywords.size) * 100;

  const detectedSections = SECTION_KEYWORDS.map((s) => ({
    key: s.key,
    label: s.label,
    found: s.patterns.some((p) => p.test(resume)),
  }));

  const formattingIssues = detectFormattingIssues(resume);

  // Score composition:
  //   keyword match     50 pts (capped)
  //   section coverage  25 pts (proportion of expected sections present)
  //   formatting        25 pts (25 - 5 per issue, min 0)
  const expectedSections = ["experience", "education", "skills", "summary", "contact"];
  const presentSections = expectedSections.filter((k) =>
    detectedSections.some((s) => s.key === k && s.found)
  ).length;
  const sectionScore = (presentSections / expectedSections.length) * 25;

  const keywordScore = Math.min(50, keywordMatchPct * 0.5);

  const formattingScore = Math.max(0, 25 - formattingIssues.length * 5);

  const rawScore = keywordScore + sectionScore + formattingScore;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Build suggestions.
  const suggestions: string[] = [];
  if (missing.length > 0) {
    const topMissing = missing.slice(0, 12);
    suggestions.push(
      `Add these high-priority keywords from the job description where you have genuine experience: ${topMissing.join(", ")}${missing.length > 12 ? ` (and ${missing.length - 12} more)` : ""}.`
    );
  } else {
    suggestions.push("Excellent keyword alignment — every significant keyword from the job description appears in your resume. Make sure they appear in context (not stuffed).");
  }
  if (keywordMatchPct < 60) {
    suggestions.push(`Keyword match is ${keywordMatchPct.toFixed(0)}%. Aim for 70%+ to clear most ATS keyword filters. Tailor your resume to this specific posting.`);
  }
  const missingCriticalSections = detectedSections.filter(
    (s) => !s.found && ["experience", "education", "skills", "contact"].includes(s.key)
  );
  for (const s of missingCriticalSections) {
    suggestions.push(`Missing or undetected "${s.label}" section. ATS systems expect this — add a clearly labelled section header.`);
  }
  if (formattingIssues.length > 0) {
    suggestions.push(`Fix ${formattingIssues.length} formatting issue(s) below — they can cause ATS parsers to misread or drop content.`);
  }
  if (extra.length > 0 && extra.length > matched.length * 2) {
    suggestions.push("Your resume contains many keywords not in the job description. While that's fine, prioritise relevance — consider trimming unrelated skills to keep the resume focused.");
  }
  if (resume.trim().length > 0 && resume.trim().length < 400) {
    suggestions.push("Resume looks short. Most ATS-friendly resumes are 1–2 pages with quantified achievements. Add measurable impact statements (e.g. 'Reduced API latency by 35%').");
  }
  if (suggestions.length === 0) {
    suggestions.push("Strong resume. Proof-read for typos and quantify at least 3 achievements with numbers.");
  }

  return {
    score,
    keywordMatchPct,
    matchedKeywords: matched.sort(),
    missingKeywords: missing.sort(),
    extraKeywords: extra.sort(),
    formattingIssues,
    detectedSections,
    suggestions,
    jdKeywords: Array.from(jdKeywords).sort(),
    resumeKeywords: Array.from(resumeKeywords).sort(),
  };
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}
function scoreLabel(score: number): string {
  if (score >= 80) return "Strong — likely to pass ATS";
  if (score >= 60) return "Moderate — may pass ATS";
  if (score >= 40) return "Weak — likely to be filtered";
  return "Poor — almost certainly filtered";
}

export function ResumeAtsScanner({ tool }: { tool: ToolDefinition }) {
  const [resume, setResume] = React.useState("");
  const [jd, setJd] = React.useState("");

  const result = React.useMemo(() => analyze(resume, jd), [resume, jd]);

  const handleReset = () => {
    setResume("");
    setJd("");
    toast.success("Cleared inputs");
  };

  const loadSample = () => {
    setResume(
      `Jane Doe
Email: jane.doe@email.com | Phone: +1-555-0123 | LinkedIn: linkedin.com/in/janedoe

SUMMARY
Senior software engineer with 7 years of experience building scalable web applications. Specialised in TypeScript, React, Node.js and AWS.

EXPERIENCE
Senior Software Engineer — Acme Corp (2021-Present)
- Led migration of monolith to microservices, reducing deploy time by 60%.
- Built design system in React used by 30+ engineers.
- Mentored 4 junior engineers.

Software Engineer — Beta Inc (2018-2021)
- Shipped customer dashboard in React + TypeScript serving 200k MAU.
- Cut API p95 latency from 800ms to 250ms with caching layer.

SKILLS
TypeScript, JavaScript, React, Node.js, Express, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD, GraphQL

EDUCATION
B.Sc. Computer Science — State University (2014-2018)

CERTIFICATIONS
AWS Solutions Architect Associate (2022)`
    );
    setJd(
      `We are hiring a Senior Frontend Engineer to join our platform team.

Requirements:
- 5+ years building production web apps with React and TypeScript
- Experience with Next.js, GraphQL and REST APIs
- Strong CSS and responsive design skills
- Familiarity with AWS (Lambda, S3, CloudFront)
- Experience with CI/CD pipelines (GitHub Actions)
- Excellent communication and mentoring skills
- Bachelor's degree in Computer Science or equivalent

Nice to have:
- Experience with design systems
- Kubernetes and Docker
- Performance optimisation and observability (Datadog, Sentry)

You will own the frontend architecture for our customer-facing dashboard and collaborate with backend engineers on API design.`
    );
    toast.success("Loaded sample resume and job description");
  };

  const toolBody = (
    <div className="space-y-5">
      <PrivacyNote level="sensitive" className="mb-1">
        Sensitive: your resume and job description never leave your browser. All analysis runs locally — nothing is uploaded, logged or stored.
      </PrivacyNote>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ats-resume" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Your resume text
            </Label>
            <span className="text-xs text-muted-foreground">
              {resume.length.toLocaleString()} chars
            </span>
          </div>
          <Textarea
            id="ats-resume"
            value={resume}
            onChange={(e) => {
              if (e.target.value.length > MAX_INPUT_BYTES) {
                toast.error("Resume too long — please paste under 200 KB of text");
                return;
              }
              setResume(e.target.value);
            }}
            placeholder="Paste your resume as plain text. Remove images, tables and columns first — ATS systems read top-to-bottom."
            className="min-h-[280px] resize-y font-mono text-xs leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ats-jd" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Job description
            </Label>
            <span className="text-xs text-muted-foreground">
              {jd.length.toLocaleString()} chars
            </span>
          </div>
          <Textarea
            id="ats-jd"
            value={jd}
            onChange={(e) => {
              if (e.target.value.length > MAX_INPUT_BYTES) {
                toast.error("Job description too long — please paste under 200 KB of text");
                return;
              }
              setJd(e.target.value);
            }}
            placeholder="Paste the full job description text. We extract keywords from this and check how many appear in your resume."
            className="min-h-[280px] resize-y text-xs leading-relaxed"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={loadSample}>
          <ScanSearch className="mr-1.5 h-3.5 w-3.5" /> Load sample
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {!result && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Paste your resume and the job description above to see your ATS compatibility score,
          keyword match breakdown, formatting issues and tailored suggestions.
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Score card */}
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ATS Compatibility Score
              </div>
              <div className={`mt-2 font-mono text-6xl font-bold tabular-nums ${scoreColor(result.score)}`}>
                {result.score}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">out of 100</div>
              <Progress value={result.score} className="mt-3" />
              <div className={`mt-2 text-sm font-medium ${scoreColor(result.score)}`}>
                {scoreLabel(result.score)}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Keyword match
                </div>
                <div className="mt-2 font-mono text-3xl font-bold tabular-nums">
                  {result.keywordMatchPct.toFixed(0)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {result.matchedKeywords.length} of {result.jdKeywords.length} JD keywords found in resume
                </div>
                <Progress value={result.keywordMatchPct} className="mt-3" />
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <LayoutList className="h-3.5 w-3.5 text-primary" />
                  Sections detected
                </div>
                <div className="mt-2 font-mono text-3xl font-bold tabular-nums">
                  {result.detectedSections.filter((s) => s.found).length}/{result.detectedSections.length}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Standard resume sections found in your text
                </div>
              </div>
            </div>
          </div>

          {/* Sections grid */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <LayoutList className="h-4 w-4 text-primary" /> Section detection
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.detectedSections.map((s) => (
                <Badge
                  key={s.key}
                  variant={s.found ? "default" : "outline"}
                  className={
                    s.found
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  }
                >
                  {s.found ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                  {s.label}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sections are detected by scanning for common heading keywords. A red badge does not
              always mean the section is missing — it may use an unconventional heading. Rename to a
              standard heading (e.g. &ldquo;Experience&rdquo;) for ATS reliability.
            </p>
          </div>

          {/* Keyword analysis */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Matched keywords
                <Badge variant="secondary" className="ml-auto">{result.matchedKeywords.length}</Badge>
              </h3>
              {result.matchedKeywords.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">No matches yet.</p>
              ) : (
                <div className="mt-3 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matchedKeywords.map((k) => (
                      <Badge key={k} variant="secondary" className="font-mono text-[11px]">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <XCircle className="h-4 w-4 text-rose-500" /> Missing keywords
                <Badge variant="secondary" className="ml-auto">{result.missingKeywords.length}</Badge>
              </h3>
              {result.missingKeywords.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">All JD keywords are present — great match.</p>
              ) : (
                <div className="mt-3 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.map((k) => (
                      <Badge
                        key={k}
                        variant="outline"
                        className="border-rose-500/40 bg-rose-500/10 font-mono text-[11px] text-rose-700 dark:text-rose-300"
                      >
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formatting issues */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Formatting issues
              <Badge variant="secondary" className="ml-auto">{result.formattingIssues.length}</Badge>
            </h3>
            {result.formattingIssues.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> No common ATS-breaking formatting issues detected.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.formattingIssues.map((issue, i) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Suggestions */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" /> Suggestions to improve your score
            </h3>
            <Separator className="my-3" />
            <ol className="space-y-2 text-sm text-foreground">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Paste your resume and the job description side-by-side. Dueneo analyses keyword match, detects the resume sections ATS systems look for, flags formatting that breaks ATS parsers (tables, columns, smart quotes, non-standard bullets), and gives you a 0–100 compatibility score plus concrete suggestions to improve it. Everything runs locally in your browser — your resume never leaves your device.",
    tool: toolBody,
    howTo: [
      {
        title: "Paste your resume as plain text",
        description:
          "Copy your resume from your editor or PDF and paste it into the left textarea. For best results, use plain text or export your resume as .txt — pasting from a heavily formatted PDF can drop columns and images.",
      },
      {
        title: "Paste the job description",
        description:
          "Paste the full job posting text on the right. Dueneo extracts the significant keywords (filtering out stopwords) and checks how many appear in your resume.",
      },
      {
        title: "Read your compatibility score",
        description:
          "The score is composed of keyword match (50%), section coverage (25%) and formatting cleanliness (25%). 80+ is strong, 60–79 is moderate, below 60 is likely to be filtered out by ATS keyword screens.",
      },
      {
        title: "Fix the issues Dueneo flags",
        description:
          "Work through the formatting issues (smart quotes, pipe columns, non-standard bullets) and add the missing keywords where you genuinely have that experience. Re-run the scan to track your score.",
      },
    ],
    useCases: [
      "Tailor your resume for each job application by matching keywords from the specific job description.",
      "Catch ATS-breaking formatting (tables, columns, images, smart quotes) before you submit.",
      "Compare two versions of your resume against the same posting to see which scores higher.",
      "Coach a friend or client through ATS best practices with a concrete, reproducible score.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The scanner works on plain text only. If you paste from a PDF, columns and tables may
          already be flattened by the clipboard — that itself is a strong signal that an ATS will
          also struggle with the underlying file. Always submit resumes as .docx or PDF-as-text-friendly
          formats unless the employer specifies otherwise.
        </li>
        <li>
          Keyword extraction is keyword-frequency based and does not understand synonyms. If the JD
          says &ldquo;front-end&rdquo; and your resume says &ldquo;frontend&rdquo;, both are treated
          as separate tokens. Mirror the JD&apos;s exact terminology where possible.
        </li>
        <li>
          The score is a heuristic, not a guarantee. Every ATS (Workday, Greenhouse, Lever, Taleo,
          iCIMS) parses differently. Treat the score as a directional guide, not an absolute.
        </li>
        <li>
          Section detection uses heading keyword matching. A &ldquo;Career Highlights&rdquo; heading
          instead of &ldquo;Experience&rdquo; may not be detected — that is itself an ATS best-practice hint.
        </li>
        <li>
          Inputs are capped at 200 KB of text each. If your resume is longer, trim it — most
          ATS-friendly resumes are 1–2 pages.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Does Dueneo store my resume or the job description?",
        a: "No. This is a sensitive tool — every byte of analysis runs in your browser. Your resume and the job description are never uploaded to Dueneo, never logged, never stored. Close the tab and they are gone.",
      },
      {
        q: "What is a good ATS score?",
        a: "Aim for 80+. Below 60 most ATS keyword filters will drop your application before a human ever sees it. The score weights keyword match (50%), section coverage (25%) and formatting cleanliness (25%) — fix whichever component is dragging your score down.",
      },
      {
        q: "Why are keywords from the job description missing from my resume?",
        a: "Dueneo extracts significant tokens (filtering common English stopwords, pure numbers, single letters). If a JD keyword is missing, you should add it to your resume — but only where you have genuine experience with that skill. Keyword stuffing without context can get your application rejected by a human reviewer even if it passes ATS.",
      },
      {
        q: "Why does my pasted PDF resume look weird?",
        a: "Multi-column PDFs paste as interleaved text streams (left column top-to-bottom, then right column top-to-bottom) — that is exactly how an ATS will read it too. Rebuild the resume in a single-column layout and paste again to see your real ATS score.",
      },
      {
        q: "Can this tool get my resume past every ATS?",
        a: "No. Different ATS systems have different parsers and rules. This tool catches the most common ATS-breaking issues and gives you a directional score. The single biggest factor is always matching the keywords in the specific job description.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { BookOpen, Globe, Newspaper, FileText, Plus, Trash2, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { uid, EDU_DISCLAIMER } from "./_edu-helpers";

type SourceType = "book" | "journal" | "website" | "newspaper";

interface Source {
  id: string;
  type: SourceType;
  authors: string; // "Last, First; Last, First"
  title: string;
  year: string;
  // book
  publisher: string;
  edition: string;
  city: string;
  // journal
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  // website
  url: string;
  siteName: string;
  accessed: string; // YYYY-MM-DD
  published: string; // YYYY-MM-DD
  // newspaper
  newspaper: string;
}

const SOURCE_LABELS: Record<SourceType, { label: string; icon: React.ElementType }> = {
  book: { label: "Book", icon: BookOpen },
  journal: { label: "Journal article", icon: FileText },
  website: { label: "Website", icon: Globe },
  newspaper: { label: "Newspaper", icon: Newspaper },
};

function emptySource(type: SourceType): Source {
  return {
    id: uid(),
    type,
    authors: "",
    title: "",
    year: "",
    publisher: "",
    edition: "",
    city: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    doi: "",
    url: "",
    siteName: "",
    accessed: "",
    published: "",
    newspaper: "",
  };
}

// ─── Citation generators ─────────────────────────────────────────────────────

/** Parse "Last, First; Last2, First2" into [{last, first}]. Empty array if blank. */
function parseAuthors(s: string): { last: string; first: string }[] {
  return s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [last, first] = p.split(",").map((x) => x.trim());
      return { last: last || p, first: first || "" };
    });
}

/** "Smith, J." format — last, initials. */
function apaAuthor(authors: { last: string; first: string }[]): string {
  if (authors.length === 0) return "";
  const fmt = (a: { last: string; first: string }) => {
    const initials = a.first
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => `${n[0].toUpperCase()}.`)
      .join(" ");
    return `${a.last}, ${initials}`.trim().replace(/,\s*$/, "");
  };
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])}, & ${fmt(authors[1])}`;
  if (authors.length <= 20) {
    const head = authors.slice(0, -1).map(fmt).join(", ");
    return `${head}, & ${fmt(authors[authors.length - 1])}`;
  }
  const head = authors.slice(0, 19).map(fmt).join(", ");
  return `${head}, . . . ${fmt(authors[authors.length - 1])}`;
}

function mlaAuthor(authors: { last: string; first: string }[]): string {
  if (authors.length === 0) return "";
  const fmtFirst = (a: { last: string; first: string }) =>
    a.first ? `${a.last}, ${a.first}` : a.last;
  if (authors.length === 1) return fmtFirst(authors[0]);
  if (authors.length === 2) return `${fmtFirst(authors[0])}, and ${authors[1].first} ${authors[1].last}`.trim();
  const head = authors.slice(0, 3).map(fmtFirst).join(", ");
  return authors.length > 3 ? `${head}, et al.` : `${head}.`;
}

function chicagoAuthor(authors: { last: string; first: string }[]): string {
  if (authors.length === 0) return "";
  const fmtFirst = (a: { last: string; first: string }) =>
    a.first ? `${a.last}, ${a.first}` : a.last;
  if (authors.length === 1) return fmtFirst(authors[0]);
  const rest = authors.slice(1).map((a) => `${a.first} ${a.last}`.trim()).join(", ");
  return `${fmtFirst(authors[0])}, ${rest}.`;
}

function harvardAuthor(authors: { last: string; first: string }[]): string {
  if (authors.length === 0) return "";
  const fmt = (a: { last: string; first: string }) => {
    const initials = a.first
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => `${n[0].toUpperCase()}.`)
      .join(" ");
    return `${a.last}, ${initials}`.trim().replace(/,\s*$/, "");
  };
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])} and ${fmt(authors[1])}`;
  const head = authors.slice(0, -1).map(fmt).join(", ");
  return `${head}, and ${fmt(authors[authors.length - 1])}`;
}

function fmtDate(s: string, style: "apa" | "mla" | "chicago" | "harvard"): string {
  if (!s) return "";
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y) return s;
  if (!m) return String(y);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthShort = months[m - 1]?.slice(0, 3);
  if (!d) {
    if (style === "apa") return `${months[m - 1]} ${y}`;
    if (style === "mla") return `${months[m - 1]} ${y}`;
    if (style === "chicago") return `${months[m - 1]} ${y}`;
    return `${months[m - 1]} ${y}`;
  }
  if (style === "apa") return `${y}, ${months[m - 1]} ${d}`;
  if (style === "mla") return `${d} ${months[m - 1]} ${y}`;
  if (style === "chicago") return `${months[m - 1]} ${d}, ${y}`;
  return `${d} ${monthShort} ${y}`;
}

function citeAPA(s: Source): string {
  const authors = parseAuthors(s.authors);
  const a = apaAuthor(authors);
  const year = s.year || "n.d.";
  switch (s.type) {
    case "book":
      return [a && `${a} (${year}).`, s.title && `<i>${s.title}</i>`, s.edition && `(${s.edition} ed.).`, s.publisher && `${s.publisher}.`]
        .filter(Boolean).join(" ");
    case "journal":
      return [a && `${a} (${year}).`, s.title, s.journal && `<i>${s.journal}</i>`, [s.volume, s.issue && `(${s.issue})`].filter(Boolean).join(""), s.pages && `${s.pages}.`, s.doi && `https://doi.org/${s.doi}`]
        .filter(Boolean).join(", ").replace(/^/, "") + ".";
    case "website":
      return [a && `${a} (${fmtDate(s.published, "apa") || year}).`, s.title && `<i>${s.title}</i>.`, s.siteName && `${s.siteName}.`, s.url && `${s.url}`, s.accessed && `Retrieved ${fmtDate(s.accessed, "apa")}`]
        .filter(Boolean).join(" ");
    case "newspaper":
      return [a && `${a} (${fmtDate(s.published, "apa") || year}).`, s.title && `${s.title}.`, s.newspaper && `<i>${s.newspaper}</i>.`, s.url && `${s.url}`]
        .filter(Boolean).join(" ");
  }
}

function citeMLA(s: Source): string {
  const authors = parseAuthors(s.authors);
  const a = mlaAuthor(authors);
  const aSuffix = a ? `${a}. ` : "";
  switch (s.type) {
    case "book":
      return [aSuffix, s.title && `<i>${s.title}</i>.`, s.edition && `${s.edition} ed.,`, s.publisher && `${s.publisher},`, s.year && `${s.year}.`].filter(Boolean).join(" ");
    case "journal":
      return [aSuffix, s.title && `"${s.title},"`, s.journal && `<i>${s.journal}</i>,`, s.volume && `vol. ${s.volume},`, s.issue && `no. ${s.issue},`, s.year && `${s.year},`, s.pages && `pp. ${s.pages}.`].filter(Boolean).join(" ");
    case "website":
      return [aSuffix, s.title && `"${s.title}."`, s.siteName && `<i>${s.siteName}</i>,`, (fmtDate(s.published, "mla") || s.year) && `${fmtDate(s.published, "mla") || s.year},`, s.url && `${s.url}.`, s.accessed && `Accessed ${fmtDate(s.accessed, "mla")}.`].filter(Boolean).join(" ");
    case "newspaper":
      return [aSuffix, s.title && `"${s.title}."`, s.newspaper && `<i>${s.newspaper}</i>,`, (fmtDate(s.published, "mla") || s.year) && `${fmtDate(s.published, "mla") || s.year},`, s.url && `${s.url}.`].filter(Boolean).join(" ");
  }
}

function citeChicago(s: Source): string {
  const authors = parseAuthors(s.authors);
  const a = chicagoAuthor(authors);
  const aSuffix = a ? `${a} ` : "";
  switch (s.type) {
    case "book":
      return [aSuffix, s.title && `<i>${s.title}</i>.`, s.edition && `${s.edition} ed.`, s.city && `${s.city}:`, s.publisher && `${s.publisher},`, s.year && `${s.year}.`].filter(Boolean).join(" ");
    case "journal":
      return [aSuffix, `"${s.title},"`, s.journal && `<i>${s.journal}</i>`, s.volume && `${s.volume},`, s.issue && `no. ${s.issue},`, s.pages && `${s.pages}.`].filter(Boolean).join(" ");
    case "website":
      return [aSuffix, `"${s.title},"`, s.siteName && `<i>${s.siteName}</i>,`, (fmtDate(s.published, "chicago") || s.year) && `${fmtDate(s.published, "chicago") || s.year},`, s.url && `${s.url}.`].filter(Boolean).join(" ");
    case "newspaper":
      return [aSuffix, `"${s.title},"`, s.newspaper && `<i>${s.newspaper}</i>,`, (fmtDate(s.published, "chicago") || s.year) && `${fmtDate(s.published, "chicago") || s.year}.`].filter(Boolean).join(" ");
  }
}

function citeHarvard(s: Source): string {
  const authors = parseAuthors(s.authors);
  const a = harvardAuthor(authors);
  const year = s.year || "n.d.";
  switch (s.type) {
    case "book":
      return [a && `${a} ${year},`, s.title && `<i>${s.title}</i>.`, s.edition && `${s.edition} edn.`, s.publisher && `${s.publisher},`, s.city && `${s.city}.`].filter(Boolean).join(" ");
    case "journal":
      return [a && `${a} ${year},`, `'${s.title}',`, s.journal && `<i>${s.journal}</i>,`, s.volume && `vol. ${s.volume},`, s.issue && `no. ${s.issue},`, s.pages && `pp. ${s.pages}.`, s.doi && `https://doi.org/${s.doi}`].filter(Boolean).join(" ");
    case "website":
      return [a && `${a} ${fmtDate(s.published, "harvard") || year},`, s.title && `<i>${s.title}</i>,`, s.siteName && `${s.siteName}.`, s.url && `Viewed ${fmtDate(s.accessed, "harvard")}, <${s.url}>.`].filter(Boolean).join(" ");
    case "newspaper":
      return [a && `${a} ${fmtDate(s.published, "harvard") || year},`, `'${s.title}',`, s.newspaper && `<i>${s.newspaper}</i>,`, s.url && `${s.url}.`].filter(Boolean).join(" ");
  }
}

/** Strip HTML-ish italic tags for the plain-text version of the citation. */
function toPlain(html: string): string {
  return html
    .replace(/<\/?i>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const STYLES = [
  { value: "apa", label: "APA 7" },
  { value: "mla", label: "MLA 9" },
  { value: "chicago", label: "Chicago" },
  { value: "harvard", label: "Harvard" },
] as const;
type Style = (typeof STYLES)[number]["value"];

function cite(s: Source, style: Style): string {
  switch (style) {
    case "apa": return citeAPA(s);
    case "mla": return citeMLA(s);
    case "chicago": return citeChicago(s);
    case "harvard": return citeHarvard(s);
  }
}

export function CitationFormatter({ tool }: { tool: ToolDefinition }) {
  const [sources, setSources] = React.useState<Source[]>(() => [emptySource("book")]);

  const addSource = (type: SourceType) => setSources((p) => [...p, emptySource(type)]);
  const removeSource = (id: string) => setSources((p) => p.filter((s) => s.id !== id));
  const update = (id: string, patch: Partial<Source>) =>
    setSources((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const reset = () => {
    setSources([emptySource("book")]);
    toast.info("Cleared.");
  };

  const copyAll = (style: Style) => {
    const out = sources.map((s) => toPlain(cite(s, style))).filter(Boolean).join("\n\n");
    if (!out) {
      toast.error("Add a source first.");
      return;
    }
    navigator.clipboard.writeText(out).then(
      () => toast.success(`Copied ${sources.length} citations (${style.toUpperCase()})`),
      () => toast.error("Copy failed — please copy manually.")
    );
  };

  const content: ToolContent = {
    intro:
      "Paste your source details once and instantly generate citations in APA 7, MLA 9, Chicago and Harvard. Copy a single citation or all of them at once. Works for books, journal articles, websites and newspapers — all in your browser.",
    tool: (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Add a source:</span>
          {(Object.keys(SOURCE_LABELS) as SourceType[]).map((t) => {
            const Icon = SOURCE_LABELS[t].icon;
            return (
              <Button key={t} size="sm" variant="outline" onClick={() => addSource(t)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {SOURCE_LABELS[t].label}
              </Button>
            );
          })}
          <Button size="sm" variant="ghost" onClick={reset} className="ml-auto">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
          </Button>
        </div>

        <div className="space-y-5">
          {sources.map((s, idx) => (
            <SourceEditor
              key={s.id}
              index={idx}
              source={s}
              onChange={(patch) => update(s.id, patch)}
              onRemove={() => removeSource(s.id)}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated citations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {STYLES.map((st) => {
              const entries = sources
                .map((s) => cite(s, st.value))
                .filter((c) => c.trim().length > 0);
              return (
                <div key={st.value} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {st.label}
                    </h4>
                    <Button size="sm" variant="outline" onClick={() => copyAll(st.value)}>
                      Copy all ({entries.length})
                    </Button>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Fill in at least a title to see a citation here.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {entries.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm"
                        >
                          <span
                            className="flex-1 leading-relaxed"
                            // Italic markup is intentionally rendered here.
                            dangerouslySetInnerHTML={{ __html: c || "&nbsp;" }}
                          />
                          <CopyButton value={() => toPlain(c)} label="" size="icon" />
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    ),
    howTo: [
      {
        title: "Pick a source type",
        description: "Click Book, Journal, Website or Newspaper to add a source card. Add as many as you like.",
      },
      {
        title: "Fill in the fields",
        description: "Enter authors as 'Last, First' separated by semicolons. Year, title and other fields update all four citation styles live.",
      },
      {
        title: "Read or copy the citation",
        description: "Each style shows every citation in order. Click the per-line copy icon, or use 'Copy all' to grab the whole list.",
      },
    ],
    useCases: [
      "Generate a references list for an essay in your required citation style.",
      "Cross-check the same source in APA, MLA, Chicago and Harvard before submitting.",
      "Build a bibliography as you research — add sources as you find them and export at the end.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>{EDU_DISCLAIMER}</li>
        <li>
          The generator follows the most common patterns for each style but does not cover every edge case
          (translated works, multi-volume sets, corporate authors, etc.). Always cross-check against your
          institution's style guide.
        </li>
        <li>Italics are shown inline in the preview and stripped from the plain-text copy. Paste into a rich-text editor to preserve them.</li>
      </ul>
    ),
    faq: [
      {
        q: "How do I enter multiple authors?",
        a: "Type each author as 'Last, First' and separate authors with a semicolon, e.g. 'Smith, Jane; Doe, John'. The formatter handles 'et al.' truncation automatically for sources with more than three authors in MLA.",
      },
      {
        q: "What if I don't know the year?",
        a: "Leave the year blank — APA and Harvard will print 'n.d.' (no date); MLA and Chicago will simply omit it.",
      },
      {
        q: "Does this support Chicago author-date or notes-bibliography?",
        a: "The Chicago output uses the author-date format, which is the most common for science and social-science writing. For footnote style, use the same data but format manually.",
      },
      {
        q: "Are my sources stored anywhere?",
        a: "No. Everything stays in your browser tab for the current session. Close the tab and the data is gone — no server, no cookies, no analytics on what you type.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function SourceEditor({
  index,
  source,
  onChange,
  onRemove,
}: {
  index: number;
  source: Source;
  onChange: (patch: Partial<Source>) => void;
  onRemove: () => void;
}) {
  const Icon = SOURCE_LABELS[source.type].icon;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-primary" />
            Source {index + 1} — {SOURCE_LABELS[source.type].label}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={source.type}
              onValueChange={(v) => onChange({ type: v as SourceType })}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SOURCE_LABELS) as SourceType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {SOURCE_LABELS[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove source">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`s-${source.id}-authors`}>Authors (Last, First; Last, First …)</Label>
          <Input
            id={`s-${source.id}-authors`}
            value={source.authors}
            onChange={(e) => onChange({ authors: e.target.value })}
            placeholder="Smith, Jane; Doe, John"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`s-${source.id}-title`}>Title</Label>
          <Input
            id={`s-${source.id}-title`}
            value={source.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Title of the work"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`s-${source.id}-year`}>Year</Label>
          <Input
            id={`s-${source.id}-year`}
            inputMode="numeric"
            value={source.year}
            onChange={(e) => onChange({ year: e.target.value })}
            placeholder="2024"
          />
        </div>

        {source.type === "book" && (
          <>
            <Field id={`s-${source.id}-publisher`} label="Publisher" value={source.publisher} onChange={(v) => onChange({ publisher: v })} placeholder="Penguin Books" />
            <Field id={`s-${source.id}-city`} label="City (Chicago)" value={source.city} onChange={(v) => onChange({ city: v })} placeholder="London" />
            <Field id={`s-${source.id}-edition`} label="Edition" value={source.edition} onChange={(v) => onChange({ edition: v })} placeholder="2nd" />
          </>
        )}

        {source.type === "journal" && (
          <>
            <Field id={`s-${source.id}-journal`} label="Journal" value={source.journal} onChange={(v) => onChange({ journal: v })} placeholder="Journal Name" />
            <Field id={`s-${source.id}-volume`} label="Volume" value={source.volume} onChange={(v) => onChange({ volume: v })} placeholder="42" />
            <Field id={`s-${source.id}-issue`} label="Issue" value={source.issue} onChange={(v) => onChange({ issue: v })} placeholder="3" />
            <Field id={`s-${source.id}-pages`} label="Pages" value={source.pages} onChange={(v) => onChange({ pages: v })} placeholder="112–128" />
            <Field id={`s-${source.id}-doi`} label="DOI" value={source.doi} onChange={(v) => onChange({ doi: v })} placeholder="10.1234/abc" />
          </>
        )}

        {source.type === "website" && (
          <>
            <Field id={`s-${source.id}-site`} label="Site name" value={source.siteName} onChange={(v) => onChange({ siteName: v })} placeholder="Example.com" />
            <Field id={`s-${source.id}-url`} label="URL" value={source.url} onChange={(v) => onChange({ url: v })} placeholder="https://example.com/article" />
            <div className="space-y-2">
              <Label htmlFor={`s-${source.id}-published`}>Published date</Label>
              <Input id={`s-${source.id}-published`} type="date" value={source.published} onChange={(e) => onChange({ published: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`s-${source.id}-accessed`}>Accessed date</Label>
              <Input id={`s-${source.id}-accessed`} type="date" value={source.accessed} onChange={(e) => onChange({ accessed: e.target.value })} />
            </div>
          </>
        )}

        {source.type === "newspaper" && (
          <>
            <Field id={`s-${source.id}-newspaper`} label="Newspaper" value={source.newspaper} onChange={(v) => onChange({ newspaper: v })} placeholder="The Times" />
            <Field id={`s-${source.id}-url`} label="URL" value={source.url} onChange={(v) => onChange({ url: v })} placeholder="https://…" />
            <div className="space-y-2">
              <Label htmlFor={`s-${source.id}-published`}>Published date</Label>
              <Input id={`s-${source.id}-published`} type="date" value={source.published} onChange={(e) => onChange({ published: e.target.value })} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

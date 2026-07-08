"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE_JSONLD = `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Write Better Headlines",
  "author": {
    "@type": "Person",
    "name": "Jane Doe"
  },
  "datePublished": "2025-02-01",
  "image": "https://example.com/og.png",
  "publisher": {
    "@type": "Organization",
    "name": "Dueneo",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "mainEntityOfPage": "https://example.com/blog/headlines"
}`;

interface SchemaSpec {
  type: string;
  // Fields Google requires for rich results.
  required: string[];
  // Fields that are recommended but not strictly required.
  recommended: string[];
  // Short description of what this type is for.
  description: string;
}

const SCHEMA_SPECS: Record<string, SchemaSpec> = {
  Article: {
    type: "Article",
    required: ["headline", "author", "datePublished", "image", "publisher"],
    recommended: ["dateModified", "mainEntityOfPage", "url"],
    description: "News article, blog post or other written content.",
  },
  Product: {
    type: "Product",
    required: ["name", "offers"],
    recommended: ["image", "description", "brand", "sku", "aggregateRating", "review"],
    description: "A product sold by a business.",
  },
  Event: {
    type: "Event",
    required: ["name", "startDate", "location"],
    recommended: ["endDate", "eventStatus", "eventAttendanceMode", "image", "description", "offers", "organizer"],
    description: "An event happening at a place and time.",
  },
  FAQPage: {
    type: "FAQPage",
    required: ["mainEntity"],
    recommended: [],
    description: "A page of frequently asked questions and answers.",
  },
  HowTo: {
    type: "HowTo",
    required: ["name", "step"],
    recommended: ["description", "image", "totalTime", "supply", "tool", "estimatedCost"],
    description: "Step-by-step instructions for completing a task.",
  },
  Recipe: {
    type: "Recipe",
    required: ["name", "recipeIngredient", "recipeInstructions", "totalTime", "image"],
    recommended: ["cookTime", "prepTime", "nutrition", "yield", "author", "aggregateRating"],
    description: "A cooking recipe with ingredients and steps.",
  },
  BreadcrumbList: {
    type: "BreadcrumbList",
    required: ["itemListElement"],
    recommended: [],
    description: "The breadcrumb trail for the current page.",
  },
  Organization: {
    type: "Organization",
    required: ["name"],
    recommended: ["url", "logo", "sameAs", "contactPoint", "address"],
    description: "A company, institution or other organisation.",
  },
  LocalBusiness: {
    type: "LocalBusiness",
    required: ["name", "address"],
    recommended: ["telephone", "openingHoursSpecification", "url", "image", "geo", "priceRange", "aggregateRating"],
    description: "A physical business with a location (extends Organization).",
  },
  VideoObject: {
    type: "VideoObject",
    required: ["name", "uploadDate"],
    recommended: ["description", "thumbnailUrl", "contentUrl", "embedUrl", "duration", "publisher"],
    description: "A video file or embed.",
  },
};

interface FieldCheck {
  field: string;
  status: "required" | "recommended" | "present";
  message: string;
}

interface ValidationResult {
  status: "valid" | "warnings" | "errors" | "parse-error" | "unknown-type";
  parsed?: unknown;
  error?: string;
  detectedType?: string;
  fields?: FieldCheck[];
  warnings: string[];
  errors: string[];
  notes: string[];
}

function getType(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const t = (node as Record<string, unknown>)["@type"];
  if (typeof t === "string") return t;
  if (Array.isArray(t) && t.length > 0 && typeof t[0] === "string") {
    return t[0];
  }
  return undefined;
}

function hasField(node: unknown, field: string): boolean {
  if (typeof node !== "object" || node === null) return false;
  const v = (node as Record<string, unknown>)[field];
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function validate(node: unknown): ValidationResult {
  const result: ValidationResult = {
    status: "errors",
    warnings: [],
    errors: [],
    notes: [],
  };

  if (typeof node !== "object" || node === null) {
    result.status = "errors";
    result.errors.push("JSON-LD must be a JSON object at the top level.");
    return result;
  }

  const type = getType(node);
  if (!type) {
    result.status = "unknown-type";
    result.errors.push(
      'No @type field detected. Every JSON-LD object needs a "@type" property.'
    );
    return result;
  }

  result.detectedType = type;

  // LocalBusiness extends Organization — apply both spec lists if applicable.
  const specsToCheck: SchemaSpec[] = [];
  if (SCHEMA_SPECS[type]) specsToCheck.push(SCHEMA_SPECS[type]);
  if (type === "LocalBusiness" && SCHEMA_SPECS.Organization) {
    specsToCheck.push(SCHEMA_SPECS.Organization);
  }

  if (specsToCheck.length === 0) {
    result.status = "unknown-type";
    result.notes.push(
      `Type "${type}" is not in the recognised list. The JSON is valid; this tool validates against Article, Product, Event, FAQPage, HowTo, Recipe, BreadcrumbList, Organization, LocalBusiness and VideoObject.`
    );
    return result;
  }

  const seenFields = new Set<string>();
  const fields: FieldCheck[] = [];

  for (const spec of specsToCheck) {
    for (const field of spec.required) {
      if (seenFields.has(field)) continue;
      seenFields.add(field);
      if (hasField(node, field)) {
        fields.push({
          field,
          status: "required",
          message: "Required field present.",
        });
      } else {
        fields.push({
          field,
          status: "required",
          message: "Required field is missing — rich result eligibility affected.",
        });
        result.errors.push(`Missing required field: "${field}" for type ${spec.type}.`);
      }
    }
    for (const field of spec.recommended) {
      if (seenFields.has(field)) continue;
      seenFields.add(field);
      if (hasField(node, field)) {
        fields.push({
          field,
          status: "recommended",
          message: "Recommended field present.",
        });
      } else {
        fields.push({
          field,
          status: "recommended",
          message: "Recommended field is missing — add it for richer results.",
        });
        result.warnings.push(`Missing recommended field: "${field}".`);
      }
    }
  }

  // Type-specific deep checks.
  if (type === "FAQPage") {
    const me = (node as Record<string, unknown>)["mainEntity"];
    if (Array.isArray(me)) {
      me.forEach((q, i) => {
        if (!hasField(q, "question") || !hasField(q, "acceptedAnswer")) {
          result.errors.push(
            `FAQPage mainEntity[${i}] must have "question" and "acceptedAnswer".`
          );
        }
      });
    } else if (me !== undefined) {
      result.warnings.push(
        'FAQPage mainEntity should be an array of Question objects.'
      );
    }
  }

  if (type === "BreadcrumbList") {
    const list = (node as Record<string, unknown>)["itemListElement"];
    if (Array.isArray(list)) {
      list.forEach((item, i) => {
        if (!hasField(item, "name") || (!hasField(item, "item") && !hasField(item, "url"))) {
          result.warnings.push(
            `BreadcrumbList itemListElement[${i}] should have "name" and "item"/"url".`
          );
        }
      });
    }
  }

  if (type === "Article") {
    const author = (node as Record<string, unknown>)["author"];
    if (author && typeof author === "object") {
      if (!hasField(author, "name")) {
        result.warnings.push('Article author should have a "name" field.');
      }
    } else if (typeof author === "string") {
      // String author is valid but Google prefers Person/Organization objects.
      result.notes.push(
        'Article author is a plain string — Google prefers {"@type": "Person", "name": "..."}.'
      );
    }
  }

  if (type === "Product") {
    const offers = (node as Record<string, unknown>)["offers"];
    if (offers && typeof offers === "object" && !Array.isArray(offers)) {
      if (!hasField(offers, "price") && !hasField(offers, "priceSpecification")) {
        result.warnings.push('Product offers should have "price" or "priceSpecification".');
      }
    }
  }

  result.fields = fields;
  if (result.errors.length > 0) result.status = "errors";
  else if (result.warnings.length > 0) result.status = "warnings";
  else result.status = "valid";
  return result;
}

function tryParse(text: string): ValidationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      status: "errors",
      warnings: [],
      errors: [],
      notes: ["Paste JSON-LD to validate."],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "parse-error",
      warnings: [],
      errors: [],
      notes: [],
      error: message,
    };
  }

  // Allow either a single object or an array of objects, or a @graph wrapper.
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        status: "errors",
        warnings: [],
        errors: ["Empty JSON array."],
        notes: [],
      };
    }
    // Validate the first item — most pages have a single primary type.
    return validate(parsed[0]);
  }
  if (typeof parsed === "object" && parsed !== null && "@graph" in parsed) {
    const graph = (parsed as Record<string, unknown>)["@graph"];
    if (Array.isArray(graph) && graph.length > 0) {
      const r = validate(graph[0]);
      r.notes.push("@graph detected — validated the first node only.");
      return r;
    }
  }
  return validate(parsed);
}

const STATUS_STYLE = {
  valid: {
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
    label: "Valid",
    banner: "border-emerald-500/40 bg-emerald-500/10",
  },
  warnings: {
    icon: <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
    label: "Warnings",
    banner: "border-amber-500/40 bg-amber-500/10",
  },
  errors: {
    icon: <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
    label: "Errors",
    banner: "border-rose-500/40 bg-rose-500/10",
  },
  "parse-error": {
    icon: <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
    label: "JSON parse error",
    banner: "border-rose-500/40 bg-rose-500/10",
  },
  "unknown-type": {
    icon: <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
    label: "Unrecognised type",
    banner: "border-amber-500/40 bg-amber-500/10",
  },
} as const;

export function SchemaValidator({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState(SAMPLE_JSONLD);

  const result = React.useMemo(() => tryParse(text), [text]);

  const reset = () => {
    setText(SAMPLE_JSONLD);
    toast.info("Reset to sample JSON-LD.");
  };

  const spec = result.detectedType ? SCHEMA_SPECS[result.detectedType] : undefined;
  const style = STATUS_STYLE[result.status];

  const content: ToolContent = {
    intro:
      "Paste JSON-LD structured data to validate it against schema.org types Google supports for rich results. The tool checks required and recommended fields for Article, Product, Event, FAQPage, HowTo, Recipe, BreadcrumbList, Organization, LocalBusiness and VideoObject.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="sv-input">JSON-LD</Label>
              <Textarea
                id="sv-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={18}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Result */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className={`flex items-center gap-3 rounded-lg border p-3 ${style.banner}`}>
              {style.icon}
              <div className="text-sm">
                <div className="font-semibold">{style.label}</div>
                {result.detectedType && (
                  <div className="text-xs text-muted-foreground">
                    Type: <code className="rounded bg-background px-1 py-0.5">{result.detectedType}</code>
                  </div>
                )}
              </div>
            </div>

            {result.status === "parse-error" && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
                <p className="font-semibold">Could not parse JSON.</p>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono">{result.error}</pre>
              </div>
            )}

            {spec && (
              <div className="rounded-lg border bg-background p-3 text-xs">
                <p className="font-medium">{spec.type}</p>
                <p className="mt-0.5 text-muted-foreground">{spec.description}</p>
              </div>
            )}

            {result.fields && result.fields.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Field checks</h3>
                <ul className="space-y-1.5">
                  {result.fields.map((f, i) => {
                    const ok = f.message.startsWith("Required field present") || f.message.startsWith("Recommended field present");
                    const isRequired = f.status === "required";
                    return (
                      <li
                        key={i}
                        className={`flex items-start gap-2 rounded-md border p-2 text-xs ${
                          ok
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : isRequired
                              ? "border-rose-500/30 bg-rose-500/5"
                              : "border-amber-500/30 bg-amber-500/5"
                        }`}
                      >
                        {ok ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600 dark:text-emerald-400" />
                        ) : isRequired ? (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-rose-600 dark:text-rose-400" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-600 dark:text-amber-400" />
                        )}
                        <span>
                          <code className="font-mono">{f.field}</code> — {f.message}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400">Errors</h3>
                <ul className="space-y-1 text-xs text-rose-700 dark:text-rose-300">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>•</span> <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">Warnings</h3>
                <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>•</span> <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.notes.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Notes</h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {result.notes.map((n, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>•</span> <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Supported types reference */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Supported types</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(SCHEMA_SPECS).map((s) => (
              <div key={s.type} className="rounded-lg border bg-background p-3 text-xs">
                <div className="flex items-center justify-between">
                  <code className="font-mono font-semibold">{s.type}</code>
                  <Badge variant="outline" className="text-[10px]">
                    {s.required.length} req
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{s.description}</p>
                <p className="mt-1.5 text-muted-foreground">
                  <span className="font-medium">Required:</span>{" "}
                  {s.required.join(", ") || "—"}
                </p>
                {s.recommended.length > 0 && (
                  <p className="mt-0.5 text-muted-foreground">
                    <span className="font-medium">Recommended:</span>{" "}
                    {s.recommended.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Paste your JSON-LD",
        description:
          "Copy the contents of a <script type=\"application/ld+json\"> block. A single object, an array, or a @graph wrapper are all accepted.",
      },
      {
        title: "Read the status banner",
        description:
          "Valid (green) means required fields are present. Warnings (amber) flag missing recommended fields. Errors (red) block rich-result eligibility.",
      },
      {
        title: "Check the field list",
        description:
          "Each required and recommended field is marked present (green), missing-required (red) or missing-recommended (amber), with a short explanation.",
      },
      {
        title: "Read the spec reference",
        description:
          "The bottom grid shows every supported type with its required and recommended fields. Use it to plan which fields to add.",
      },
    ],
    useCases: [
      "Validate an Article's JSON-LD before deploying a blog post.",
      "Check that a Product has offers, image and aggregateRating for merchant listings.",
      "Audit a FAQPage to ensure every Question has an acceptedAnswer.",
      "Verify a LocalBusiness has address, openingHours and geo for local search.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The tool checks field presence, not full schema.org type-correctness.
          It does not validate nested object shapes, value ranges or enum
          values.
        </li>
        <li>
          For arrays of multiple types (e.g. an Article + BreadcrumbList in a
          single JSON-LD array), only the first item is validated.
        </li>
        <li>
          Google's rich-result eligibility rules change frequently. This tool
          reflects common required fields at time of writing — always cross-check
          with Google's Rich Results Test.
        </li>
        <li>
          Only the 10 listed types have detailed checks. Other types parse
          successfully but produce an "Unrecognised type" notice.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does my JSON-LD show 'Valid' but Google's test still complains?",
        a: "This tool checks field presence only. Google's Rich Results Test also validates value formats, enum membership and nested object shapes. Always confirm with Google's tester before launch.",
      },
      {
        q: "How do I validate multiple types on one page?",
        a: "Wrap them in an array or use a @graph. This tool validates only the first node. Run it once per type by pasting each object separately.",
      },
      {
        q: "What is the difference between required and recommended fields?",
        a: "Required fields are needed for Google to show a rich result at all. Recommended fields improve quality and eligibility for richer features but are not strictly mandatory.",
      },
      {
        q: "Does LocalBusiness inherit Organization fields?",
        a: "Yes. The tool merges the Organization required/recommended lists when validating a LocalBusiness, since LocalBusiness extends Organization.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

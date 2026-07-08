"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Wand2, AlertTriangle, RotateCcw } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, describeJsonError } from "./_dev-helpers";

const SAMPLE = `{
  "id": 42,
  "name": "Dueneo",
  "tags": ["dev", "tools"],
  "active": true,
  "owner": { "id": 1, "email": "dev@dueneo.test" },
  "members": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "email": "bob@dueneo.test" }
  ],
  "metadata": null
}`;

/* ───────────────────────── Type inference engine ───────────────────────── */

interface FieldInfo {
  type: string;
  optional: boolean;
}

interface TsContext {
  declarations: Map<string, Map<string, FieldInfo>>;
  usedNames: Set<string>;
  style: "interface" | "type";
}

function pascalCase(input: string): string {
  // Strip leading digits and replace non-identifier chars with spaces.
  const cleaned = input.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  if (!cleaned) return "Anonymous";
  const parts = cleaned.split(/\s+/);
  const result = parts.map((p) => {
    if (!p) return "";
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join("");
  if (/^[0-9]/.test(result)) return `_${result}`;
  return result;
}

function singularize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith("ies") && lower.length > 3) {
    return name.slice(0, -3) + "y";
  }
  if (/(?:s|x|z|ch|sh)es$/.test(lower)) {
    return name.slice(0, -2);
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 1) {
    return name.slice(0, -1);
  }
  return name;
}

function uniqueName(ctx: TsContext, base: string): string {
  let candidate = base;
  if (!/^[A-Za-z_$]/.test(candidate)) candidate = `_${candidate}`;
  if (!ctx.usedNames.has(candidate)) {
    ctx.usedNames.add(candidate);
    return candidate;
  }
  let i = 2;
  while (ctx.usedNames.has(`${candidate}${i}`)) i++;
  const name = `${candidate}${i}`;
  ctx.usedNames.add(name);
  return name;
}

/** Primitive type label for a single JSON value. */
function primitiveType(value: unknown): string | null {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return null;
}

/**
 * Infer the TypeScript type for `value`. The `keyName` is the field name
 * that holds the value (used to name nested interfaces), and `parentName`
 * is the name of the enclosing interface (used as a fallback for the root).
 */
function inferType(
  value: unknown,
  keyName: string,
  parentName: string,
  ctx: TsContext
): string {
  const prim = primitiveType(value);
  if (prim) return prim;

  if (Array.isArray(value)) {
    return inferArrayType(value, keyName, parentName, ctx);
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const name = keyName === "$root" ? parentName : uniqueName(ctx, pascalCase(keyName));
    emitObject(ctx, name, record);
    return name;
  }

  return "unknown";
}

/** Infer the element type of an array, merging objects when possible. */
function inferArrayType(
  arr: unknown[],
  keyName: string,
  parentName: string,
  ctx: TsContext
): string {
  if (arr.length === 0) return "unknown[]";

  const allObjects = arr.every(
    (v) => v !== null && typeof v === "object" && !Array.isArray(v)
  );

  if (allObjects) {
    const childName = uniqueName(ctx, pascalCase(singularize(keyName || parentName || "Item")));
    mergeObjects(ctx, childName, arr as Record<string, unknown>[]);
    return `${childName}[]`;
  }

  // Mixed / primitive / nested-array element types — take a union.
  const elementTypes = new Set<string>();
  for (const el of arr) {
    if (Array.isArray(el)) {
      // Inline nested array element inference without creating a named iface.
      const inner = inferArrayType(el, keyName, parentName, ctx);
      elementTypes.add(inner);
    } else {
      elementTypes.add(inferType(el, singularize(keyName) || "item", parentName, ctx));
    }
  }
  const distinct = Array.from(elementTypes);
  if (distinct.length === 1) return `${distinct[0]}[]`;
  return `(${distinct.join(" | ")})[]`;
}

/** Emit a named object interface from a single JSON object. */
function emitObject(
  ctx: TsContext,
  name: string,
  record: Record<string, unknown>
): void {
  if (ctx.declarations.has(name)) return;
  // Reserve the slot up-front to prevent infinite recursion on cycles
  // (JSON has no cycles, but defensive coding is cheap).
  ctx.declarations.set(name, new Map());
  const fields = new Map<string, FieldInfo>();
  for (const [k, v] of Object.entries(record)) {
    fields.set(k, {
      type: inferType(v, k, name, ctx),
      optional: false,
    });
  }
  ctx.declarations.set(name, fields);
}

/**
 * Merge an array of JSON objects into one interface. Keys present in some
 * elements but not others become optional fields.
 */
function mergeObjects(
  ctx: TsContext,
  name: string,
  objects: Record<string, unknown>[]
): void {
  if (ctx.declarations.has(name)) return;
  ctx.declarations.set(name, new Map());

  const keyCount = new Map<string, number>();
  const keyValues = new Map<string, unknown[]>();

  for (const obj of objects) {
    for (const [k, v] of Object.entries(obj)) {
      keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
      const list = keyValues.get(k) ?? [];
      list.push(v);
      keyValues.set(k, list);
    }
  }

  const fields = new Map<string, FieldInfo>();
  for (const [k, values] of keyValues) {
    const optional = (keyCount.get(k) ?? 0) < objects.length;
    const allObjects = values.every(
      (v) => v !== null && typeof v === "object" && !Array.isArray(v)
    );
    const allArrays = values.every((v) => Array.isArray(v));
    const allPrimitives = values.every((v) => primitiveType(v) !== null || v === null);

    let type: string;
    if (allObjects) {
      const childName = uniqueName(ctx, pascalCase(singularize(k)));
      mergeObjects(ctx, childName, values as Record<string, unknown>[]);
      type = childName;
    } else if (allArrays) {
      const elementTypes = new Set<string>();
      for (const arr of values as unknown[][]) {
        if (arr.length === 0) continue;
        // Reuse inferArrayType but guard against re-creating ifaces.
        const t = inferArrayType(arr, k, name, ctx);
        elementTypes.add(t);
      }
      const distinct = Array.from(elementTypes);
      type = distinct.length === 0 ? "unknown[]" : distinct.length === 1 ? distinct[0] : `(${distinct.join(" | ")})[]`;
    } else if (allPrimitives) {
      const types = new Set<string>();
      for (const v of values) types.add(primitiveType(v) ?? "unknown");
      type = Array.from(types).join(" | ");
    } else {
      // Mixed — fall back to per-element inference and dedupe by string.
      const types = new Set<string>();
      for (const v of values) {
        types.add(inferType(v, k, name, ctx));
      }
      type = Array.from(types).join(" | ");
    }
    fields.set(k, { type, optional });
  }

  ctx.declarations.set(name, fields);
}

/** Sanitise a JSON key into a safe TypeScript property name (quoted if needed). */
function propertyName(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return JSON.stringify(key);
}

/** Render the final TypeScript source from the context. */
function renderDeclarations(ctx: TsContext, rootName: string): string {
  const lines: string[] = [];
  // Render root first, then nested — declarations Map preserves insertion order.
  for (const [name, fields] of ctx.declarations) {
    if (ctx.style === "interface") {
      lines.push(`interface ${name} {`);
    } else {
      lines.push(`type ${name} = {`);
    }
    for (const [k, info] of fields) {
      const opt = info.optional ? "?" : "";
      lines.push(`  ${propertyName(k)}${opt}: ${info.type};`);
    }
    lines.push(ctx.style === "interface" ? `}` : `};`);
    lines.push("");
  }
  void rootName; // rootName is used during inference, not rendering.
  return lines.join("\n").trimEnd() + "\n";
}

interface GenerateResult {
  ok: true;
  code: string;
}
interface GenerateError {
  ok: false;
  error: string;
  line?: number;
  excerpt?: string;
}

function generate(jsonText: string, rootName: string, style: "interface" | "type"): GenerateResult | GenerateError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const info = describeJsonError(e, jsonText);
    return { ok: false, error: info.message, line: info.line, excerpt: info.excerpt };
  }

  const ctx: TsContext = {
    declarations: new Map(),
    usedNames: new Set(),
    style,
  };

  // Top-level handling: objects get the root name; arrays/primitives get a type alias.
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const name = uniqueName(ctx, rootName || "Root");
    emitObject(ctx, name, parsed as Record<string, unknown>);
  } else {
    // Wrap the top-level value in a type alias of the root name.
    const name = uniqueName(ctx, rootName || "Root");
    ctx.usedNames.add(name);
    const innerType = inferType(parsed, "$root", name, ctx);
    // emitObject reserved a slot — replace with a synthetic alias.
    if (!ctx.declarations.has(name)) {
      ctx.declarations.set(name, new Map([["__alias__", { type: innerType, optional: false }]]));
    }
  }

  // Re-render: handle the synthetic alias case.
  const lines: string[] = [];
  for (const [name, fields] of ctx.declarations) {
    const alias = fields.get("__alias__");
    if (alias) {
      lines.push(`type ${name} = ${alias.type};`);
      lines.push("");
      continue;
    }
    if (style === "interface") {
      lines.push(`interface ${name} {`);
    } else {
      lines.push(`type ${name} = {`);
    }
    for (const [k, info] of fields) {
      if (k === "__alias__") continue;
      const opt = info.optional ? "?" : "";
      lines.push(`  ${propertyName(k)}${opt}: ${info.type};`);
    }
    lines.push(style === "interface" ? `}` : `};`);
    lines.push("");
  }

  return { ok: true, code: lines.join("\n").trimEnd() + "\n" };
}

/* ─────────────────────────── Syntax highlighter ────────────────────────── */

const TS_KEYWORDS = new Set([
  "interface",
  "type",
  "const",
  "let",
  "var",
  "export",
  "import",
  "from",
  "null",
  "undefined",
  "true",
  "false",
  "number",
  "string",
  "boolean",
  "unknown",
  "any",
  "void",
  "never",
]);

function highlightTs(code: string): React.ReactNode {
  const tokens = code.split(/(\b|\s|[{}()\[\];:,?|])/).filter((t) => t !== "");
  return tokens.map((tok, i) => {
    if (TS_KEYWORDS.has(tok)) {
      return (
        <span key={i} className="text-purple-600 dark:text-purple-400 font-medium">
          {tok}
        </span>
      );
    }
    if (/^[A-Z][A-Za-z0-9_]*$/.test(tok)) {
      return (
        <span key={i} className="text-emerald-700 dark:text-emerald-400">
          {tok}
        </span>
      );
    }
    if (/^".*"$/.test(tok) || /^'.*'$/.test(tok)) {
      return (
        <span key={i} className="text-amber-600 dark:text-amber-400">
          {tok}
        </span>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

/* ────────────────────────────── Component ──────────────────────────────── */

export function JSONToTypeScript({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [rootName, setRootName] = React.useState("Root");
  const [style, setStyle] = React.useState<"interface" | "type">("interface");
  const [optionalFields, setOptionalFields] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [errorLine, setErrorLine] = React.useState<number | null>(null);
  const [errorExcerpt, setErrorExcerpt] = React.useState<string | null>(null);

  const generate_ = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some JSON first.");
      setOutput("");
      setErrorLine(null);
      setErrorExcerpt(null);
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      setErrorLine(null);
      setErrorExcerpt(null);
      return;
    }
    const result = generate(input, rootName || "Root", style);
    if (!result.ok) {
      setError(result.error);
      setErrorLine(result.line ?? null);
      setErrorExcerpt(result.excerpt ?? null);
      setOutput("");
      toast.error("Invalid JSON — see the error message.");
      return;
    }
    let code = result.code;
    if (!optionalFields) {
      // Strip the `?` from optional fields.
      code = code.replace(/\?(\s*:)/g, "$1");
    }
    setOutput(code);
    setError(null);
    setErrorLine(null);
    setErrorExcerpt(null);
    toast.success("TypeScript generated.");
  }, [input, rootName, style, optionalFields]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
    setErrorLine(null);
    setErrorExcerpt(null);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setOutput("");
  };

  const content: ToolContent = {
    intro:
      "Paste any JSON payload and instantly get clean TypeScript interfaces. Handles nested objects, arrays of mixed shapes, optional fields and union element types — all generated in your browser, nothing uploaded.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jts-input">Input JSON</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="jts-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'{"name":"Dueneo","version":1,"tags":["dev"]}'}
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input JSON"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="jts-output">TypeScript output</Label>
              <CopyButton value={output} size="sm" label="Copy" />
            </div>
            <pre
              id="jts-output"
              className="min-h-[300px] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
              aria-label="TypeScript output"
            >
              {output ? (
                <code>{highlightTs(output)}</code>
              ) : (
                <span className="text-muted-foreground">
                  Generated TypeScript will appear here.
                </span>
              )}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-5 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="jts-root">Root name</Label>
            <Input
              id="jts-root"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              className="w-40 font-mono text-sm"
              placeholder="Root"
            />
          </div>

          <div className="space-y-2">
            <Label>Declaration style</Label>
            <RadioGroup
              value={style}
              onValueChange={(v) => setStyle(v as "interface" | "type")}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="interface" id="jts-iface" /> interface
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="type" id="jts-type" /> type
              </Label>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="jts-optional"
              checked={optionalFields}
              onCheckedChange={setOptionalFields}
            />
            <Label htmlFor="jts-optional" className="text-sm font-normal">
              Optional fields (when arrays differ)
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={generate_}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Generate
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div className="space-y-1">
                <p className="font-medium">Could not generate TypeScript</p>
                <p>{error}</p>
                {errorLine !== null && (
                  <p className="text-xs">
                    Around line {errorLine}
                    {errorExcerpt ? `: ${errorExcerpt.trim().slice(0, 120)}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {output && (
          <p className="text-xs text-muted-foreground">
            {output.split("\n").length} lines · {byteLength(output)} bytes
          </p>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Paste your JSON",
        description:
          "Drop any valid JSON — an API response, a config file, a fixture — into the left-hand editor.",
      },
      {
        title: "Pick a root name and style",
        description:
          "Name the top-level interface (default `Root`) and choose between `interface` and `type` declarations.",
      },
      {
        title: "Toggle optional fields",
        description:
          "When an array contains objects with differing keys, the missing keys become optional (`?`) fields. Turn this off to force every field required.",
      },
      {
        title: "Generate and copy",
        description:
          "Click Generate. Nested objects get their own interfaces named after the parent key (singularised for arrays). Copy the result straight into your `.ts` file.",
      },
    ],
    useCases: [
      "Generate TypeScript types for an API you don't control and don't have an OpenAPI spec for.",
      "Turn a JSON config fixture into strict types so future edits are caught at compile time.",
      "Quickly sketch the shape of a third-party webhook payload before writing the handler.",
      "Bootstrap a typed client for an internal service from a sample response.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>
          The union-of-primitives inference is structural — `42` and `\"hello\"` in the same array
          become <code>number | string</code>, not a string-literal union.
        </li>
        <li>
          Empty arrays become <code>unknown[]</code> because the element type cannot be inferred.
        </li>
        <li>
          String enums and string-literal unions are not detected — every string becomes
          <code> string</code>.
        </li>
        <li>JSON keys that aren't valid identifiers are emitted as quoted property names.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my JSON sent to a server?",
        a: "No. Parsing and type inference happen entirely in your browser with the built-in JSON object. Nothing is transmitted.",
      },
      {
        q: "How are array element types inferred?",
        a: "If every element is an object, all elements are merged into a single interface (keys present in some but not others become optional). Otherwise the distinct element types are unioned — e.g. [1, \"hi\"] becomes (number | string)[].",
      },
      {
        q: "Why are nested interfaces named after the parent key?",
        a: "So you get readable names like `User` and `UserAddress` instead of `Root1`, `Root2`. Array keys are singularised (users → User).",
      },
      {
        q: "What about JSON with circular references?",
        a: "JSON itself cannot represent cycles, so this is never an issue. The generator works on the parsed JSON value tree.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

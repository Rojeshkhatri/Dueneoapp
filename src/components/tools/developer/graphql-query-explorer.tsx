"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  GitMerge,
  Hash,
  Layers,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE = `type Query {
  me: User
  user(id: ID!): User
  users(limit: Int = 10, offset: Int = 0, filter: UserFilter): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean!
}

type User {
  id: ID!
  name: String!
  email: String!
  role: Role!
  posts(limit: Int = 5): [Post!]!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
  tags: [String!]!
}

enum Role { ADMIN EDITOR VIEWER }

input CreateUserInput {
  name: String!
  email: String!
  role: Role = VIEWER
}

input UpdateUserInput {
  name: String
  email: String
  role: Role
}

input UserFilter {
  role: Role
  search: String
}`;

interface GqlField {
  name: string;
  args: { name: string; type: string; defaultValue?: string }[];
  returnType: string;
  description?: string;
}

interface GqlType {
  name: string;
  kind: "type" | "input" | "interface" | "enum" | "union" | "scalar" | "schema";
  fields: GqlField[];
  enumValues?: string[];
  unionMembers?: string[];
  description?: string;
}

interface ParsedSchema {
  types: Record<string, GqlType>;
  queryType?: string;
  mutationType?: string;
  subscriptionType?: string;
  errors: string[];
}

export function GraphQLQueryExplorer({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState("");
  const [schema, setSchema] = React.useState<ParsedSchema | null>(null);
  const [query, setQuery] = React.useState<string | null>(null);
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set());
  const [selectedArgs, setSelectedArgs] = React.useState<Record<string, string>>({});
  const [filter, setFilter] = React.useState("");

  const parse = React.useCallback(() => {
    if (!raw.trim()) {
      setSchema(null);
      setQuery(null);
      toast.error("Paste a GraphQL schema first.");
      return;
    }
    const s = parseSdl(raw);
    setSchema(s);
    setSelectedFields(new Set());
    setSelectedArgs({});
    setQuery(null);
    if (s.errors.length > 0) {
      toast.warning(`Parsed with ${s.errors.length} warning(s).`);
    } else {
      toast.success(`Parsed ${Object.keys(s.types).length} types.`);
    }
  }, [raw]);

  const loadSample = () => {
    setRaw(SAMPLE);
    const s = parseSdl(SAMPLE);
    setSchema(s);
    setSelectedFields(new Set());
    setSelectedArgs({});
    setQuery(null);
  };

  const reset = () => {
    setRaw("");
    setSchema(null);
    setQuery(null);
    setSelectedFields(new Set());
    setSelectedArgs({});
    setFilter("");
  };

  const queryFields = React.useMemo(() => {
    if (!schema || !schema.queryType) return [];
    return schema.types[schema.queryType]?.fields ?? [];
  }, [schema]);

  const mutationFields = React.useMemo(() => {
    if (!schema || !schema.mutationType) return [];
    return schema.types[schema.mutationType]?.fields ?? [];
  }, [schema]);

  const handleFieldToggle = (opName: string, checked: boolean) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (checked) next.add(opName);
      else {
        next.delete(opName);
        // Clean up args for this op.
        setSelectedArgs((args) => {
          const a = { ...args };
          for (const k of Object.keys(a)) {
            if (k.startsWith(`${opName}.`)) delete a[k];
          }
          return a;
        });
      }
      return next;
    });
  };

  const buildQuery = () => {
    if (!schema) return;
    const ops: string[] = [];
    for (const opName of selectedFields) {
      const isMutation = mutationFields.some((f) => f.name === opName);
      const field = [...queryFields, ...mutationFields].find((f) => f.name === opName);
      if (!field) continue;

      const argParts = field.args.map((a) => {
        const val = selectedArgs[`${opName}.${a.name}`];
        if (val === undefined || val === "") return null;
        return `${a.name}: ${val}`;
      }).filter((x): x is string => x !== null);

      const argStr = argParts.length > 0 ? `(${argParts.join(", ")})` : "";
      const selection = buildSelection(field.returnType, schema, 1);
      const opType = isMutation ? "mutation" : "query";

      const body = selection
        ? `  ${opName}${argStr} {\n${selection}\n  }`
        : `  ${opName}${argStr}`;

      ops.push(`${opType} ${opName} {\n${body}\n}`);
    }
    if (ops.length === 0) {
      toast.error("Select at least one field.");
      setQuery(null);
      return;
    }
    setQuery(ops.join("\n\n"));
    toast.success("Query built.");
  };

  const q = filter.trim().toLowerCase();
  const filteredTypes = React.useMemo(() => {
    if (!schema) return [];
    const all = Object.values(schema.types);
    if (!q) return all;
    return all.filter((t) => t.name.toLowerCase().includes(q) || t.fields.some((f) => f.name.toLowerCase().includes(q)));
  }, [schema, q]);

  const content: ToolContent = {
    intro:
      "Paste a GraphQL SDL schema and explore its types, queries and mutations. Click a query or mutation to drill into its fields and arguments, tick the sub-fields you want, and the tool generates a ready-to-run GraphQL query string — with variable declarations and nested selections. Pure browser parsing, no server.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="gql-input">GraphQL SDL schema</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="gql-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="type Query { ... }"
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="GraphQL SDL input"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={parse}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Parse schema
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
            {schema && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter types or fields…"
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
                />
              </div>
            )}
            {schema && schema.errors.length > 0 && (
              <div className="rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                {schema.errors.length} parse warning(s): {schema.errors[0]}
              </div>
            )}
            {schema && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Boxes className="h-3.5 w-3.5" /> Types ({filteredTypes.length})
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto thin-scroll pr-1">
                  {filteredTypes.map((t) => (
                    <TypeRow key={t.name} t={t} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {schema && (queryFields.length > 0 || mutationFields.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {queryFields.length > 0 && (
              <OperationList
                title="Queries"
                icon={Zap}
                fields={queryFields}
                schema={schema}
                selectedFields={selectedFields}
                selectedArgs={selectedArgs}
                onToggle={handleFieldToggle}
                onArgChange={(op, arg, val) => setSelectedArgs((p) => ({ ...p, [`${op}.${arg}`]: val }))}
              />
            )}
            {mutationFields.length > 0 && (
              <OperationList
                title="Mutations"
                icon={GitMerge}
                fields={mutationFields}
                schema={schema}
                selectedFields={selectedFields}
                selectedArgs={selectedArgs}
                onToggle={handleFieldToggle}
                onArgChange={(op, arg, val) => setSelectedArgs((p) => ({ ...p, [`${op}.${arg}`]: val }))}
              />
            )}
          </div>
        )}

        {schema && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={buildQuery}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Build query
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedFields.size} field{selectedFields.size === 1 ? "" : "s"} selected.
              </span>
              {query && <CopyButton size="sm" value={query} />}
            </div>
            {query ? (
              <pre className="max-h-80 overflow-auto thin-scroll rounded-md border bg-background p-3 text-xs font-mono">
                {query}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tick one or more query/mutation fields above, fill in any arguments, then click Build query. The output
                includes variable declarations and nested selections based on the schema.
              </p>
            )}
          </div>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your SDL", description: "Drop a .graphql schema file's contents, or click Load sample to try a small blog schema." },
      { title: "Parse", description: "Click Parse schema. The tool reads every type, input, enum and operation defined in your SDL." },
      { title: "Explore types", description: "Browse the type list on the right. Each type expands to show its fields, arguments and return types." },
      { title: "Build a query", description: "Tick the query or mutation fields you want, fill in argument values, then click Build query. The generated string is ready to paste into your GraphQL client." },
    ],
    useCases: [
      "Understand a third-party GraphQL API before writing client code.",
      "Generate a starter query to copy into Postman, Apollo Studio or curl.",
      "Teach the structure of GraphQL: operations, fields, arguments, variables, nested selections.",
      "Quickly find which fields a type exposes without grepping the schema file.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The SDL parser is hand-rolled and supports the common constructs: types, inputs, enums, interfaces, unions, scalars, descriptions and field arguments.</li>
        <li>Directives, custom scalars and schema extensions are parsed but not deeply modelled.</li>
        <li>Argument values you type are inserted verbatim — wrap strings in quotes yourself.</li>
        <li>The tool does not execute the query; use it together with your GraphQL endpoint.</li>
      </ul>
    ),
    faq: [
      { q: "Does this run the query against a server?", a: "No. It only builds the query string from your schema. You run it yourself against your GraphQL endpoint." },
      { q: "Can it generate fragments?", a: "Not yet — selections are inlined. For shared fragments, copy the selection set into a fragment manually." },
      { q: "What if my schema uses .graphql files with imports?", a: "Concatenate the imported files into one SDL block before pasting. The tool parses a single SDL document." },
      { q: "Why are some types shown without fields?", a: "Enums show their values, unions show their members, and scalars have no fields — that is expected." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function TypeRow({ t }: { t: GqlType }) {
  const [open, setOpen] = React.useState(false);
  const icon = typeIcon(t.kind);
  const kindColor = typeKindColor(t.kind);
  return (
    <div className="rounded-md border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-2 text-left text-xs hover:bg-muted/40"
      >
        <ChevronRight className={`h-3 w-3 flex-none text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        {icon}
        <span className="font-mono font-medium">{t.name}</span>
        <Badge variant="outline" className={`ml-auto text-[10px] ${kindColor}`}>{t.kind}</Badge>
      </button>
      {open && (
        <div className="border-t p-2">
          {t.kind === "enum" && t.enumValues ? (
            <div className="flex flex-wrap gap-1">
              {t.enumValues.map((v) => (
                <Badge key={v} variant="secondary" className="font-mono text-[10px]">{v}</Badge>
              ))}
            </div>
          ) : t.kind === "union" && t.unionMembers ? (
            <div className="flex flex-wrap gap-1">
              {t.unionMembers.map((v) => (
                <Badge key={v} variant="outline" className="font-mono text-[10px]">{v}</Badge>
              ))}
            </div>
          ) : t.fields.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No fields (scalar).</p>
          ) : (
            <ul className="space-y-1">
              {t.fields.map((f) => (
                <li key={f.name} className="font-mono text-[11px]">
                  <span className="text-primary">{f.name}</span>
                  {f.args.length > 0 && (
                    <span className="text-muted-foreground">
                      ({f.args.map((a) => `${a.name}: ${a.type}`).join(", ")})
                    </span>
                  )}
                  <span className="text-muted-foreground">: </span>
                  <span className="text-emerald-600 dark:text-emerald-400">{f.returnType}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OperationList({
  title,
  icon: Icon,
  fields,
  schema,
  selectedFields,
  selectedArgs,
  onToggle,
  onArgChange,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: GqlField[];
  schema: ParsedSchema;
  selectedFields: Set<string>;
  selectedArgs: Record<string, string>;
  onToggle: (name: string, checked: boolean) => void;
  onArgChange: (op: string, arg: string, val: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{fields.length}</Badge>
      </div>
      <ul className="space-y-2">
        {fields.map((f) => {
          const checked = selectedFields.has(f.name);
          return (
            <li key={f.name} className="rounded-md border bg-muted/20 p-2 text-xs">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggle(f.name, e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="font-mono">
                    <span className="font-semibold text-primary">{f.name}</span>
                    {f.args.length > 0 && (
                      <span className="text-muted-foreground">({f.args.map((a) => `${a.name}: ${a.type}`).join(", ")})</span>
                    )}
                    <span className="text-muted-foreground">: </span>
                    <span className="text-emerald-600 dark:text-emerald-400">{f.returnType}</span>
                  </div>
                  {checked && f.args.length > 0 && (
                    <div className="grid gap-1 sm:grid-cols-2">
                      {f.args.map((a) => (
                        <div key={a.name} className="flex items-center gap-1">
                          <code className="text-[10px] text-muted-foreground">{a.name}:</code>
                          <input
                            type="text"
                            value={selectedArgs[`${f.name}.${a.name}`] ?? ""}
                            onChange={(e) => onArgChange(f.name, a.name, e.target.value)}
                            placeholder={a.defaultValue ?? a.type}
                            className="w-full rounded border border-input bg-background px-1.5 py-0.5 font-mono text-[10px]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {checked && (
                    <SelectionPreview field={f} schema={schema} />
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SelectionPreview({ field, schema }: { field: GqlField; schema: ParsedSchema }) {
  const base = unwrapType(field.returnType);
  const t = schema.types[base];
  if (!t || t.kind !== "type" && t.kind !== "interface") {
    return null;
  }
  return (
    <div className="mt-1 rounded border border-primary/20 bg-primary/5 p-1.5 text-[10px] text-muted-foreground">
      <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
      Returns <code className="text-foreground">{base}</code> with fields: {t.fields.slice(0, 6).map((f) => f.name).join(", ")}
      {t.fields.length > 6 ? ` (+${t.fields.length - 6} more)` : ""}
    </div>
  );
}

function typeIcon(kind: GqlType["kind"]) {
  const cls = "h-3.5 w-3.5 flex-none text-muted-foreground";
  switch (kind) {
    case "type": return <Layers className={cls} />;
    case "input": return <ArrowRight className={cls} />;
    case "enum": return <Hash className={cls} />;
    case "union": return <GitMerge className={cls} />;
    case "interface": return <Layers className={cls} />;
    case "scalar": return <Sparkles className={cls} />;
    case "schema": return <Boxes className={cls} />;
    default: return <Layers className={cls} />;
  }
}

function typeKindColor(kind: GqlType["kind"]): string {
  switch (kind) {
    case "type": return "text-blue-600 dark:text-blue-400 border-blue-400/40";
    case "input": return "text-purple-600 dark:text-purple-400 border-purple-400/40";
    case "enum": return "text-amber-600 dark:text-amber-400 border-amber-400/40";
    case "union": return "text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-400/40";
    case "interface": return "text-emerald-600 dark:text-emerald-400 border-emerald-400/40";
    case "scalar": return "text-muted-foreground";
    default: return "";
  }
}

/* ─────────────────────────── SDL parser ───────────────────────────── */

function parseSdl(input: string): ParsedSchema {
  const types: Record<string, GqlType> = {};
  const errors: string[] = [];
  let queryType: string | undefined;
  let mutationType: string | undefined;
  let subscriptionType: string | undefined;

  // Strip block and line comments.
  const src = input
    .replace(/"""[\s\S]*?"""/g, "")
    .replace(/#[^\n]*/g, "");

  let i = 0;
  const peek = () => src[i];
  const skipWs = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  const readIdent = () => {
    skipWs();
    let s = "";
    while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) {
      s += src[i++];
    }
    return s;
  };
  const readUntil = (ch: string) => {
    let s = "";
    while (i < src.length && src[i] !== ch) {
      s += src[i++];
    }
    return s;
  };

  while (i < src.length) {
    skipWs();
    if (i >= src.length) break;

    // Optional "extend" keyword.
    const extendMatch = src.slice(i).match(/^extend\s+/);
    if (extendMatch) i += extendMatch[0].length;

    const kw = readIdent();
    if (!kw) {
      i++;
      continue;
    }

    if (kw === "schema") {
      skipWs();
      if (peek() === "{") {
        i++;
        const body = readUntil("}");
        i++; // consume }
        for (const line of body.split(/[,\n]/)) {
          const m = line.match(/(\w+)\s*:\s*(\w+)/);
          if (m) {
            if (m[1] === "query") queryType = m[2];
            else if (m[1] === "mutation") mutationType = m[2];
            else if (m[1] === "subscription") subscriptionType = m[2];
          }
        }
        if (!types["__schema__"]) {
          types["__schema__"] = { name: "schema", kind: "schema", fields: [] };
        }
      }
      continue;
    }

    if (kw === "scalar" || kw === "type" || kw === "input" || kw === "interface" || kw === "enum" || kw === "union") {
      const name = readIdent();
      if (!name) {
        errors.push(`Expected a name after "${kw}".`);
        continue;
      }
      skipWs();

      // union X = A | B | C
      if (kw === "union") {
        if (peek() === "=") {
          i++;
          const body = readUntil("\n").trim();
          const members = body.split("|").map((s) => s.trim()).filter(Boolean);
          types[name] = { name, kind: "union", fields: [], unionMembers: members };
        } else {
          types[name] = { name, kind: "union", fields: [] };
        }
        continue;
      }

      if (kw === "scalar") {
        types[name] = { name, kind: "scalar", fields: [] };
        continue;
      }

      // type/input/interface/enum X { ... }
      if (peek() !== "{") {
        // Skip to next brace or keyword.
        while (i < src.length && src[i] !== "{" && !/^[a-zA-Z]/.test(src.slice(i))) i++;
        if (peek() !== "{") {
          errors.push(`Expected '{' after ${kw} ${name}.`);
          continue;
        }
      }
      i++; // consume {
      const body = readUntil("}");
      i++; // consume }

      if (kw === "enum") {
        const values = body.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        types[name] = { name, kind: "enum", fields: [], enumValues: values };
      } else {
        const fields = parseFieldList(body);
        const kind: GqlType["kind"] = kw === "input" ? "input" : kw === "interface" ? "interface" : "type";
        if (types[name] && extendMatch) {
          types[name].fields.push(...fields);
        } else {
          types[name] = { name, kind, fields };
        }
        // Convention: type Query / Mutation / Subscription
        if (!queryType && name === "Query" && kind === "type") queryType = "Query";
        if (!mutationType && name === "Mutation" && kind === "type") mutationType = "Mutation";
        if (!subscriptionType && name === "Subscription" && kind === "type") subscriptionType = "Subscription";
      }
      continue;
    }

    // directive @X on ... — skip the line.
    if (kw === "directive" || kw === "extend" || kw === "fragment") {
      readUntil("\n");
      continue;
    }

    // Unknown token — skip.
    i++;
  }

  return { types, queryType, mutationType, subscriptionType, errors };
}

function parseFieldList(body: string): GqlField[] {
  const fields: GqlField[] = [];
  // Split fields by commas or newlines at top level.
  const lines = body.split(/\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // Field: "name(args): Type" or "name: Type"
    const fieldMatch = line.match(/^(\w+)\s*(?:\(([^)]*)\))?\s*:\s*([^\s,]+)/);
    if (fieldMatch) {
      const [, name, argsStr, returnType] = fieldMatch;
      const args = argsStr ? parseArgs(argsStr) : [];
      fields.push({ name, args, returnType });
    }
  }
  return fields;
}

function parseArgs(argsStr: string): { name: string; type: string; defaultValue?: string }[] {
  const out: { name: string; type: string; defaultValue?: string }[] = [];
  // Split by commas at top level.
  const parts: string[] = [];
  let buf = "";
  let depth = 0;
  for (const ch of argsStr) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);

  for (const part of parts) {
    const m = part.trim().match(/^(\w+)\s*:\s*([^\s=]+)(?:\s*=\s*(.+))?$/);
    if (m) {
      const [, name, type, def] = m;
      out.push({ name, type, defaultValue: def?.trim() });
    }
  }
  return out;
}

/** Strip [ ] and ! from a GraphQL type to get the base type name. */
function unwrapType(t: string): string {
  return t.replace(/[\[\]!]/g, "");
}

/** Build a nested selection set for a return type. Stops at scalars/enums. */
function buildSelection(returnType: string, schema: ParsedSchema, depth: number): string {
  const base = unwrapType(returnType);
  const t = schema.types[base];
  if (!t || t.kind === "scalar" || t.kind === "enum" || t.kind === "union") {
    if (t && t.kind === "union") {
      // Best-effort: include the first member's scalar fields.
      const member = t.unionMembers?.[0];
      if (member && schema.types[member]) {
        return buildSelection(member, schema, depth);
      }
    }
    return "";
  }
  if (depth > 4) return ""; // guard against deep cycles

  const indent = "  ".repeat(depth + 1);
  const lines: string[] = [];
  for (const f of t.fields) {
    const fBase = unwrapType(f.returnType);
    const fType = schema.types[fBase];
    if (fType && (fType.kind === "type" || fType.kind === "interface")) {
      const sub = buildSelection(f.returnType, schema, depth + 1);
      if (sub) {
        lines.push(`${indent}${f.name} {\n${sub}\n${indent}}`);
      } else {
        lines.push(`${indent}${f.name}`);
      }
    } else {
      lines.push(`${indent}${f.name}`);
    }
    if (lines.length >= 8) {
      lines.push(`${indent}# … more fields`);
      break;
    }
  }
  return lines.join("\n");
}

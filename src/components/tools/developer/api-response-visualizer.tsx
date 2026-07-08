"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  AlertTriangle,
  Braces,
  ChevronRight,
  Database,
  LayoutGrid,
  RefreshCw,
  Search,
  Table as TableIcon,
  TreePine,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, formatBytes } from "./_dev-helpers";
import {
  buildJsonTree,
  jsonDepth,
  jsonKeyCount,
  type JsonNode,
} from "./_dev2-helpers";

const SAMPLE = `{
  "users": [
    { "id": 1, "name": "Ada Lovelace", "role": "admin", "active": true, "lastLogin": "2024-03-12T08:30:00Z" },
    { "id": 2, "name": "Alan Turing", "role": "editor", "active": true, "lastLogin": "2024-03-11T19:05:00Z" },
    { "id": 3, "name": "Grace Hopper", "role": "viewer", "active": false, "lastLogin": null }
  ],
  "pagination": { "page": 1, "perPage": 20, "total": 3, "hasNext": false },
  "meta": { "requestId": "req_8f2a1c", "durationMs": 42 }
}`;

type ViewMode = "tree" | "table" | "cards";

export function ApiResponseVisualizer({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState("");
  const [parsed, setParsed] = React.useState<unknown>(null);
  const [hasParsed, setHasParsed] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<ViewMode>("tree");
  const [expandAll, setExpandAll] = React.useState(false);

  const analyze = React.useCallback(() => {
    if (!raw.trim()) {
      setParsed(null);
      setHasParsed(false);
      setParseError("Paste a JSON response to visualize.");
      return;
    }
    if (byteLength(raw) > MAX_INPUT_BYTES) {
      setParsed(null);
      setHasParsed(false);
      setParseError(INPUT_TOO_LARGE_MSG);
      return;
    }
    try {
      const v = JSON.parse(raw);
      setParsed(v);
      setHasParsed(true);
      setParseError(null);
      toast.success("JSON parsed.");
    } catch (e) {
      setParsed(null);
      setHasParsed(false);
      setParseError(e instanceof Error ? e.message : "Invalid JSON.");
      toast.error("Invalid JSON — check the error message.");
    }
  }, [raw]);

  const loadSample = () => {
    setRaw(SAMPLE);
    try {
      const v = JSON.parse(SAMPLE);
      setParsed(v);
      setHasParsed(true);
      setParseError(null);
    } catch {
      /* sample is valid by construction */
    }
  };

  const reset = () => {
    setRaw("");
    setParsed(null);
    setHasParsed(false);
    setParseError(null);
    setQuery("");
  };

  const tree = React.useMemo(
    () => (hasParsed ? buildJsonTree(parsed) : null),
    [parsed, hasParsed]
  );

  const stats = React.useMemo(() => {
    if (!hasParsed) return null;
    return {
      bytes: byteLength(raw),
      depth: jsonDepth(parsed),
      keys: jsonKeyCount(parsed),
      type: Array.isArray(parsed) ? "array" : typeof parsed,
    };
  }, [parsed, raw, hasParsed]);

  // For table view: find the first array of objects.
  const tableData = React.useMemo<{ columns: string[]; rows: Record<string, unknown>[]; path: string } | null>(() => {
    if (!hasParsed) return null;
    const find = (v: unknown, path: string): { columns: string[]; rows: Record<string, unknown>[]; path: string } | null => {
      if (Array.isArray(v)) {
        const objs = v.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x));
        if (objs.length > 0) {
          const colSet = new Set<string>();
          for (const o of objs) for (const k of Object.keys(o)) colSet.add(k);
          return { columns: Array.from(colSet), rows: objs, path };
        }
      }
      if (v !== null && typeof v === "object") {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          const found = find(val, path ? `${path}.${k}` : k);
          if (found) return found;
        }
      }
      return null;
    };
    return find(parsed, "");
  }, [parsed, hasParsed]);

  // For cards view: find ALL arrays of objects anywhere in the tree.
  const cardArrays = React.useMemo<{ path: string; items: Record<string, unknown>[] }[]>(() => {
    if (!hasParsed) return [];
    const out: { path: string; items: Record<string, unknown>[] }[] = [];
    const walk = (v: unknown, path: string) => {
      if (Array.isArray(v)) {
        const objs = v.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x));
        if (objs.length > 0) out.push({ path, items: objs });
        for (let i = 0; i < v.length; i++) walk(v[i], `${path}[${i}]`);
      } else if (v !== null && typeof v === "object") {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          walk(val, path ? `${path}.${k}` : k);
        }
      }
    };
    walk(parsed, "$");
    return out;
  }, [parsed, hasParsed]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (s: string) => q === "" || s.toLowerCase().includes(q);

  const content: ToolContent = {
    intro:
      "Paste any JSON API response and instantly explore it three ways: a collapsible tree, a flattened table of object arrays, and per-item cards. Live search filters every view, and response stats tell you the size, depth and key count at a glance.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="arv-input">JSON response</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="arv-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='{"data":[...],"meta":{...}}'
              className="min-h-[280px] font-mono text-xs"
              spellCheck={false}
              aria-label="JSON input"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={analyze}>
                <Braces className="mr-1.5 h-3.5 w-3.5" /> Parse
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              {stats && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{formatBytes(stats.bytes)}</Badge>
                  <Badge variant="secondary">depth {stats.depth}</Badge>
                  <Badge variant="secondary">{stats.keys} keys</Badge>
                  <Badge variant="outline">{stats.type}</Badge>
                </div>
              )}
            </div>

            {parseError && (
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{parseError}</span>
                </div>
              </div>
            )}

            {hasParsed && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter keys, values or paths…"
                  className="pl-8"
                  aria-label="Filter"
                />
              </div>
            )}
          </div>
        </div>

        {hasParsed && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="tree"><TreePine className="mr-1.5 h-3.5 w-3.5" /> Tree</TabsTrigger>
              <TabsTrigger value="table"><TableIcon className="mr-1.5 h-3.5 w-3.5" /> Table</TabsTrigger>
              <TabsTrigger value="cards"><LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Cards</TabsTrigger>
            </TabsList>

            <TabsContent value="tree" className="mt-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpandAll((x) => !x)}>
                    {expandAll ? "Collapse all" : "Expand all"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Click a node to toggle.</span>
                </div>
                <div className="max-h-[480px] overflow-y-auto font-mono text-xs thin-scroll">
                  {tree && (
                    <TreeNode node={tree} query={q} forceExpand={expandAll ? "expand" : "default"} matches={matchesQuery} />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-3">
              {tableData ? (
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    Showing array at <code className="rounded bg-muted px-1 py-0.5">{tableData.path || "$"}</code>
                    <span>· {tableData.rows.length} rows · {tableData.columns.length} columns</span>
                  </div>
                  <div className="max-h-[480px] overflow-auto thin-scroll">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-background">
                        <tr>
                          <th className="border-b p-2 text-left text-muted-foreground">#</th>
                          {tableData.columns.filter((c) => matchesQuery(c)).map((c) => (
                            <th key={c} className="border-b p-2 text-left font-medium">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="border-b p-2 text-muted-foreground">{i}</td>
                            {tableData.columns.filter((c) => matchesQuery(c)).map((c) => (
                              <td key={c} className="border-b p-2 align-top font-mono">
                                {formatCell(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                  No array of objects found in this JSON. The tree and cards views still work.
                </div>
              )}
            </TabsContent>

            <TabsContent value="cards" className="mt-3">
              {cardArrays.length === 0 ? (
                <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
                  No array items to show as cards.
                </div>
              ) : (
                <div className="space-y-4">
                  {cardArrays.map((arr, ai) => {
                    const items = q === "" ? arr.items : arr.items.filter((it) =>
                      Object.entries(it).some(([k, v]) => matchesQuery(k) || matchesQuery(stringifyCell(v)))
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={ai} className="rounded-xl border bg-muted/20 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <code className="rounded bg-muted px-1 py-0.5">{arr.path}</code>
                          <span>· {items.length} items</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[480px] overflow-y-auto thin-scroll pr-1">
                          {items.map((item, i) => (
                            <div key={i} className="rounded-lg border bg-background p-3 text-xs shadow-sm">
                              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">#{i}</div>
                              <dl className="space-y-1">
                                {Object.entries(item).filter(([k, v]) => matchesQuery(k) || matchesQuery(stringifyCell(v))).map(([k, v]) => (
                                  <div key={k} className="flex flex-col gap-0.5">
                                    <dt className="font-medium text-foreground">{k}</dt>
                                    <dd className="font-mono text-muted-foreground break-words">{formatCell(v)}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {hasParsed && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pretty-printed JSON</span>
              <CopyButton size="sm" value={() => JSON.stringify(parsed, null, 2)} />
            </div>
            <pre className="max-h-64 overflow-auto thin-scroll rounded bg-background p-2 text-xs font-mono">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your JSON", description: "Drop a raw JSON response from any API into the input box, or click Load sample to try one." },
      { title: "Parse", description: "Click Parse. The tool validates the JSON, shows size/depth/key-count stats, and enables the three views." },
      { title: "Switch views", description: "Tree for a collapsible explorer, Table for the first array-of-objects flattened into rows, Cards for array items as grid cards." },
      { title: "Filter", description: "Type in the filter box to highlight matching keys, values or paths across every view." },
    ],
    useCases: [
      "Understand the shape of an unfamiliar API response before writing client code.",
      "Scan a long array of records as a table without writing a one-off script.",
      "Verify pagination metadata and per-item fields side by side.",
      "Find keys quickly with live filtering when the payload is large.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>The table view shows the first array of objects found by depth-first search.</li>
        <li>Duplicate keys in an object (invalid JSON) keep their last value per the JS spec.</li>
      </ul>
    ),
    faq: [
      { q: "Is my JSON sent anywhere?", a: "No. Parsing and rendering happen entirely in your browser with the built-in JSON object." },
      { q: "What is the difference between this and the JSON Formatter?", a: "The Formatter beautifies text. This tool visualises the structure with tree, table and card views and live filtering." },
      { q: "Why is the table view empty?", a: "The table looks for the first array whose items are all objects. If your JSON has no such array (e.g. a flat object), use the tree or cards view instead." },
      { q: "Does the filter support JSONPath?", a: "Not yet — it is a plain substring match against keys, stringified values and JSON paths. Use the JSONPath Tester tool for path queries." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Tree rendering ─────────────────────────── */

function TreeNode({
  node,
  query,
  forceExpand,
  matches,
  level = 0,
}: {
  node: JsonNode;
  query: string;
  forceExpand: "expand" | "default";
  matches: (s: string) => boolean;
  level?: number;
}) {
  const [open, setOpen] = React.useState(level < 2);
  React.useEffect(() => {
    if (forceExpand === "expand") setOpen(true);
  }, [forceExpand]);

  const hasChildren = node.children && node.children.length > 0;
  const keyMatch = matches(node.key);
  const valStr = node.type === "object" || node.type === "array" ? "" : JSON.stringify(node.value);
  const valMatch = matches(valStr);
  const pathMatch = matches(node.path);
  const dim = query !== "" && !keyMatch && !valMatch && !pathMatch;

  return (
    <div className={dim ? "opacity-40" : ""}>
      <div
        className="flex items-start gap-1 py-0.5 hover:bg-muted/40 rounded-sm cursor-default"
        style={{ paddingLeft: level * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-0.5 flex-none text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="inline-block w-3 flex-none" />
        )}
        <span className={`font-medium ${highlightClass(keyMatch, query)}`}>{node.key}:</span>
        {node.type === "object" && (
          <span className="text-muted-foreground">{"{"}{node.count ?? 0}{"}"}</span>
        )}
        {node.type === "array" && (
          <span className="text-muted-foreground">[{node.count ?? 0}]</span>
        )}
        {node.type !== "object" && node.type !== "array" && (
          <span className={`ml-1 ${typeColor(node.type)} ${highlightClass(valMatch, query)}`}>
            {valStr}
          </span>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((c) => (
            <TreeNode
              key={c.key}
              node={c}
              query={query}
              forceExpand={forceExpand}
              matches={matches}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function typeColor(type: JsonNode["type"]): string {
  switch (type) {
    case "string": return "text-emerald-600 dark:text-emerald-400";
    case "number": return "text-amber-600 dark:text-amber-400";
    case "boolean": return "text-fuchsia-600 dark:text-fuchsia-400";
    case "null": return "text-muted-foreground italic";
    default: return "text-foreground";
  }
}

function highlightClass(match: boolean, query: string): string {
  if (!query || !match) return "";
  return "bg-yellow-100 dark:bg-yellow-900/40 rounded px-0.5";
}

function formatCell(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function stringifyCell(v: unknown): string {
  return formatCell(v);
}

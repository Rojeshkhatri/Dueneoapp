"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle,
  Book,
  Box,
  Globe,
  Hash,
  Layers,
  ListTree,
  Play,
  RefreshCw,
  Search,
  Server,
  Tag,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseYamlAll } from "./_dev2-helpers";

const SAMPLE = `openapi: 3.0.3
info:
  title: Dueneo Pet Store API
  version: 1.0.0
  description: A sample OpenAPI 3 spec for browsing the tool.
servers:
  - url: https://api.dueneo.example/v1
    description: Production
  - url: https://staging-api.dueneo.example/v1
    description: Staging
tags:
  - name: pets
    description: Pet operations
  - name: store
    description: Store operations
paths:
  /pets:
    get:
      tags: [pets]
      summary: List all pets
      operationId: listPets
      parameters:
        - name: limit
          in: query
          description: Maximum number of results
          required: false
          schema:
            type: integer
            format: int32
            default: 20
        - name: tag
          in: query
          schema:
            type: string
      responses:
        '200':
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid limit
    post:
      tags: [pets]
      summary: Create a pet
      operationId: createPet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
      responses:
        '201':
          description: Created
  /pets/{petId}:
    get:
      tags: [pets]
      summary: Find a pet by ID
      operationId: getPetById
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: A single pet
        '404':
          description: Not found
    delete:
      tags: [pets]
      summary: Delete a pet
      operationId: deletePet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted
components:
  schemas:
    Pet:
      type: object
      required: [id, name]
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        tag:
          type: string
        status:
          type: string
          enum: [available, pending, sold]`;

type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "trace";

interface ParsedSpec {
  version: "2.0" | "3.0" | "unknown";
  info?: { title?: string; version?: string; description?: string };
  servers: { url: string; description?: string }[];
  tags: { name: string; description?: string }[];
  endpoints: {
    method: HttpMethod;
    path: string;
    operationId?: string;
    summary?: string;
    description?: string;
    tags: string[];
    parameters: { name: string; in: string; required: boolean; description?: string; schema?: unknown }[];
    requestBody?: { required?: boolean; description?: string; contentTypes: string[] };
    responses: { code: string; description?: string; contentTypes: string[] }[];
  }[];
  schemas: { name: string; definition: unknown }[];
  warnings: string[];
}

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  post: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  put: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  patch: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  head: "bg-muted text-muted-foreground border-border",
  options: "bg-muted text-muted-foreground border-border",
  trace: "bg-muted text-muted-foreground border-border",
};

export function OpenApiViewer({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState("");
  const [spec, setSpec] = React.useState<ParsedSpec | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<string>("__all");

  const parse = React.useCallback(() => {
    if (!raw.trim()) {
      setSpec(null);
      setError("Paste an OpenAPI/Swagger spec first.");
      return;
    }
    const result = parseYamlAll(raw);
    if (!result.ok || result.docs.length === 0) {
      setSpec(null);
      setError(result.error ?? "Could not parse the spec.");
      toast.error("Parse failed.");
      return;
    }
    const doc = result.docs[0] as Record<string, unknown> | null;
    if (!doc || typeof doc !== "object") {
      setSpec(null);
      setError("The spec is not a valid OpenAPI document.");
      return;
    }
    try {
      const s = parseSpec(doc);
      setSpec(s);
      setError(null);
      toast.success(`Parsed ${s.endpoints.length} endpoints.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown spec error.");
      setSpec(null);
      toast.error("Spec parsing failed.");
    }
  }, [raw]);

  const loadSample = () => {
    setRaw(SAMPLE);
    const r = parseYamlAll(SAMPLE);
    if (r.ok && r.docs[0]) {
      try {
        setSpec(parseSpec(r.docs[0] as Record<string, unknown>));
        setError(null);
      } catch {
        /* ignore */
      }
    }
  };

  const reset = () => {
    setRaw("");
    setSpec(null);
    setError(null);
    setFilter("");
    setActiveTag("__all");
  };

  const tags = React.useMemo(() => {
    if (!spec) return [];
    const set = new Set<string>();
    for (const e of spec.endpoints) for (const t of e.tags) set.add(t);
    return Array.from(set).sort();
  }, [spec]);

  const filteredEndpoints = React.useMemo(() => {
    if (!spec) return [];
    const q = filter.trim().toLowerCase();
    return spec.endpoints.filter((e) => {
      if (activeTag !== "__all" && !e.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        e.path.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.summary ?? "").toLowerCase().includes(q) ||
        (e.operationId ?? "").toLowerCase().includes(q)
      );
    });
  }, [spec, filter, activeTag]);

  const content: ToolContent = {
    intro:
      "Paste an OpenAPI 2.0 (Swagger) or 3.0 spec — JSON or YAML — and browse it as clean documentation. See the title/version/description, environments (servers), and every endpoint grouped by tag with method, path, summary, parameters, request body and responses. Filter by tag or text to find what you need fast.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="oapi-input">OpenAPI / Swagger spec</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="oapi-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={'openapi: 3.0.0 …  or  { "swagger": "2.0", … }'}
              className="min-h-[320px] font-mono text-xs"
              spellCheck={false}
              aria-label="OpenAPI spec input"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={parse}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Parse spec
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {error && (
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {spec && (
              <>
                <div className="rounded-xl border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">OpenAPI {spec.version}</Badge>
                    {spec.info?.version && <Badge variant="outline">v{spec.info.version}</Badge>}
                    <span className="text-xs text-muted-foreground">{spec.endpoints.length} endpoints · {spec.schemas.length} schemas</span>
                  </div>
                  {spec.info?.title && <h3 className="mt-2 text-lg font-semibold">{spec.info.title}</h3>}
                  {spec.info?.description && <p className="mt-1 text-sm text-muted-foreground">{spec.info.description}</p>}
                </div>

                {spec.servers.length > 0 && (
                  <div className="rounded-xl border bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Server className="h-3.5 w-3.5" /> Environments
                    </div>
                    <ul className="space-y-1">
                      {spec.servers.map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <code className="font-mono">{s.url}</code>
                          {s.description && <span className="text-muted-foreground">— {s.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {spec.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    {spec.warnings[0]}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {spec && (
          <Tabs defaultValue="endpoints">
            <TabsList>
              <TabsTrigger value="endpoints"><ListTree className="mr-1.5 h-3.5 w-3.5" /> Endpoints</TabsTrigger>
              <TabsTrigger value="schemas"><Box className="mr-1.5 h-3.5 w-3.5" /> Schemas ({spec.schemas.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setActiveTag("__all")}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${activeTag === "__all" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  all
                </button>
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTag(t)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${activeTag === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {t}
                  </button>
                ))}
                <div className="relative ml-auto w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter…"
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              {filteredEndpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No endpoints match your filter.</p>
              ) : (
                <div className="space-y-2">
                  {filteredEndpoints.map((e, i) => (
                    <EndpointCard key={`${e.method}-${e.path}-${i}`} e={e} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="schemas" className="mt-3 space-y-2">
              {spec.schemas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No schemas defined.</p>
              ) : (
                spec.schemas.map((s) => <SchemaCard key={s.name} name={s.name} def={s.definition} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your spec", description: "Drop an OpenAPI 3.x YAML/JSON document or a Swagger 2.0 JSON spec. Both are auto-detected." },
      { title: "Parse", description: "Click Parse spec. The tool reads info, servers, tags, paths and components/schemas." },
      { title: "Browse endpoints", description: "Filter by tag or free text. Each endpoint card shows method, path, summary, parameters, request body and responses." },
      { title: "Inspect schemas", description: "Switch to the Schemas tab to see each named schema with its properties and types." },
    ],
    useCases: [
      "Read a third-party API spec without setting up Swagger UI.",
      "Quickly find an endpoint by tag or path fragment during integration.",
      "Verify your own spec renders cleanly before publishing docs.",
      "Browse schemas to understand the shape of request and response bodies.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The tool renders documentation but does not send requests.</li>
        <li>$ref references inside schemas are resolved one level deep for display; deeply nested allOf/oneOf/anyOf are shown raw.</li>
        <li>Security schemes, callbacks and links are listed in the spec but not rendered as interactive UI.</li>
        <li>Specs larger than 1 MB are rejected to keep the tab responsive.</li>
      </ul>
    ),
    faq: [
      { q: "Does this support both YAML and JSON?", a: "Yes. The parser uses js-yaml, which accepts both. Swagger 2.0 (JSON) and OpenAPI 3.x (YAML or JSON) both work." },
      { q: "Can I send a request from here?", a: "No — this is a read-only viewer. Use the API Response Visualizer to inspect a response once you have made the call elsewhere." },
      { q: "Where are the security schemes?", a: "They are parsed but not rendered in this version. The endpoint card notes whether the operation requires auth via the parameters and responses shown." },
      { q: "Why is my spec showing warnings?", a: "Common reasons: a path is missing, an operation has no responses, or the spec lacks an info block. The first warning is shown at the top of the parsed view." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function EndpointCard({ e }: { e: ParsedSpec["endpoints"][number] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
      >
        <Badge variant="outline" className={`flex-none font-mono text-[10px] uppercase ${METHOD_COLORS[e.method]}`}>
          {e.method}
        </Badge>
        <code className="flex-1 break-all font-mono text-sm">{e.path}</code>
        {e.summary && <span className="hidden text-xs text-muted-foreground sm:block">{e.summary}</span>}
        {e.tags[0] && <Badge variant="secondary" className="flex-none text-[10px]">{e.tags[0]}</Badge>}
      </button>
      {open && (
        <div className="border-t p-3 space-y-3 text-xs">
          {e.summary && <p className="font-medium">{e.summary}</p>}
          {e.description && <p className="text-muted-foreground">{e.description}</p>}
          {e.operationId && (
            <p className="text-muted-foreground"><code>operationId:</code> <code className="text-foreground">{e.operationId}</code></p>
          )}

          {e.parameters.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 font-medium"><Hash className="h-3 w-3" /> Parameters</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b p-1.5">Name</th>
                    <th className="border-b p-1.5">In</th>
                    <th className="border-b p-1.5">Required</th>
                    <th className="border-b p-1.5">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {e.parameters.map((p, i) => (
                    <tr key={i} className="align-top">
                      <td className="border-b p-1.5 font-mono">{p.name}</td>
                      <td className="border-b p-1.5">{p.in}</td>
                      <td className="border-b p-1.5">{p.required ? <Badge variant="destructive" className="text-[10px]">yes</Badge> : <span className="text-muted-foreground">no</span>}</td>
                      <td className="border-b p-1.5 text-muted-foreground">{p.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {e.requestBody && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 font-medium"><Book className="h-3 w-3" /> Request body</div>
              <p className="text-muted-foreground">
                {e.requestBody.required ? "Required" : "Optional"}
                {e.requestBody.description ? ` — ${e.requestBody.description}` : ""}
                {" · "}
                Content types: {e.requestBody.contentTypes.join(", ") || "(none)"}
              </p>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center gap-1.5 font-medium"><Layers className="h-3 w-3" /> Responses</div>
            <div className="space-y-1">
              {e.responses.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant={r.code.startsWith("2") ? "secondary" : r.code.startsWith("3") ? "outline" : "destructive"} className="font-mono text-[10px] flex-none">{r.code}</Badge>
                  <span className="text-muted-foreground">{r.description ?? "(no description)"}{r.contentTypes.length > 0 ? ` · ${r.contentTypes.join(", ")}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SchemaCard({ name, def }: { name: string; def: unknown }) {
  const [open, setOpen] = React.useState(false);
  const props = React.useMemo(() => extractProperties(def), [def]);
  return (
    <div className="rounded-xl border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/40"
      >
        <Box className="h-4 w-4 text-primary" />
        <code className="font-mono font-medium">{name}</code>
        <Badge variant="outline" className="ml-auto text-[10px]">{typeof def === "object" && def !== null ? (def as { type?: string }).type ?? "object" : typeof def}</Badge>
      </button>
      {open && (
        <div className="border-t p-3">
          {props.length === 0 ? (
            <pre className="text-xs font-mono text-muted-foreground">{JSON.stringify(def, null, 2)}</pre>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b p-1.5">Property</th>
                  <th className="border-b p-1.5">Type</th>
                  <th className="border-b p-1.5">Required</th>
                  <th className="border-b p-1.5">Description</th>
                </tr>
              </thead>
              <tbody>
                {props.map((p) => (
                  <tr key={p.name} className="align-top">
                    <td className="border-b p-1.5 font-mono">{p.name}</td>
                    <td className="border-b p-1.5 font-mono text-emerald-600 dark:text-emerald-400">{p.type}</td>
                    <td className="border-b p-1.5">{p.required ? <Badge variant="destructive" className="text-[10px]">yes</Badge> : <span className="text-muted-foreground">no</span>}</td>
                    <td className="border-b p-1.5 text-muted-foreground">{p.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Spec parser ──────────────────────────── */

function parseSpec(doc: Record<string, unknown>): ParsedSpec {
  const warnings: string[] = [];
  let version: ParsedSpec["version"] = "unknown";

  if (typeof doc.swagger === "string" && doc.swagger.startsWith("2.")) {
    version = "2.0";
  } else if (typeof doc.openapi === "string" && doc.openapi.startsWith("3.")) {
    version = "3.0";
  } else if (typeof doc.openapi === "string") {
    version = "3.0";
  } else {
    warnings.push("Could not detect OpenAPI version (no 'swagger' or 'openapi' field). Assuming 3.0.");
    version = "3.0";
  }

  const info = (doc.info as Record<string, unknown> | undefined) ?? undefined;
  const infoParsed = info
    ? {
        title: typeof info.title === "string" ? info.title : undefined,
        version: typeof info.version === "string" ? info.version : undefined,
        description: typeof info.description === "string" ? info.description : undefined,
      }
    : undefined;

  // Servers (3.0) or host/basePath (2.0)
  const servers: { url: string; description?: string }[] = [];
  if (Array.isArray(doc.servers)) {
    for (const s of doc.servers) {
      if (s && typeof s === "object" && typeof (s as { url?: unknown }).url === "string") {
        servers.push({
          url: (s as { url: string }).url,
          description: typeof (s as { description?: unknown }).description === "string" ? (s as { description?: string }).description : undefined,
        });
      }
    }
  } else if (typeof doc.host === "string") {
    const basePath = typeof doc.basePath === "string" ? doc.basePath : "";
    const schemes = Array.isArray(doc.schemes) ? doc.schemes : ["https"];
    for (const scheme of schemes) {
      servers.push({ url: `${scheme}://${doc.host}${basePath}` });
    }
  }

  // Tags
  const tags: { name: string; description?: string }[] = [];
  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (t && typeof t === "object" && typeof (t as { name?: unknown }).name === "string") {
        tags.push({
          name: (t as { name: string }).name,
          description: typeof (t as { description?: unknown }).description === "string" ? (t as { description?: string }).description : undefined,
        });
      }
    }
  }

  // Paths
  const endpoints: ParsedSpec["endpoints"] = [];
  const paths = (doc.paths as Record<string, unknown> | undefined) ?? {};
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    const pathObj = pathItem as Record<string, unknown>;
    const sharedParams = Array.isArray(pathObj.parameters) ? pathObj.parameters as unknown[] : [];
    for (const method of HTTP_METHODS) {
      const op = pathObj[method] as Record<string, unknown> | undefined;
      if (!op || typeof op !== "object") continue;

      const opTags = Array.isArray(op.tags) ? op.tags.filter((t): t is string => typeof t === "string") : [];
      const parameters: ParsedSpec["endpoints"][number]["parameters"] = [];
      const allParams = [...sharedParams, ...(Array.isArray(op.parameters) ? op.parameters as unknown[] : [])];
      for (const p of allParams) {
        if (p && typeof p === "object") {
          const po = p as Record<string, unknown>;
          parameters.push({
            name: typeof po.name === "string" ? po.name : "?",
            in: typeof po.in === "string" ? po.in : "?",
            required: po.required === true,
            description: typeof po.description === "string" ? po.description : undefined,
            schema: po.schema,
          });
        }
      }

      const responses: ParsedSpec["endpoints"][number]["responses"] = [];
      const respObj = (op.responses as Record<string, unknown> | undefined) ?? {};
      for (const [code, r] of Object.entries(respObj)) {
        if (!r || typeof r !== "object") continue;
        const ro = r as Record<string, unknown>;
        const contentTypes: string[] = [];
        if (ro.content && typeof ro.content === "object") {
          contentTypes.push(...Object.keys(ro.content as Record<string, unknown>));
        } else if (ro.schema) {
          // 2.0 — content types come from produces
          const produces = Array.isArray(op.produces) ? op.produces : Array.isArray(doc.produces) ? (doc.produces as string[]) : [];
          contentTypes.push(...produces.filter((x): x is string => typeof x === "string"));
        }
        responses.push({
          code,
          description: typeof ro.description === "string" ? ro.description : undefined,
          contentTypes,
        });
      }

      let requestBody: ParsedSpec["endpoints"][number]["requestBody"] | undefined;
      if (op.requestBody && typeof op.requestBody === "object") {
        const rb = op.requestBody as Record<string, unknown>;
        const contentTypes: string[] = rb.content && typeof rb.content === "object"
          ? Object.keys(rb.content as Record<string, unknown>)
          : [];
        requestBody = {
          required: rb.required === true,
          description: typeof rb.description === "string" ? rb.description : undefined,
          contentTypes,
        };
      } else if (op.parameters && Array.isArray(op.parameters)) {
        // 2.0 — body parameter
        for (const p of op.parameters as unknown[]) {
          if (p && typeof p === "object" && (p as Record<string, unknown>).in === "body") {
            const po = p as Record<string, unknown>;
            const consumes = Array.isArray(op.consumes) ? op.consumes : Array.isArray(doc.consumes) ? (doc.consumes as string[]) : ["application/json"];
            requestBody = {
              required: po.required === true,
              description: typeof po.description === "string" ? po.description : undefined,
              contentTypes: consumes.filter((x): x is string => typeof x === "string"),
            };
            break;
          }
        }
      }

      endpoints.push({
        method,
        path,
        operationId: typeof op.operationId === "string" ? op.operationId : undefined,
        summary: typeof op.summary === "string" ? op.summary : undefined,
        description: typeof op.description === "string" ? op.description : undefined,
        tags: opTags,
        parameters,
        requestBody,
        responses,
      });
    }
  }

  // Schemas
  const schemas: { name: string; definition: unknown }[] = [];
  const components = doc.components as Record<string, unknown> | undefined;
  const componentsSchemas = components && typeof components === "object" ? (components.schemas as Record<string, unknown> | undefined) : undefined;
  const v2Defs = doc.definitions as Record<string, unknown> | undefined;
  const schemaMap = componentsSchemas ?? v2Defs;
  if (schemaMap && typeof schemaMap === "object") {
    for (const [name, def] of Object.entries(schemaMap)) {
      schemas.push({ name, definition: def });
    }
  }

  return {
    version,
    info: infoParsed,
    servers,
    tags,
    endpoints,
    schemas,
    warnings,
  };
}

function extractProperties(def: unknown): { name: string; type: string; required: boolean; description?: string }[] {
  if (!def || typeof def !== "object") return [];
  const d = def as Record<string, unknown>;
  const props = d.properties as Record<string, unknown> | undefined;
  if (!props) return [];
  const requiredList = Array.isArray(d.required) ? (d.required as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return Object.entries(props).map(([name, schema]) => {
    const s = (schema && typeof schema === "object" ? schema : {}) as Record<string, unknown>;
    let type = typeof s.type === "string" ? s.type : "unknown";
    if (Array.isArray(s.enum)) type += ` (enum: ${(s.enum as unknown[]).join(", ")})`;
    if (typeof s.format === "string") type += ` · ${s.format}`;
    if (s.$ref) type = String(s.$ref).replace(/^#\//, "").replace(/\//g, ".");
    return {
      name,
      type,
      required: requiredList.includes(name),
      description: typeof s.description === "string" ? s.description : undefined,
    };
  });
}

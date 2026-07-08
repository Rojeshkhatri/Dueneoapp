"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Play,
  RefreshCw,
  Ship,
  XCircle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseYamlAll, findLine } from "./_dev2-helpers";

const SAMPLE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "250m"
            limits:
              memory: "128Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: web-svc
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  rules:
    - host: app.dueneo.example
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-svc
                port:
                  number: 80`;

type Severity = "error" | "warn" | "info";

interface ValidationIssue {
  severity: Severity;
  field?: string;
  message: string;
  line?: number;
}

interface DocResult {
  index: number;
  kind?: string;
  apiVersion?: string;
  name?: string;
  namespace?: string;
  issues: ValidationIssue[];
  status: "valid" | "warn" | "error" | "empty";
  raw: unknown;
}

export function KubernetesYamlValidator({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState("");
  const [results, setResults] = React.useState<DocResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validate = React.useCallback(() => {
    if (!raw.trim()) {
      setResults(null);
      setError("Paste a Kubernetes manifest first.");
      return;
    }
    const parsed = parseYamlAll(raw);
    if (!parsed.ok) {
      setResults(null);
      setError(parsed.error ?? "YAML parse error.");
      toast.error("YAML parse failed.");
      return;
    }
    const docs: DocResult[] = [];
    parsed.docs.forEach((doc, i) => {
      if (doc === null || doc === undefined) {
        docs.push({ index: i, issues: [], status: "empty", raw: doc });
        return;
      }
      if (typeof doc !== "object" || Array.isArray(doc)) {
        docs.push({
          index: i,
          issues: [{ severity: "error", message: "Document is not a YAML mapping — expected a Kubernetes manifest object." }],
          status: "error",
          raw: doc,
        });
        return;
      }
      const d = doc as Record<string, unknown>;
      const issues = validateDoc(d, raw, i);
      const hasError = issues.some((x) => x.severity === "error");
      const hasWarn = issues.some((x) => x.severity === "warn");
      docs.push({
        index: i,
        kind: typeof d.kind === "string" ? d.kind : undefined,
        apiVersion: typeof d.apiVersion === "string" ? d.apiVersion : undefined,
        name: (d.metadata as { name?: unknown } | undefined)?.name as string | undefined,
        namespace: (d.metadata as { namespace?: unknown } | undefined)?.namespace as string | undefined,
        issues,
        status: hasError ? "error" : hasWarn ? "warn" : "valid",
        raw: doc,
      });
    });
    setResults(docs);
    setError(null);
    const errors = docs.filter((d) => d.status === "error").length;
    const warns = docs.filter((d) => d.status === "warn").length;
    toast.success(`Validated ${docs.length} doc(s) · ${errors} error(s) · ${warns} warning(s).`);
  }, [raw]);

  const loadSample = () => {
    setRaw(SAMPLE);
    const r = parseYamlAll(SAMPLE);
    if (r.ok) {
      const docs: DocResult[] = r.docs.map((doc, i) => {
        if (doc && typeof doc === "object" && !Array.isArray(doc)) {
          const d = doc as Record<string, unknown>;
          const issues = validateDoc(d, SAMPLE, i);
          const hasError = issues.some((x) => x.severity === "error");
          const hasWarn = issues.some((x) => x.severity === "warn");
          return {
            index: i,
            kind: typeof d.kind === "string" ? d.kind : undefined,
            apiVersion: typeof d.apiVersion === "string" ? d.apiVersion : undefined,
            name: (d.metadata as { name?: unknown } | undefined)?.name as string | undefined,
            namespace: (d.metadata as { namespace?: unknown } | undefined)?.namespace as string | undefined,
            issues,
            status: hasError ? "error" : hasWarn ? "warn" : "valid",
            raw: doc,
          };
        }
        return { index: i, issues: [], status: "empty" as const, raw: doc };
      });
      setResults(docs);
      setError(null);
    }
  };

  const reset = () => {
    setRaw("");
    setResults(null);
    setError(null);
  };

  const summary = React.useMemo(() => {
    if (!results) return null;
    return {
      total: results.length,
      valid: results.filter((r) => r.status === "valid").length,
      warn: results.filter((r) => r.status === "warn").length,
      error: results.filter((r) => r.status === "error").length,
    };
  }, [results]);

  const content: ToolContent = {
    intro:
      "Paste one or more Kubernetes manifests (multi-document YAML supported) and get an instant structural validation. Required fields (apiVersion, kind, metadata.name, spec) are checked per kind, common mistakes (missing replicas, no resource limits, deprecated apiVersion, missing selector, plaintext Secret data) are flagged, and every issue is tagged with a line number from the source so you can jump straight to the problem.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="k8s-input">Kubernetes YAML</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="k8s-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="apiVersion: apps/v1…"
              className="min-h-[320px] font-mono text-xs"
              spellCheck={false}
              aria-label="Kubernetes YAML input"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={validate}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Validate
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

            {summary && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <SummaryStat icon={Ship} label="Docs" value={summary.total} color="text-foreground" />
                  <SummaryStat icon={CheckCircle2} label="Valid" value={summary.valid} color="text-emerald-600 dark:text-emerald-400" />
                  <SummaryStat icon={AlertTriangle} label="Warnings" value={summary.warn} color="text-amber-600 dark:text-amber-400" />
                  <SummaryStat icon={XCircle} label="Errors" value={summary.error} color="text-destructive" />
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Coverage
                  </div>
                  <p>Supported kinds: Deployment, Service, Pod, ConfigMap, Secret, Ingress. Other kinds get a generic required-fields check.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {results && results.length > 0 && (
          <div className="space-y-3">
            {results.map((r) => (
              <DocResultCard key={r.index} r={r} />
            ))}
          </div>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your manifest", description: "Drop one or more YAML documents (separated by ---) into the input." },
      { title: "Validate", description: "Click Validate. Each document is parsed and checked against kind-specific rules." },
      { title: "Read the issues", description: "Every issue has a severity (✗ error, ⚠ warning, ℹ info), a field path and a line number from the source." },
      { title: "Fix and re-validate", description: "Edit the YAML and click Validate again. The summary shows how many docs are valid, warned or errored." },
    ],
    useCases: [
      "Catch missing required fields before kubectl apply rejects your manifest.",
      "Review a PR with multiple manifests at once and see all issues in one view.",
      "Learn the required structure of common Kubernetes kinds (Deployment, Service, Ingress, …).",
      "Spot best-practice issues like missing resource limits or plaintext Secret data.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a <strong>structural</strong> validator, not a full Kubernetes schema validator. It does not run <code>kubeconform</code> or <code>kubectl apply --dry-run=server</code>.</li>
        <li>CRDs are not loaded — custom resources get only the generic required-fields check.</li>
        <li>Line numbers are best-effort: they point to the first occurrence of the relevant key in the source, which for multi-document YAML is approximate.</li>
        <li>The tool does not connect to a cluster, so it cannot check namespace existence, RBAC or admission webhooks.</li>
      </ul>
    ),
    faq: [
      { q: "Does this validate against the real Kubernetes API?", a: "No. It checks structure and common mistakes locally. For server-side validation run kubectl apply --dry-run=server against your cluster." },
      { q: "Can I validate a Helm chart?", a: "Render the chart with helm template first, then paste the resulting YAML. The tool does not evaluate Helm templates itself." },
      { q: "Why does my Secret show a warning about base64?", a: "Secret data values should be base64-encoded. The tool warns when a value looks like plaintext so you don't accidentally store credentials in the clear." },
      { q: "Does it support multiple documents in one file?", a: "Yes — separate documents with --- as you would with kubectl. Each document is validated independently and shown in its own card." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function SummaryStat({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border bg-background p-3 text-center">
      <Icon className={`mx-auto h-4 w-4 ${color}`} />
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function DocResultCard({ r }: { r: DocResult }) {
  const [open, setOpen] = React.useState(r.status !== "valid");
  const statusInfo = {
    valid: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", label: "Valid" },
    warn: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", label: "Warnings" },
    error: { icon: XCircle, color: "text-destructive", label: "Errors" },
    empty: { icon: FileWarning, color: "text-muted-foreground", label: "Empty" },
  }[r.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`rounded-xl border bg-background ${r.status === "error" ? "border-destructive/40" : r.status === "warn" ? "border-amber-400/40" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/40"
      >
        <StatusIcon className={`h-4 w-4 flex-none ${statusInfo.color}`} />
        <span className="text-xs text-muted-foreground">#{r.index + 1}</span>
        {r.kind ? (
          <Badge variant="outline" className="font-mono text-[10px]">{r.kind}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">(no kind)</span>
        )}
        {r.apiVersion && <Badge variant="secondary" className="font-mono text-[10px]">{r.apiVersion}</Badge>}
        {r.name && <code className="font-mono text-xs">{r.name}</code>}
        {r.namespace && <span className="text-xs text-muted-foreground">ns: {r.namespace}</span>}
        <span className={`ml-auto text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
      </button>
      {open && r.status === "empty" ? (
        <div className="border-t p-3 text-xs text-muted-foreground">Empty document (null).</div>
      ) : open && (
        <div className="border-t p-3">
          {r.issues.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> No issues — all required fields present and best-practices satisfied.
            </div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {r.issues.map((iss, i) => (
                <li key={i} className="flex items-start gap-2">
                  {iss.severity === "error" ? (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-destructive" />
                  ) : iss.severity === "warn" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
                  ) : (
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <span>{iss.message}</span>
                    {iss.field && <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">{iss.field}</code>}
                  </div>
                  {iss.line && (
                    <Badge variant="outline" className="flex-none font-mono text-[10px]">L{iss.line}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          {r.raw !== null && r.raw !== undefined && typeof r.raw === "object" && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">Show parsed object</summary>
              <pre className="mt-1 max-h-48 overflow-auto thin-scroll rounded bg-muted/40 p-2 text-[10px] font-mono">
                {JSON.stringify(r.raw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Validator ────────────────────────────── */

const KIND_RULES: Record<string, (doc: Record<string, unknown>, issues: ValidationIssue[], src: string) => void> = {
  Deployment: validateDeployment,
  Service: validateService,
  Pod: validatePod,
  ConfigMap: validateConfigMap,
  Secret: validateSecret,
  Ingress: validateIngress,
};

const DEPRECATED_API_VERSIONS = [
  "extensions/v1beta1",
  "apps/v1beta1",
  "apps/v1beta2",
  "networking.k8s.io/v1beta1",
];

function validateDoc(doc: Record<string, unknown>, src: string, docIndex: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  void docIndex;

  // Find this document's slice of the source (between --- separators).
  const docSrc = sliceDocSource(src, docIndex);

  // Required top-level fields
  if (!("apiVersion" in doc)) {
    issues.push({ severity: "error", field: "apiVersion", message: "Missing required field apiVersion.", line: findLine(docSrc, "kind:") ?? 1 });
  }
  if (!("kind" in doc)) {
    issues.push({ severity: "error", field: "kind", message: "Missing required field kind.", line: 1 });
  }
  if (!("metadata" in doc)) {
    issues.push({ severity: "error", field: "metadata", message: "Missing required field metadata." });
  } else {
    const meta = doc.metadata as Record<string, unknown> | undefined;
    if (!meta || typeof meta !== "object" || !("name" in meta)) {
      issues.push({ severity: "error", field: "metadata.name", message: "metadata.name is required.", line: findLine(docSrc, "metadata:") });
    } else if (typeof meta.name !== "string" || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(meta.name)) {
      issues.push({
        severity: "warn",
        field: "metadata.name",
        message: `metadata.name "${meta.name}" does not match the DNS-1123 label convention (lowercase alphanumeric and '-').`,
        line: findLine(docSrc, "name:"),
      });
    }
  }

  // Deprecated apiVersion
  if (typeof doc.apiVersion === "string" && DEPRECATED_API_VERSIONS.includes(doc.apiVersion)) {
    issues.push({
      severity: "warn",
      field: "apiVersion",
      message: `apiVersion "${doc.apiVersion}" is deprecated. Migrate to a /v1 equivalent.`,
      line: findLine(docSrc, "apiVersion:"),
    });
  }

  // Kind-specific rules
  const kind = typeof doc.kind === "string" ? doc.kind : undefined;
  if (kind && KIND_RULES[kind]) {
    KIND_RULES[kind](doc, issues, docSrc);
  } else if (kind) {
    // Generic spec check
    if (!("spec" in doc) && needsSpec(kind)) {
      issues.push({ severity: "warn", field: "spec", message: `Kind "${kind}" usually has a spec field.`, line: findLine(docSrc, "spec:") });
    }
  }

  return issues;
}

function sliceDocSource(src: string, docIndex: number): string {
  // Split on lines that are exactly "---".
  const lines = src.split(/\r?\n/);
  const docStarts: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i])) docStarts.push(i + 1);
  }
  const start = docStarts[docIndex] ?? 0;
  const end = docStarts[docIndex + 1] ?? lines.length;
  return lines.slice(start, end).join("\n");
}

function needsSpec(kind: string): boolean {
  return !["ConfigMap", "Secret", "Namespace", "RoleBinding", "ClusterRoleBinding", "ServiceAccount"].includes(kind);
}

function validateDeployment(doc: Record<string, unknown>, issues: ValidationIssue[], src: string) {
  const spec = doc.spec as Record<string, unknown> | undefined;
  if (!spec) {
    issues.push({ severity: "error", field: "spec", message: "Deployment requires a spec.", line: findLine(src, "spec:") });
    return;
  }
  if (typeof spec.replicas !== "number") {
    issues.push({ severity: "info", field: "spec.replicas", message: "spec.replicas not set — defaults to 1.", line: findLine(src, "replicas:") });
  }
  if (!spec.selector) {
    issues.push({ severity: "error", field: "spec.selector", message: "spec.selector is required for a Deployment.", line: findLine(src, "selector:") });
  }
  if (!spec.template) {
    issues.push({ severity: "error", field: "spec.template", message: "spec.template is required for a Deployment.", line: findLine(src, "template:") });
  } else {
    const tpl = spec.template as Record<string, unknown>;
    const tplSpec = tpl.spec as Record<string, unknown> | undefined;
    if (!tplSpec || !Array.isArray(tplSpec.containers) || tplSpec.containers.length === 0) {
      issues.push({ severity: "error", field: "spec.template.spec.containers", message: "Pod template must have at least one container.", line: findLine(src, "containers:") });
    } else {
      for (const c of tplSpec.containers as unknown[]) {
        const co = c as Record<string, unknown>;
        if (!co.name || !co.image) {
          issues.push({ severity: "error", field: "spec.template.spec.containers", message: "Each container needs name and image.", line: findLine(src, "- name:") });
        }
        if (!co.resources) {
          issues.push({ severity: "warn", field: "spec.template.spec.containers[].resources", message: "Container has no resource requests/limits — it may be evicted or starve neighbours.", line: findLine(src, "image:") });
        }
        if (!co.livenessProbe && !co.readinessProbe) {
          issues.push({ severity: "info", field: "spec.template.spec.containers[].livenessProbe", message: "No liveness/readiness probe — Kubernetes cannot detect a hung container." });
        }
        if (!Array.isArray(co.ports) || co.ports.length === 0) {
          issues.push({ severity: "info", field: "spec.template.spec.containers[].ports", message: "Container declares no ports." });
        }
      }
    }
  }
  // Check label match between selector and template
  const selector = spec.selector as { matchLabels?: Record<string, string> } | undefined;
  const tplMeta = (spec.template as { metadata?: { labels?: Record<string, string> } })?.metadata;
  if (selector?.matchLabels && tplMeta?.labels) {
    for (const [k, v] of Object.entries(selector.matchLabels)) {
      if (tplMeta.labels[k] !== v) {
        issues.push({
          severity: "error",
          field: "spec.selector.matchLabels",
          message: `Selector label "${k}: ${v}" does not match pod template label (got "${tplMeta.labels[k] ?? "missing"}").`,
          line: findLine(src, "matchLabels:"),
        });
      }
    }
  }
}

function validateService(doc: Record<string, unknown>, issues: ValidationIssue[], src: string) {
  const spec = doc.spec as Record<string, unknown> | undefined;
  if (!spec) {
    issues.push({ severity: "error", field: "spec", message: "Service requires a spec.", line: findLine(src, "spec:") });
    return;
  }
  if (!spec.selector || (typeof spec.selector === "object" && Object.keys(spec.selector as object).length === 0)) {
    if (spec.type !== "ExternalName" && spec.type !== "LoadBalancer") {
      issues.push({ severity: "warn", field: "spec.selector", message: "Service has no selector — it will not route traffic to any pods unless you define endpoints manually.", line: findLine(src, "selector:") });
    }
  }
  if (!Array.isArray(spec.ports) || spec.ports.length === 0) {
    issues.push({ severity: "error", field: "spec.ports", message: "Service must define at least one port.", line: findLine(src, "ports:") });
  } else {
    for (const p of spec.ports as unknown[]) {
      const po = p as Record<string, unknown>;
      if (typeof po.port !== "number") {
        issues.push({ severity: "warn", field: "spec.ports[].port", message: "Service port missing 'port' field.", line: findLine(src, "- port:") });
      }
    }
  }
}

function validatePod(doc: Record<string, unknown>, issues: ValidationIssue[], src: string) {
  const spec = doc.spec as Record<string, unknown> | undefined;
  if (!spec) {
    issues.push({ severity: "error", field: "spec", message: "Pod requires a spec.", line: findLine(src, "spec:") });
    return;
  }
  if (!Array.isArray(spec.containers) || spec.containers.length === 0) {
    issues.push({ severity: "error", field: "spec.containers", message: "Pod must have at least one container.", line: findLine(src, "containers:") });
  }
  if (spec.restartPolicy && !["Always", "OnFailure", "Never"].includes(spec.restartPolicy as string)) {
    issues.push({ severity: "warn", field: "spec.restartPolicy", message: `Unknown restartPolicy "${String(spec.restartPolicy)}".`, line: findLine(src, "restartPolicy:") });
  }
}

function validateConfigMap(doc: Record<string, unknown>, issues: ValidationIssue[], src: string) {
  const data = (doc.data as Record<string, unknown> | undefined) ?? {};
  const binaryData = (doc.binaryData as Record<string, unknown> | undefined) ?? {};
  if (Object.keys(data).length === 0 && Object.keys(binaryData).length === 0) {
    issues.push({ severity: "info", field: "data", message: "ConfigMap has no data — it will be empty when mounted.", line: findLine(src, "data:") });
  }
}

function validateSecret(doc: Record<string, unknown>, issues: ValidationIssue[], src: string) {
  const data = (doc.data as Record<string, unknown> | undefined) ?? {};
  const stringData = (doc.stringData as Record<string, unknown> | undefined) ?? {};
  if (Object.keys(data).length === 0 && Object.keys(stringData).length === 0) {
    issues.push({ severity: "info", field: "data", message: "Secret has no data — it will be empty when mounted.", line: findLine(src, "data:") });
  }
  // Check that data values look base64-encoded.
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" && v.length > 0 && !/^[A-Za-z0-9+/]*={0,2}$/.test(v)) {
      issues.push({
        severity: "warn",
        field: `data.${k}`,
        message: `Secret data.${k} is not valid base64 — Kubernetes expects base64-encoded values. Use stringData for plaintext.`,
        line: findLine(src, `${k}:`),
      });
    }
  }
  if (stringData && Object.keys(stringData).length > 0) {
    issues.push({ severity: "info", field: "stringData", message: "Secret uses stringData (plaintext). Kubernetes will base64-encode it on apply." });
  }
}

function validateIngress(doc: Record<string, unknown>, issues: ValidationIssue[], src: string) {
  const spec = doc.spec as Record<string, unknown> | undefined;
  if (!spec) {
    issues.push({ severity: "error", field: "spec", message: "Ingress requires a spec.", line: findLine(src, "spec:") });
    return;
  }
  if (!Array.isArray(spec.rules) || spec.rules.length === 0) {
    if (!spec.tls) {
      issues.push({ severity: "warn", field: "spec.rules", message: "Ingress has no rules and no TLS — it will not route any traffic.", line: findLine(src, "rules:") });
    }
  }
  if (!spec.ingressClassName && !doc.apiVersion?.toString().startsWith("networking.k8s.io/v1beta1")) {
    issues.push({ severity: "info", field: "spec.ingressClassName", message: "No ingressClassName — the default ingress controller will be used." });
  }
}

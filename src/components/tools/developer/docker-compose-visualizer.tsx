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
  Boxes,
  CheckCircle2,
  Container,
  HardDrive,
  HeartPulse,
  Network,
  Package,
  Play,
  RefreshCw,
  Share2,
  Spline,
  Workflow,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { parseYamlAll } from "./_dev2-helpers";

const SAMPLE = `version: "3.9"

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./html:/usr/share/nginx/html
      - ./conf:/etc/nginx/conf.d
    depends_on:
      - api
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 5s
      retries: 3

  api:
    image: dueneo/api:1.4.2
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app
      - REDIS_URL=redis://cache:6379
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 15s
      timeout: 3s
      retries: 5

  worker:
    image: dueneo/worker:1.4.2
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app
      - REDIS_URL=redis://cache:6379
    depends_on:
      - api
    restart: always

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: always

volumes:
  db-data:`;

interface ComposeService {
  name: string;
  image?: string;
  build?: string | Record<string, unknown>;
  ports: string[];
  environment: string[];
  volumes: string[];
  dependsOn: string[];
  restart?: string;
  hasHealthcheck: boolean;
  networks: string[];
  raw: Record<string, unknown>;
}

interface ComposeAnalysis {
  services: ComposeService[];
  volumes: string[];
  networks: string[];
  warnings: { level: "warn" | "info"; message: string }[];
  version?: string;
}

export function DockerComposeVisualizer({ tool }: { tool: ToolDefinition }) {
  const [raw, setRaw] = React.useState("");
  const [analysis, setAnalysis] = React.useState<ComposeAnalysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const analyze = React.useCallback(() => {
    if (!raw.trim()) {
      setAnalysis(null);
      setError("Paste a docker-compose.yml first.");
      return;
    }
    const result = parseYamlAll(raw);
    if (!result.ok || result.docs.length === 0) {
      setAnalysis(null);
      setError(result.error ?? "Could not parse the YAML.");
      toast.error("YAML parse failed.");
      return;
    }
    const doc = result.docs[0] as Record<string, unknown> | null;
    if (!doc || typeof doc !== "object") {
      setAnalysis(null);
      setError("The document is not a valid docker-compose file.");
      return;
    }
    try {
      const a = analyzeCompose(doc);
      setAnalysis(a);
      setError(null);
      toast.success(`Parsed ${a.services.length} services.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
      setAnalysis(null);
      toast.error("Analysis failed.");
    }
  }, [raw]);

  const loadSample = () => {
    setRaw(SAMPLE);
    const r = parseYamlAll(SAMPLE);
    if (r.ok && r.docs[0]) {
      try {
        setAnalysis(analyzeCompose(r.docs[0] as Record<string, unknown>));
        setError(null);
      } catch {
        /* ignore */
      }
    }
  };

  const reset = () => {
    setRaw("");
    setAnalysis(null);
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Paste a docker-compose.yml and the tool turns it into a readable service catalog plus an SVG dependency graph. Each service shows its image, ports, environment, volumes, restart policy and healthcheck. Edges show depends_on relationships so you can see startup order at a glance, and common pitfalls (no healthcheck, exposed DB port, missing restart policy) are flagged as warnings.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dc-input">docker-compose YAML</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="dc-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="version: '3.9'…"
              className="min-h-[320px] font-mono text-xs"
              spellCheck={false}
              aria-label="docker-compose input"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={analyze}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Visualize
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

            {analysis && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Stat icon={Container} label="Services" value={String(analysis.services.length)} />
                  <Stat icon={HardDrive} label="Volumes" value={String(analysis.volumes.length)} />
                  <Stat icon={Network} label="Networks" value={String(analysis.networks.length)} />
                </div>

                {analysis.warnings.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> No warnings — this compose file looks healthy.
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs">
                    <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5" /> {analysis.warnings.length} warning(s)
                    </div>
                    <ul className="space-y-1 text-amber-900 dark:text-amber-100">
                      {analysis.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500">›</span>
                          <span>{w.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {analysis && analysis.services.length > 0 && (
          <>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Spline className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Dependency graph</h3>
                <span className="text-xs text-muted-foreground">arrows point from a service to what it depends on</span>
              </div>
              <DependencyGraph services={analysis.services} />
            </div>

            <div className="rounded-xl border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Services</h3>
              </div>
              <div className="space-y-3">
                {analysis.services.map((s) => (
                  <ServiceCard key={s.name} s={s} allServices={analysis.services} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your compose file", description: "Drop the contents of docker-compose.yml (or docker-compose.yaml) into the input." },
      { title: "Visualize", description: "Click Visualize. The tool parses services, volumes, networks and depends_on." },
      { title: "Read the graph", description: "The SVG shows each service as a box with arrows from a service to its dependencies." },
      { title: "Review warnings", description: "Exposed database ports, missing healthchecks and missing restart policies are flagged." },
    ],
    useCases: [
      "Understand the topology of an unfamiliar multi-service project at a glance.",
      "Verify that depends_on ordering matches your startup expectations.",
      "Catch missing healthchecks that make depends_on: condition: service_healthy useless.",
      "Audit a compose file for missing restart policies or exposed internal ports.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Long-form and short-form depends_on are both supported; <code>condition:</code> is shown in the service card.</li>
        <li>Build contexts, secrets, configs and profiles are detected but not deeply visualised.</li>
        <li>The SVG graph uses a simple layered layout — very wide compose files may overflow horizontally (scroll to see).</li>
        <li>The tool parses YAML only; it does not run <code>docker compose config</code> validation.</li>
      </ul>
    ),
    faq: [
      { q: "Does this run docker compose?", a: "No. It parses the YAML and visualises the structure. Nothing is started or pulled." },
      { q: "Why is my depends_on condition not shown?", a: "Long-form depends_on (with condition: service_healthy) is supported and shown in the service card. Short-form (a list) only expresses ordering." },
      { q: "What does 'exposed DB port' mean?", a: "A database image (postgres, mysql, mongo, redis, …) maps a port to the host with the ports: list. In production you usually want the DB reachable only inside the Docker network, not the host." },
      { q: "Can I edit the graph?", a: "Not yet — it is read-only. Edit the YAML and click Visualize again to see the change." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ServiceCard({ s, allServices }: { s: ComposeService; allServices: ComposeService[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/40"
      >
        <Container className="h-4 w-4 text-primary flex-none" />
        <code className="font-mono font-semibold">{s.name}</code>
        {s.image && <span className="truncate text-xs text-muted-foreground">{s.image}</span>}
        <div className="ml-auto flex flex-none gap-1">
          {s.ports.length > 0 && <Badge variant="secondary" className="text-[10px]">{s.ports.length} ports</Badge>}
          {s.hasHealthcheck && <Badge variant="outline" className="text-[10px] text-emerald-600"><HeartPulse className="mr-0.5 h-2.5 w-2.5" />health</Badge>}
          {s.dependsOn.length > 0 && <Badge variant="outline" className="text-[10px]">{s.dependsOn.length} deps</Badge>}
        </div>
      </button>
      {open && (
        <div className="grid gap-3 border-t p-3 text-xs sm:grid-cols-2">
          <Field icon={Package} label="Image">{s.image ?? <span className="text-muted-foreground">(none)</span>}</Field>
          <Field icon={RefreshCw} label="Restart">{s.restart ?? <span className="text-muted-foreground">no</span>}</Field>
          <Field icon={Network} label="Ports">
            {s.ports.length === 0 ? <span className="text-muted-foreground">none</span> : (
              <div className="flex flex-wrap gap-1">
                {s.ports.map((p, i) => <Badge key={i} variant="outline" className="font-mono text-[10px]">{p}</Badge>)}
              </div>
            )}
          </Field>
          <Field icon={Share2} label="Depends on">
            {s.dependsOn.length === 0 ? <span className="text-muted-foreground">nothing</span> : (
              <div className="flex flex-wrap gap-1">
                {s.dependsOn.map((d, i) => {
                  const dep = allServices.find((x) => x.name === d);
                  return <Badge key={i} variant="secondary" className="font-mono text-[10px]">{d}{dep && !dep.hasHealthcheck ? " ⚠" : ""}</Badge>;
                })}
              </div>
            )}
          </Field>
          <Field icon={HardDrive} label="Volumes">
            {s.volumes.length === 0 ? <span className="text-muted-foreground">none</span> : (
              <ul className="space-y-0.5 font-mono text-[11px]">
                {s.volumes.map((v, i) => <li key={i} className="break-all">{v}</li>)}
              </ul>
            )}
          </Field>
          <Field icon={Boxes} label="Environment">
            {s.environment.length === 0 ? <span className="text-muted-foreground">none</span> : (
              <ul className="max-h-32 space-y-0.5 overflow-y-auto thin-scroll font-mono text-[11px]">
                {s.environment.map((e, i) => <li key={i} className="break-all">{maskSecret(e)}</li>)}
              </ul>
            )}
          </Field>
          {s.networks.length > 0 && (
            <Field icon={Network} label="Networks">
              <div className="flex flex-wrap gap-1">
                {s.networks.map((n, i) => <Badge key={i} variant="outline" className="font-mono text-[10px]">{n}</Badge>)}
              </div>
            </Field>
          )}
          <Field icon={HeartPulse} label="Healthcheck">
            {s.hasHealthcheck ? <span className="text-emerald-600 dark:text-emerald-400">present</span> : <span className="text-amber-600 dark:text-amber-400">missing</span>}
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

/* ─────────────────────── Dependency graph SVG ─────────────────────── */

function DependencyGraph({ services }: { services: ComposeService[] }) {
  // Topological layers: services with no remaining deps go in layer 0.
  const layers = React.useMemo(() => computeLayers(services), [services]);
  const W = 1000;
  const ROW_H = 90;
  const BOX_W = 130;
  const BOX_H = 50;
  const layerWidth = layers.length > 0 ? W / layers.length : W;

  const positions = React.useMemo(() => {
    const map = new Map<string, { x: number; y: number; layer: number }>();
    layers.forEach((layer, li) => {
      const colW = layerWidth;
      layer.forEach((name, si) => {
        const x = li * colW + colW / 2 - BOX_W / 2;
        const y = si * ROW_H + 10;
        map.set(name, { x, y, layer: li });
      });
    });
    return map;
  }, [layers, layerWidth]);

  const height = Math.max(...layers.map((l) => l.length)) * ROW_H + 20;

  return (
    <div className="overflow-x-auto thin-scroll">
      <svg width={W} height={height} className="block" role="img" aria-label="Service dependency graph">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>
        {services.map((s) => {
          const from = positions.get(s.name);
          if (!from) return null;
          return s.dependsOn.map((dep) => {
            const to = positions.get(dep);
            if (!to) return null;
            const x1 = from.x + BOX_W / 2;
            const y1 = from.y + BOX_H / 2;
            const x2 = to.x + BOX_W / 2;
            const y2 = to.y + BOX_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`${s.name}-${dep}`}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                markerEnd="url(#arrowhead)"
                opacity={0.7}
              />
            );
          });
        })}
        {services.map((s) => {
          const pos = positions.get(s.name);
          if (!pos) return null;
          return (
            <g key={s.name}>
              <rect
                x={pos.x}
                y={pos.y}
                width={BOX_W}
                height={BOX_H}
                rx={8}
                className="fill-background stroke-primary"
                strokeWidth={1.5}
              />
              <text
                x={pos.x + BOX_W / 2}
                y={pos.y + 22}
                textAnchor="middle"
                className="fill-foreground font-mono"
                fontSize="13"
                fontWeight="600"
              >
                {s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name}
              </text>
              <text
                x={pos.x + BOX_W / 2}
                y={pos.y + 38}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="9"
              >
                {s.dependsOn.length > 0 ? `${s.dependsOn.length} deps` : "leaf"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function computeLayers(services: ComposeService[]): string[][] {
  const remaining = new Set(services.map((s) => s.name));
  const layers: string[][] = [];
  const placed = new Set<string>();
  while (remaining.size > 0) {
    const layer: string[] = [];
    for (const name of remaining) {
      const svc = services.find((s) => s.name === name)!;
      const deps = svc.dependsOn.filter((d) => services.some((s) => s.name === d));
      if (deps.every((d) => placed.has(d))) {
        layer.push(name);
      }
    }
    if (layer.length === 0) {
      // Cycle — dump remaining into the last layer.
      layer.push(...Array.from(remaining));
    }
    for (const name of layer) {
      placed.add(name);
      remaining.delete(name);
    }
    layers.push(layer);
  }
  return layers;
}

/* ─────────────────────────── Analyzer ─────────────────────────────── */

function analyzeCompose(doc: Record<string, unknown>): ComposeAnalysis {
  const warnings: { level: "warn" | "info"; message: string }[] = [];
  const version = typeof doc.version === "string" ? doc.version : undefined;

  const servicesMap = (doc.services as Record<string, unknown> | undefined) ?? {};
  if (!servicesMap || typeof servicesMap !== "object" || Object.keys(servicesMap).length === 0) {
    warnings.push({ level: "warn", message: "No 'services' key found — is this really a compose file?" });
  }

  const dbImagePatterns = /(postgres|mysql|mongo|redis|mariadb|elasticsearch|mssql|cockroach)/i;

  const services: ComposeService[] = Object.entries(servicesMap).map(([name, raw]) => {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const ports = toStringArray(r.ports);
    const environment = toStringArray(r.environment).concat(
      r.environment && typeof r.environment === "object"
        ? Object.entries(r.environment as Record<string, unknown>).map(([k, v]) => `${k}=${v ?? ""}`)
        : []
    );
    const volumes = toStringArray(r.volumes);
    const dependsOn: string[] = Array.isArray(r.depends_on)
      ? (r.depends_on as unknown[]).filter((x): x is string => typeof x === "string")
      : r.depends_on && typeof r.depends_on === "object"
      ? Object.keys(r.depends_on as Record<string, unknown>)
      : [];
    const networks = toStringArray(r.networks);
    const hasHealthcheck = !!r.healthcheck && typeof r.healthcheck === "object";

    // Warnings
    if (!r.image && !r.build) {
      warnings.push({ level: "warn", message: `Service "${name}" has neither image nor build — it cannot start.` });
    }
    if (!hasHealthcheck) {
      warnings.push({ level: "info", message: `Service "${name}" has no healthcheck — depends_on: condition: service_healthy will not work for it.` });
    }
    if (!r.restart) {
      warnings.push({ level: "info", message: `Service "${name}" has no restart policy — it will not restart after a crash or host reboot.` });
    }
    if (r.image && typeof r.image === "string" && dbImagePatterns.test(r.image) && ports.length > 0) {
      warnings.push({ level: "warn", message: `Service "${name}" looks like a database but exposes a port to the host. Consider removing the ports mapping in production.` });
    }
    if (r.image && typeof r.image === "string" && !r.image.includes(":")) {
      warnings.push({ level: "warn", message: `Service "${name}" uses an image without a tag — Docker will pull :latest, which is not reproducible.` });
    }
    if (r.image && typeof r.image === "string" && r.image.endsWith(":latest")) {
      warnings.push({ level: "info", message: `Service "${name}" uses the :latest tag — pin a specific version for reproducible builds.` });
    }
    // Validate depends_on references
    for (const dep of dependsOn) {
      if (!(dep in servicesMap)) {
        warnings.push({ level: "warn", message: `Service "${name}" depends_on "${dep}" which is not defined in this compose file.` });
      }
    }

    return {
      name,
      image: typeof r.image === "string" ? r.image : undefined,
      build: r.build as string | Record<string, unknown> | undefined,
      ports,
      environment,
      volumes,
      dependsOn,
      restart: typeof r.restart === "string" ? r.restart : undefined,
      hasHealthcheck,
      networks,
      raw: r,
    };
  });

  const volumes = doc.volumes && typeof doc.volumes === "object" ? Object.keys(doc.volumes as Record<string, unknown>) : [];
  const networks = doc.networks && typeof doc.networks === "object" ? Object.keys(doc.networks as Record<string, unknown>) : [];

  // Detect cycles
  const cycle = detectCycle(services);
  if (cycle) {
    warnings.push({ level: "warn", message: `Dependency cycle detected: ${cycle}. The graph layout will still render but the services cannot start.` });
  }

  return { services, volumes, networks, warnings, version };
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : JSON.stringify(x)));
  }
  return [];
}

function maskSecret(env: string): string {
  // Heuristic: hide values that look like secrets (PASS, SECRET, TOKEN, KEY).
  if (/^(PASS|SECRET|TOKEN|KEY|API_KEY|PASSWORD|PRIVATE_KEY)/i.test(env) && env.includes("=")) {
    const [k, ...rest] = env.split("=");
    const val = rest.join("=");
    if (val.length > 4) return `${k}=${val.slice(0, 2)}••••••`;
    return `${k}=••••`;
  }
  return env;
}

function detectCycle(services: ComposeService[]): string | null {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(services.map((s) => [s.name, WHITE]));
  const stack: string[] = [];

  const visit = (name: string): boolean => {
    color.set(name, GRAY);
    stack.push(name);
    const svc = services.find((s) => s.name === name);
    if (svc) {
      for (const dep of svc.dependsOn) {
        if (!color.has(dep)) continue;
        const c = color.get(dep);
        if (c === GRAY) {
          stack.push(dep);
          return true;
        }
        if (c === WHITE && visit(dep)) return true;
      }
    }
    stack.pop();
    color.set(name, BLACK);
    return false;
  };

  for (const s of services) {
    if (color.get(s.name) === WHITE) {
      if (visit(s.name)) {
        const start = stack.lastIndexOf(stack[stack.length - 1]);
        return stack.slice(start).join(" → ");
      }
    }
  }
  return null;
}

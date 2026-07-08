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
  AlertTriangle,
  CheckCircle2,
  Database,
  Filter,
  GitBranch,
  Layers,
  Play,
  RefreshCw,
  SortAsc,
  Table2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

const SAMPLE = `SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = 1 AND u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 20;`;

interface PlanStep {
  id: number;
  operation: string;
  table?: string;
  alias?: string;
  detail: string;
  estimatedRows: number;
  cost: number;
  scanType: "INDEX" | "FULL" | "RANGE" | "JOIN" | "SORT" | "AGGREGATE" | "LIMIT" | "FILTER";
}

interface SqlAnalysis {
  operation: string;
  tables: { name: string; alias?: string }[];
  joins: { type: string; left: string; right: string; condition: string }[];
  where: string[];
  groupBy: string[];
  having: string[];
  orderBy: { expr: string; dir: string }[];
  limit?: number;
  offset?: number;
  selectColumns: string[];
  steps: PlanStep[];
  warnings: { level: "warn" | "error"; message: string }[];
  totalCost: number;
}

export function SqlExecutionPlanner({ tool }: { tool: ToolDefinition }) {
  const [sql, setSql] = React.useState("");
  const [analysis, setAnalysis] = React.useState<SqlAnalysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const plan = React.useCallback(() => {
    if (!sql.trim()) {
      setAnalysis(null);
      setError("Paste a SQL query first.");
      return;
    }
    try {
      const result = analyzeSql(sql);
      setAnalysis(result);
      setError(null);
      toast.success(`Planned ${result.steps.length} steps.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse the query.");
      setAnalysis(null);
      toast.error("Parsing failed.");
    }
  }, [sql]);

  const loadSample = () => {
    setSql(SAMPLE);
    setError(null);
    try {
      setAnalysis(analyzeSql(SAMPLE));
    } catch {
      /* sample is valid */
    }
  };

  const reset = () => {
    setSql("");
    setAnalysis(null);
    setError(null);
  };

  const content: ToolContent = {
    intro:
      "Paste a SELECT query and get a heuristic execution plan — the kind of thing EXPLAIN would show, but without needing a live database. The planner identifies tables, JOINs, WHERE filters, GROUP BY and ORDER BY, estimates per-step row counts and cost (index vs full scan), and flags common mistakes like SELECT *, missing WHERE, or cartesian joins.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sql-input">SQL query</Label>
              <button type="button" onClick={loadSample} className="text-xs text-primary hover:underline">
                Load sample
              </button>
            </div>
            <Textarea
              id="sql-input"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT … FROM … WHERE …"
              className="min-h-[260px] font-mono text-xs"
              spellCheck={false}
              aria-label="SQL input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Execution plan</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={reset}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
                <Button size="sm" onClick={plan}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Explain
                </Button>
              </div>
            </div>
            <div className="min-h-[260px] rounded-md border bg-muted/20 p-3 font-mono text-xs">
              {error && (
                <div role="alert" className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{error}</span>
                </div>
              )}
              {!error && !analysis && (
                <span className="text-muted-foreground">The simulated EXPLAIN output will appear here.</span>
              )}
              {analysis && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b pb-1.5 text-muted-foreground">
                    <span>== EXPLAIN (heuristic) ==</span>
                    <span>total cost ≈ {analysis.totalCost}</span>
                  </div>
                  {analysis.steps.map((s) => (
                    <div key={s.id} className="flex items-start gap-2">
                      <span className="text-muted-foreground">[{s.id}]</span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-foreground">{s.operation}</span>
                          {s.table && <Badge variant="outline" className="font-mono text-[10px]">{s.table}{s.alias ? ` (${s.alias})` : ""}</Badge>}
                          <ScanBadge type={s.scanType} />
                        </div>
                        <div className="text-muted-foreground">{s.detail}</div>
                        <div className="text-[10px] text-muted-foreground">
                          rows ≈ {s.estimatedRows.toLocaleString()} · cost ≈ {s.cost}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {analysis && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Database} label="Tables" value={String(analysis.tables.length)} />
              <StatCard icon={GitBranch} label="JOINs" value={String(analysis.joins.length)} />
              <StatCard icon={Filter} label="WHERE clauses" value={String(analysis.where.length)} />
              <StatCard icon={TrendingUp} label="Total cost" value={String(analysis.totalCost)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Identified components" icon={Layers}>
                <dl className="space-y-2 text-xs">
                  <Row label="Operation">
                    <Badge variant="secondary">{analysis.operation}</Badge>
                  </Row>
                  <Row label="Tables">
                    <div className="flex flex-wrap gap-1">
                      {analysis.tables.map((t, i) => (
                        <Badge key={i} variant="outline" className="font-mono">
                          <Table2 className="mr-1 h-3 w-3" />{t.name}{t.alias ? ` ${t.alias}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </Row>
                  {analysis.selectColumns.length > 0 && (
                    <Row label="Columns">
                      <code className="text-[11px]">{analysis.selectColumns.join(", ")}</code>
                    </Row>
                  )}
                  {analysis.where.length > 0 && (
                    <Row label="WHERE">
                      <code className="text-[11px]">{analysis.where.join(" AND ")}</code>
                    </Row>
                  )}
                  {analysis.joins.length > 0 && (
                    <Row label="JOINs">
                      <div className="space-y-1">
                        {analysis.joins.map((j, i) => (
                          <div key={i} className="font-mono text-[11px]">
                            <Badge variant="outline" className="mr-1">{j.type}</Badge>
                            {j.left} → {j.right} ON {j.condition}
                          </div>
                        ))}
                      </div>
                    </Row>
                  )}
                  {analysis.groupBy.length > 0 && (
                    <Row label="GROUP BY">
                      <code className="text-[11px]">{analysis.groupBy.join(", ")}</code>
                    </Row>
                  )}
                  {analysis.having.length > 0 && (
                    <Row label="HAVING">
                      <code className="text-[11px]">{analysis.having.join(" AND ")}</code>
                    </Row>
                  )}
                  {analysis.orderBy.length > 0 && (
                    <Row label="ORDER BY">
                      <div className="flex flex-wrap gap-1">
                        {analysis.orderBy.map((o, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            <SortAsc className="mr-1 h-3 w-3" />{o.expr} {o.dir}
                          </Badge>
                        ))}
                      </div>
                    </Row>
                  )}
                  {(analysis.limit !== undefined || analysis.offset !== undefined) && (
                    <Row label="LIMIT/OFFSET">
                      <code className="text-[11px]">
                        {analysis.limit !== undefined ? `LIMIT ${analysis.limit}` : ""}
                        {analysis.offset ? ` OFFSET ${analysis.offset}` : ""}
                      </code>
                    </Row>
                  )}
                </dl>
              </SectionCard>

              <SectionCard title="Warnings & diagnostics" icon={AlertTriangle}>
                {analysis.warnings.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> No warnings. Looks healthy.
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {analysis.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {w.level === "error" ? (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-destructive" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
                        )}
                        <span>{w.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground">Heuristics used:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>Primary-key lookups use an <strong>index scan</strong>.</li>
                    <li>Range conditions (<code>&lt;</code>, <code>&gt;</code>, <code>BETWEEN</code>) use an index range scan.</li>
                    <li>Filters on non-PK columns fall back to a full table scan.</li>
                    <li>Cost grows with estimated rows × scan multiplier.</li>
                  </ul>
                </div>
              </SectionCard>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Plan as text</span>
                <CopyButton
                  size="sm"
                  value={() =>
                    analysis.steps
                      .map((s) => `[${s.id}] ${s.operation}${s.table ? ` on ${s.table}` : ""} — ${s.detail} (rows≈${s.estimatedRows}, cost≈${s.cost})`)
                      .join("\n")
                  }
                />
              </div>
              <pre className="max-h-40 overflow-auto thin-scroll rounded bg-background p-2 text-xs font-mono">
                {analysis.steps
                  .map((s) => `[${s.id}] ${s.operation}${s.table ? ` on ${s.table}` : ""} — ${s.detail} (rows≈${s.estimatedRows}, cost≈${s.cost})`)
                  .join("\n")}
              </pre>
            </div>
          </>
        )}
      </div>
    ),
    howTo: [
      { title: "Paste your SQL", description: "Drop a SELECT, INSERT, UPDATE or DELETE statement. The parser focuses on SELECT but accepts any statement." },
      { title: "Click Explain", description: "The tool heuristically parses tables, JOINs, WHERE, GROUP BY, HAVING, ORDER BY and LIMIT." },
      { title: "Review the plan", description: "Each step lists its operation, scan type, estimated rows and cost. The total cost sums every step." },
      { title: "Check warnings", description: "Common issues (SELECT *, missing WHERE, cartesian joins, unindexed filters) are flagged so you can fix them before running the query." },
    ],
    useCases: [
      "Estimate whether a query will be cheap or expensive before running it in production.",
      "Teach SQL performance concepts: index vs full scans, join order, sort cost.",
      "Spot missing WHERE clauses or SELECT * early in code review.",
      "Compare two formulations of the same query by their estimated cost.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>This is a <strong>heuristic</strong> planner, not a real database engine. Real costs depend on statistics, indexes and the DBMS optimiser.</li>
        <li>Subqueries, CTEs and window functions are detected but not deeply modelled.</li>
        <li>The tool assumes an index exists on the primary key only — other indexes are not inferred.</li>
        <li>No SQL is executed; nothing leaves your browser.</li>
      </ul>
    ),
    faq: [
      { q: "Does this run my query?", a: "No. It parses the SQL text heuristically and simulates what an EXPLAIN would show. No database connection is made." },
      { q: "Why is my column flagged as unindexed?", a: "The planner only knows about primary-key columns. Any other filter is assumed to need a full table scan. In a real database you would add an index to make it a range or index scan." },
      { q: "What does 'cost' mean?", a: "A relative, unitless number that combines estimated rows and scan type. Use it to compare query shapes, not as an absolute prediction." },
      { q: "Does it support INSERT/UPDATE/DELETE?", a: "It detects the operation and target table, but the step-by-step plan is most useful for SELECT queries." },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ───────────────────────── Components ─────────────────────────────── */

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <dt className="w-28 flex-none text-muted-foreground">{label}</dt>
      <dd className="flex-1 break-words">{children}</dd>
    </div>
  );
}

function ScanBadge({ type }: { type: PlanStep["scanType"] }) {
  const styles: Record<PlanStep["scanType"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    INDEX: { variant: "secondary", label: "index scan" },
    FULL: { variant: "destructive", label: "full scan" },
    RANGE: { variant: "secondary", label: "range scan" },
    JOIN: { variant: "outline", label: "join" },
    SORT: { variant: "outline", label: "sort" },
    AGGREGATE: { variant: "outline", label: "aggregate" },
    LIMIT: { variant: "outline", label: "limit" },
    FILTER: { variant: "outline", label: "filter" },
  };
  const s = styles[type];
  return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
}

/* ───────────────────────── SQL parser ─────────────────────────────── */

function analyzeSql(input: string): SqlAnalysis {
  const sql = input.trim().replace(/;+\s*$/, "");
  if (!sql) throw new Error("Empty query.");

  // Normalise whitespace inside parentheses for easier matching.
  const lower = sql.toLowerCase();

  // Top-level operation.
  const opMatch = lower.match(/^\s*(select|insert|update|delete|with|create|drop|alter|truncate|merge)\b/);
  const operation = opMatch ? opMatch[1].toUpperCase() : "UNKNOWN";

  const warnings: { level: "warn" | "error"; message: string }[] = [];

  // ── Parse SELECT body (everything between SELECT and the next top-level keyword)
  // We split on top-level clauses.
  const clauses = splitTopLevelClauses(sql);

  const selectClause = clauses.find((c) => c.type === "select")?.text ?? "";
  const fromClause = clauses.find((c) => c.type === "from")?.text ?? "";
  const whereClause = clauses.find((c) => c.type === "where")?.text ?? "";
  const groupByClause = clauses.find((c) => c.type === "group by")?.text ?? "";
  const havingClause = clauses.find((c) => c.type === "having")?.text ?? "";
  const orderByClause = clauses.find((c) => c.type === "order by")?.text ?? "";
  const limitClause = clauses.find((c) => c.type === "limit")?.text ?? "";
  const offsetClause = clauses.find((c) => c.type === "offset")?.text ?? "";

  // SELECT columns
  const selectColumns = splitTopLevel(selectClause).map((s) => s.trim()).filter(Boolean);

  // Detect SELECT *
  if (selectColumns.some((c) => c === "*" || c.toLowerCase() === "count(*)")) {
    // count(*) is fine
  }
  if (selectColumns.some((c) => c.trim() === "*")) {
    warnings.push({
      level: "warn",
      message: "SELECT * returns every column — explicitly list the columns you need to reduce I/O and avoid breaking changes when the schema evolves.",
    });
  }

  // Tables and JOINs from FROM clause
  const { tables, joins } = parseFromClause(fromClause);
  if (tables.length === 0 && operation === "SELECT") {
    warnings.push({ level: "error", message: "No FROM clause found — a SELECT without a source is unusual." });
  }

  // WHERE conditions
  const where = whereClause ? splitTopLevel(whereClause, /\s+and\s+/i).map((s) => s.trim()).filter(Boolean) : [];
  if (operation === "SELECT" && where.length === 0 && tables.length > 0) {
    warnings.push({
      level: "warn",
      message: "No WHERE clause — the query will scan every row in the table(s). Add a filter to bound the result set.",
    });
  }

  // GROUP BY
  const groupBy = groupByClause
    ? splitTopLevel(groupByClause).map((s) => s.trim()).filter(Boolean)
    : [];

  // HAVING
  const having = havingClause
    ? splitTopLevel(havingClause, /\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
    : [];

  // ORDER BY
  const orderBy: { expr: string; dir: string }[] = [];
  if (orderByClause) {
    for (const part of splitTopLevel(orderByClause)) {
      const m = part.trim().match(/^(.*?)(?:\s+(asc|desc))?\s*$/i);
      if (m) orderBy.push({ expr: m[1].trim(), dir: (m[2] ?? "asc").toUpperCase() });
    }
  }

  // LIMIT / OFFSET
  let limit: number | undefined;
  let offset: number | undefined;
  if (limitClause) {
    const m = limitClause.match(/(\d+)/);
    if (m) limit = Number(m[1]);
  }
  if (offsetClause) {
    const m = offsetClause.match(/(\d+)/);
    if (m) offset = Number(m[1]);
  }

  // Cartesian join check
  if (tables.length >= 2 && joins.length === 0 && operation === "SELECT") {
    warnings.push({
      level: "error",
      message: `Cartesian product: ${tables.length} tables in FROM with no JOIN condition — this multiplies every row of every table together.`,
    });
  }

  // Build plan steps
  const steps: PlanStep[] = [];
  let id = 1;
  let totalCost = 0;

  // For each table, decide scan type based on WHERE filters touching it.
  for (const t of tables) {
    const filtersOnTable = where.filter((w) => referencesAlias(w, t));
    const pkFilter = filtersOnTable.find((w) => /\b(id|.*_id)\s*=\s*\?|\b(id|.*_id)\s*=\s*\d+/.test(w.toLowerCase()));
    const rangeFilter = filtersOnTable.find((w) => /(<|>|between|>=|<=)/i.test(w));

    let scanType: PlanStep["scanType"];
    let detail: string;
    let estRows: number;
    let cost: number;

    if (pkFilter) {
      scanType = "INDEX";
      detail = `Primary-key lookup via filter: ${pkFilter}`;
      estRows = 1;
      cost = 1;
    } else if (rangeFilter) {
      scanType = "RANGE";
      detail = `Index range scan using: ${rangeFilter}`;
      estRows = 1000;
      cost = 50;
    } else if (filtersOnTable.length > 0) {
      scanType = "FULL";
      detail = `Full table scan — no index assumed for: ${filtersOnTable.join(", ")}`;
      estRows = 10000;
      cost = 500;
      warnings.push({
        level: "warn",
        message: `Filter on "${t.alias ?? t.name}" has no obvious index. Consider adding one for: ${filtersOnTable.join(", ")}.`,
      });
    } else {
      scanType = "FULL";
      detail = "Full table scan (no filtering at this level).";
      estRows = 10000;
      cost = 500;
    }

    steps.push({
      id: id++,
      operation: scanType === "INDEX" ? "Index Lookup" : scanType === "RANGE" ? "Index Range Scan" : "Seq Scan",
      table: t.name,
      alias: t.alias,
      detail,
      estimatedRows: estRows,
      cost,
      scanType,
    });
    totalCost += cost;
  }

  // JOINs
  for (const j of joins) {
    const joinCost = 200;
    steps.push({
      id: id++,
      operation: `${j.type} Join`,
      table: j.right,
      detail: `Join ${j.left} → ${j.right} ON ${j.condition}`,
      estimatedRows: 5000,
      cost: joinCost,
      scanType: "JOIN",
    });
    totalCost += joinCost;
  }

  // WHERE filter step (post-join, when filters reference multiple tables)
  if (where.length > 0) {
    steps.push({
      id: id++,
      operation: "Filter",
      detail: `Apply ${where.length} WHERE condition(s): ${where.join(" AND ")}`,
      estimatedRows: 3000,
      cost: where.length * 5,
      scanType: "FILTER",
    });
    totalCost += where.length * 5;
  }

  // GROUP BY
  if (groupBy.length > 0) {
    steps.push({
      id: id++,
      operation: "HashAggregate",
      detail: `Group by ${groupBy.join(", ")}`,
      estimatedRows: 500,
      cost: 100,
      scanType: "AGGREGATE",
    });
    totalCost += 100;
  }

  // HAVING
  if (having.length > 0) {
    steps.push({
      id: id++,
      operation: "Aggregate Filter",
      detail: `HAVING ${having.join(" AND ")}`,
      estimatedRows: 200,
      cost: 30,
      scanType: "AGGREGATE",
    });
    totalCost += 30;
  }

  // ORDER BY
  if (orderBy.length > 0) {
    const sortCost = orderBy.length * 40;
    steps.push({
      id: id++,
      operation: "Sort",
      detail: `Sort by ${orderBy.map((o) => `${o.expr} ${o.dir}`).join(", ")}`,
      estimatedRows: 1000,
      cost: sortCost,
      scanType: "SORT",
    });
    totalCost += sortCost;
    warnings.push({
      level: "warn",
      message: `ORDER BY ${orderBy.map((o) => o.expr).join(", ")} may require an in-memory sort. An index on the sort column can avoid it.`,
    });
  }

  // LIMIT
  if (limit !== undefined) {
    steps.push({
      id: id++,
      operation: "Limit",
      detail: `Limit to ${limit}${offset ? ` offset ${offset}` : ""} rows`,
      estimatedRows: Math.min(limit, 1000),
      cost: 1,
      scanType: "LIMIT",
    });
    totalCost += 1;
  }

  return {
    operation,
    tables,
    joins,
    where,
    groupBy,
    having,
    orderBy,
    limit,
    offset,
    selectColumns,
    steps,
    warnings,
    totalCost,
  };
}

/** Split SQL into top-level clauses (SELECT, FROM, WHERE, …). */
function splitTopLevelClauses(sql: string): { type: string; text: string }[] {
  const keywords = ["select", "from", "where", "group by", "having", "order by", "limit", "offset"];

  // Walk the SQL char by char, tracking paren depth and string literals.
  // Build a parallel lowercased version that ignores string contents.
  const lowerBuf: string[] = new Array(sql.length);
  let inS = false;
  let inD = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inS) {
      lowerBuf[i] = ch.toLowerCase();
      if (ch === "'" && sql[i + 1] !== "'") inS = false;
      else if (ch === "'" && sql[i + 1] === "'") { lowerBuf[++i] = "'"; }
      continue;
    }
    if (inD) {
      lowerBuf[i] = ch.toLowerCase();
      if (ch === '"') inD = false;
      continue;
    }
    if (ch === "'") { inS = true; lowerBuf[i] = ch.toLowerCase(); continue; }
    if (ch === '"') { inD = true; lowerBuf[i] = ch.toLowerCase(); continue; }
    lowerBuf[i] = ch.toLowerCase();
  }
  const lower = lowerBuf.join("");

  // Find clause keyword positions at paren-depth 0.
  const positions: { kw: string; idx: number }[] = [];
  for (const kw of keywords) {
    const re = new RegExp(`(^|\\s)(${kw})(\\s|$)`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      let d = 0;
      for (let i = 0; i < m.index + m[1].length; i++) {
        if (sql[i] === "(") d++;
        else if (sql[i] === ")") d--;
      }
      if (d === 0) positions.push({ kw, idx: m.index + m[1].length });
    }
  }
  positions.sort((a, b) => a.idx - b.idx);

  const result: { type: string; text: string }[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx + positions[i].kw.length;
    const end = i + 1 < positions.length ? positions[i + 1].idx : sql.length;
    const text = sql.slice(start, end).trim();
    if (text) result.push({ type: positions[i].kw, text });
  }
  return result;
}

/** Split a clause body on a delimiter (default comma), respecting parens/strings. */
function splitTopLevel(input: string, delimiter: RegExp | string = ","): string[] {
  const parts: string[] = [];
  let buf = "";
  let inS = false;
  let inD = false;
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inS) {
      buf += ch;
      if (ch === "'" && input[i + 1] !== "'") inS = false;
      else if (ch === "'" && input[i + 1] === "'") buf += input[++i];
      continue;
    }
    if (inD) {
      buf += ch;
      if (ch === '"') inD = false;
      continue;
    }
    if (ch === "'") { inS = true; buf += ch; continue; }
    if (ch === '"') { inD = true; buf += ch; continue; }
    if (ch === "(") { depth++; buf += ch; continue; }
    if (ch === ")") { depth--; buf += ch; continue; }
    if (depth === 0) {
      if (typeof delimiter === "string") {
        if (ch === delimiter) {
          parts.push(buf);
          buf = "";
          continue;
        }
      } else {
        // regex delimiter
        const re = new RegExp(delimiter.source, delimiter.flags.includes("g") ? delimiter.flags : delimiter.flags + "g");
        re.lastIndex = i;
        const m = re.exec(input);
        if (m && m.index === i) {
          parts.push(buf);
          buf = "";
          i += m[0].length - 1;
          continue;
        }
      }
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}

/** Parse the FROM clause into tables and JOINs. */
function parseFromClause(fromText: string): { tables: { name: string; alias?: string }[]; joins: { type: string; left: string; right: string; condition: string }[] } {
  const tables: { name: string; alias?: string }[] = [];
  const joins: { type: string; left: string; right: string; condition: string }[] = [];

  if (!fromText.trim()) return { tables, joins };

  // Tokenise into segments separated by JOIN keywords.
  const joinRegex = /\b(inner\s+join|left\s+(?:outer\s+)?join|right\s+(?:outer\s+)?join|full\s+(?:outer\s+)?join|cross\s+join|join)\b/gi;
  const segments: { type: string; text: string }[] = [];

  let lastIdx = 0;
  let firstType = "FROM";
  let m: RegExpExecArray | null;
  while ((m = joinRegex.exec(fromText)) !== null) {
    segments.push({ type: firstType, text: fromText.slice(lastIdx, m.index).trim() });
    firstType = m[1].toUpperCase().replace(/\s+/g, " ");
    lastIdx = m.index + m[0].length;
  }
  segments.push({ type: firstType, text: fromText.slice(lastIdx).trim() });

  // Each segment is: "<table> [AS] <alias>" optionally followed by "ON <condition>"
  // For the first segment, no ON. For subsequent ones, split ON.
  let lastAlias: string | undefined;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const onIdx = findKeyword(seg.text, "on");
    const tablePart = onIdx === -1 ? seg.text : seg.text.slice(0, onIdx).trim();
    const condition = onIdx === -1 ? "" : seg.text.slice(onIdx + 2).trim();

    const { name, alias } = parseTableRef(tablePart);
    if (name) {
      tables.push({ name, alias });
      if (i === 0) {
        lastAlias = alias ?? name;
      } else {
        joins.push({
          type: seg.type,
          left: lastAlias ?? "",
          right: alias ?? name,
          condition,
        });
        lastAlias = alias ?? name;
      }
    }
  }

  return { tables, joins };
}

function parseTableRef(text: string): { name: string; alias?: string } {
  // Matches: "users", "users u", "users AS u", "schema.users AS u"
  const m = text.trim().match(/^([\w.]+)(?:\s+(?:as\s+)?(\w+))?$/i);
  if (m) {
    return { name: m[1], alias: m[2] };
  }
  // Fallback: just take the first token.
  const first = text.trim().split(/\s+/)[0];
  return { name: first };
}

function findKeyword(text: string, kw: string): number {
  const re = new RegExp(`\\b${kw}\\b`, "i");
  const m = text.match(re);
  return m ? m.index ?? -1 : -1;
}

function referencesAlias(condition: string, table: { name: string; alias?: string }): boolean {
  const alias = table.alias?.toLowerCase();
  const name = table.name.toLowerCase();
  const c = condition.toLowerCase();
  if (alias && c.includes(`${alias}.`)) return true;
  if (c.includes(`${name}.`)) return true;
  // If no alias, also match bare column names (best effort).
  if (!alias) return true;
  return false;
}

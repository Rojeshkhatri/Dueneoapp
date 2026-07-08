"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Wand2, RotateCcw, Download } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, byteLength, downloadText } from "./_dev-helpers";

type Indent = "2" | "4" | "tab";
type KeywordCase = "upper" | "lower" | "preserve";

const SAMPLE = `select u.id, u.name, count(o.id) as order_count
from users u
left join orders o on o.user_id = u.id
where u.active = 1 and u.created_at > '2024-01-01'
group by u.id, u.name
having count(o.id) > 5
order by order_count desc
limit 10;`;

/* ────────────────────────────── Tokenizer ──────────────────────────────── */

interface Token {
  type:
    | "keyword"
    | "identifier"
    | "number"
    | "string"
    | "punct"
    | "comment_line"
    | "comment_block";
  value: string; // original case
}

const KEYWORDS = new Set([
  "SELECT", "DISTINCT", "FROM", "WHERE", "GROUP", "ORDER", "BY", "HAVING",
  "LIMIT", "OFFSET", "FETCH", "NEXT", "ROWS", "ONLY",
  "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "NATURAL", "OUTER", "ON", "USING",
  "UNION", "EXCEPT", "INTERSECT", "ALL",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "MERGE",
  "CREATE", "ALTER", "DROP", "TRUNCATE", "TABLE", "INDEX", "VIEW", "DATABASE", "SCHEMA",
  "SEQUENCE", "FUNCTION", "PROCEDURE", "TRIGGER",
  "WITH", "RETURNING", "AS",
  "CONSTRAINT", "PRIMARY", "FOREIGN", "KEY", "REFERENCES", "UNIQUE", "DEFAULT", "CHECK",
  "NOT", "NULL", "ADD", "COLUMN", "RENAME", "TO", "IF", "EXISTS", "CASCADE", "RESTRICT",
  "BEGIN", "COMMIT", "ROLLBACK", "START", "TRANSACTION", "SAVEPOINT",
  "AND", "OR", "IN", "LIKE", "BETWEEN", "IS", "ANY", "SOME",
  "CASE", "WHEN", "THEN", "ELSE", "END",
  "ASC", "DESC", "CAST", "CONVERT", "DISTINCT", "DO", "FOR", "OF", "PARTITION",
  "WINDOW", "OVER", "PARTITION", "PRECEDING", "FOLLOWING", "UNBOUNDED", "CURRENT", "ROW",
  "GRANT", "REVOKE", "PRIVILEGES", "PUBLIC",
]);

function tokenizeSql(input: string): Token[] {
  const tokens: Token[] = [];
  const n = input.length;
  let i = 0;
  while (i < n) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // -- line comment
    if (ch === "-" && input[i + 1] === "-") {
      let j = i;
      while (j < n && input[j] !== "\n") j++;
      tokens.push({ type: "comment_line", value: input.slice(i, j) });
      i = j;
      continue;
    }

    // /* block comment */
    if (ch === "/" && input[i + 1] === "*") {
      let j = i + 2;
      while (j < n && !(input[j] === "*" && input[j + 1] === "/")) j++;
      j = Math.min(n, j + 2);
      tokens.push({ type: "comment_block", value: input.slice(i, j) });
      i = j;
      continue;
    }

    // '...' string (with '' escape)
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (input[j] === "'" && input[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (input[j] === "'") {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: "string", value: input.slice(i, j) });
      i = j;
      continue;
    }

    // "..." identifier (with "" escape)
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (input[j] === '"' && input[j + 1] === '"') {
          j += 2;
          continue;
        }
        if (input[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: "string", value: input.slice(i, j) });
      i = j;
      continue;
    }

    // `...` identifier (MySQL)
    if (ch === "`") {
      let j = i + 1;
      while (j < n && input[j] !== "`") j++;
      j = Math.min(n, j + 1);
      tokens.push({ type: "string", value: input.slice(i, j) });
      i = j;
      continue;
    }

    // Number (with exponent and decimal)
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      let j = i;
      while (j < n) {
        const c = input[j];
        if (/[0-9.]/.test(c)) {
          j++;
          continue;
        }
        if (/[eE]/.test(c) && (/[0-9]/.test(input[j + 1] ?? "") || ((input[j + 1] === "+" || input[j + 1] === "-") && /[0-9]/.test(input[j + 2] ?? "")))) {
          j++;
          if (input[j] === "+" || input[j] === "-") j++;
          continue;
        }
        break;
      }
      tokens.push({ type: "number", value: input.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier / keyword
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(input[j])) j++;
      const word = input.slice(i, j);
      if (KEYWORDS.has(word.toUpperCase())) {
        tokens.push({ type: "keyword", value: word });
      } else {
        tokens.push({ type: "identifier", value: word });
      }
      i = j;
      continue;
    }

    // Multi-char operators
    if (ch === "<" || ch === ">" || ch === "!" || ch === "|" || ch === "&") {
      const two = input.slice(i, i + 2);
      if (["<=", ">=", "<>", "!=", "||", "&&", "<<", ">>"].includes(two)) {
        tokens.push({ type: "punct", value: two });
        i += 2;
        continue;
      }
    }

    // Single-char punctuation
    tokens.push({ type: "punct", value: ch });
    i++;
  }
  return tokens;
}

/* ──────────────────── Compound-keyword merging ─────────────────────────── */

function upper(t: Token): string {
  return t.value.toUpperCase();
}

function mergeCompoundKeywords(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    const next = tokens[i + 1];
    const next2 = tokens[i + 2];

    if (cur.type === "keyword" && next?.type === "keyword") {
      const cv = upper(cur);
      const nv = upper(next);

      if ((cv === "GROUP" || cv === "ORDER") && nv === "BY") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "UNION" && nv === "ALL") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "INSERT" && nv === "INTO") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "DELETE" && nv === "FROM") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "IS" && nv === "NOT" && next2?.type === "keyword" && upper(next2) === "NULL") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value} ${next2.value}` });
        i += 2;
        continue;
      }
      if (cv === "IS" && nv === "NULL") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "NOT" && (nv === "NULL" || nv === "IN" || nv === "LIKE" || nv === "BETWEEN" || nv === "EXISTS" || nv === "DISTINCT")) {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "PRIMARY" && nv === "KEY") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "FOREIGN" && nv === "KEY") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "START" && nv === "TRANSACTION") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      // JOIN variants: INNER JOIN, LEFT [OUTER] JOIN, etc.
      if (nv === "JOIN" && ["INNER", "LEFT", "RIGHT", "FULL", "CROSS", "NATURAL"].includes(cv)) {
        if (next2?.type === "keyword" && upper(next2) === "OUTER") {
          const next3 = tokens[i + 3];
          if (next3?.type === "keyword" && upper(next3) === "JOIN") {
            out.push({ type: "keyword", value: `${cur.value} ${next.value} ${next2.value} ${next3.value}` });
            i += 3;
            continue;
          }
        }
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "OUTER" && nv === "JOIN") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
      if (cv === "CROSS" && nv === "APPLY") {
        out.push({ type: "keyword", value: `${cur.value} ${next.value}` });
        i++;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}

/* ───────────────────────────── Formatter ───────────────────────────────── */

const MAJOR_CLAUSES = new Set([
  "SELECT", "DISTINCT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING",
  "LIMIT", "OFFSET", "FETCH",
  "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN",
  "CROSS JOIN", "NATURAL JOIN", "LEFT OUTER JOIN", "RIGHT OUTER JOIN",
  "FULL OUTER JOIN", "OUTER JOIN", "CROSS APPLY", "OUTER APPLY",
  "ON", "USING", "UNION", "UNION ALL", "EXCEPT", "INTERSECT",
  "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "DELETE",
  "CREATE", "ALTER", "DROP", "TRUNCATE", "TABLE", "WITH", "RETURNING",
  "INTO", "INDEX", "VIEW", "DATABASE", "SCHEMA", "SEQUENCE",
  "CONSTRAINT", "PRIMARY KEY", "FOREIGN KEY", "REFERENCES", "UNIQUE", "DEFAULT", "CHECK",
  "ADD", "COLUMN", "RENAME", "TO",
  "BEGIN", "COMMIT", "ROLLBACK", "START TRANSACTION", "SAVEPOINT",
  "WINDOW", "PARTITION BY", "GRANT", "REVOKE",
]);

const INDENT_CLAUSES = new Set(["AND", "OR"]);

function applyCase(value: string, mode: KeywordCase): string {
  if (mode === "upper") return value.toUpperCase();
  if (mode === "lower") return value.toLowerCase();
  return value;
}

function formatSql(
  source: string,
  indentStr: string,
  keywordCase: KeywordCase,
  newlinePerClause: boolean
): string {
  if (!source.trim()) return "";
  const tokens = mergeCompoundKeywords(tokenizeSql(source));
  const lines: string[] = [];
  let cur = "";
  let depth = 0;
  let parenDepth = 0;
  let prev: Token | null = null;
  /** Are we inside a parenthesised subquery (paren immediately followed by SELECT)? */
  const parenStack: boolean[] = [];

  const pad = () => indentStr.repeat(Math.max(0, depth));

  const flush = () => {
    lines.push(cur);
    cur = "";
  };

  const startsNewLine = (kw: string): boolean => {
    if (!newlinePerClause) return false;
    return MAJOR_CLAUSES.has(kw);
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const next = tokens[idx + 1];

    switch (t.type) {
      case "comment_line":
      case "comment_block": {
        if (cur.trim()) flush();
        cur = `${pad()}${t.value}`;
        flush();
        break;
      }
      case "keyword": {
        const kw = upper(t);
        if (startsNewLine(kw)) {
          if (cur.trim()) flush();
          // Major clauses start at column 0 (or current depth for nested).
          cur = `${pad()}${applyCase(t.value, keywordCase)}`;
        } else if (INDENT_CLAUSES.has(kw) && parenDepth === 0) {
          if (cur.trim()) flush();
          cur = `${pad()}${indentStr}${applyCase(t.value, keywordCase)}`;
        } else {
          // Inline keyword (e.g. AS, ASC, NOT IN inside expression).
          if (cur && !cur.endsWith(" ") && !cur.endsWith("(")) cur += " ";
          cur += applyCase(t.value, keywordCase);
        }
        break;
      }
      case "identifier":
      case "number":
      case "string": {
        if (cur && !cur.endsWith(" ") && !cur.endsWith("(") && !cur.endsWith(".")) {
          cur += " ";
        }
        cur += t.value;
        break;
      }
      case "punct": {
        const v = t.value;
        if (v === "(") {
          // Subquery if next non-whitespace token is SELECT/WITH.
          const isSubquery = next?.type === "keyword" && (upper(next) === "SELECT" || upper(next) === "WITH");
          if (cur && !cur.endsWith(" ")) cur += "";
          cur += "(";
          parenStack.push(isSubquery);
          if (isSubquery) {
            parenDepth++;
            flush();
            depth++;
          } else {
            parenDepth++;
          }
        } else if (v === ")") {
          parenDepth = Math.max(0, parenDepth - 1);
          const wasSubquery = parenStack.pop() ?? false;
          if (wasSubquery) {
            if (cur.trim()) flush();
            depth = Math.max(0, depth - 1);
            cur = `${pad()})`;
            parenDepth = Math.max(0, parenDepth - 1);
          } else {
            if (cur && !cur.endsWith(" ")) cur += "";
            cur += ")";
          }
        } else if (v === ",") {
          cur += ",";
          if (parenDepth === 0 && newlinePerClause) {
            // New line for SELECT list / column list / VALUES tuple at top level.
            flush();
            cur = `${pad()}${indentStr}`;
          }
        } else if (v === ";") {
          cur += ";";
          flush();
          depth = 0;
          parenDepth = 0;
        } else if (v === ".") {
          cur += ".";
        } else if (v === "*") {
          // `count(*)` style vs `SELECT *` — always pad-less attach.
          if (prev?.type === "punct" && (prev.value === "(" || prev.value === ".")) {
            cur += "*";
          } else {
            if (cur && !cur.endsWith(" ")) cur += " ";
            cur += "*";
          }
        } else {
          // Operators (=, <, >, +, -, etc.) — pad with spaces.
          if (cur && !cur.endsWith(" ")) cur += " ";
          cur += v;
          // Force space after — the next token will add it.
        }
        break;
      }
    }
    prev = t;
  }

  if (cur.trim()) flush();
  return lines.join("\n").replace(/\s+\n/g, "\n").trimEnd() + "\n";
}

/* ────────────────────────────── Component ──────────────────────────────── */

export function SQLFormatter({ tool }: { tool: ToolDefinition }) {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [indent, setIndent] = React.useState<Indent>("2");
  const [keywordCase, setKeywordCase] = React.useState<KeywordCase>("upper");
  const [newlinePerClause, setNewlinePerClause] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const indentStr = React.useMemo(
    () => (indent === "tab" ? "\t" : " ".repeat(Number(indent))),
    [indent]
  );

  const format = React.useCallback(() => {
    if (!input.trim()) {
      setError("Please paste some SQL first.");
      setOutput("");
      return;
    }
    if (byteLength(input) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      const out = formatSql(input, indentStr, keywordCase, newlinePerClause);
      setOutput(out);
      setError(null);
      toast.success("SQL formatted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to format SQL.");
      setOutput("");
      toast.error("Could not format SQL.");
    }
  }, [input, indentStr, keywordCase, newlinePerClause]);

  const reset = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setError(null);
    setOutput("");
  };

  const content: ToolContent = {
    intro:
      "Paste an ugly SQL query and get back a cleanly indented, properly capitalised version. The formatter is hand-rolled — no libraries — and recognises SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP and the rest of the standard vocabulary.",
    tool: (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sql-input">Input SQL</Label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              id="sql-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"select * from users where id = 1;"}
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Input SQL"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sql-output">Formatted SQL</Label>
              <div className="flex gap-1.5">
                <CopyButton value={output} size="sm" label="Copy" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  onClick={() => {
                    downloadText("query.sql", output, "application/sql");
                    toast.success("Downloaded query.sql");
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
            <Textarea
              id="sql-output"
              value={output}
              readOnly
              placeholder="Formatted SQL will appear here."
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
              aria-label="Formatted SQL"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-5 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label>Indent</Label>
            <RadioGroup
              value={indent}
              onValueChange={(v) => setIndent(v as Indent)}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="2" id="sql-2" /> 2 spaces
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="4" id="sql-4" /> 4 spaces
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="tab" id="sql-tab" /> Tab
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Keyword case</Label>
            <RadioGroup
              value={keywordCase}
              onValueChange={(v) => setKeywordCase(v as KeywordCase)}
              className="flex flex-row gap-4"
            >
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="upper" id="sql-up" /> UPPER
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="lower" id="sql-lo" /> lower
              </Label>
              <Label className="flex items-center gap-1.5 text-sm font-normal">
                <RadioGroupItem value="preserve" id="sql-pr" /> Preserve
              </Label>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="sql-newline"
              checked={newlinePerClause}
              onCheckedChange={setNewlinePerClause}
            />
            <Label htmlFor="sql-newline" className="text-sm font-normal">
              Newline after each clause
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={format}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Format SQL
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
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
        title: "Paste your SQL",
        description:
          "Drop a raw query — single line, copy-pasted from a log, generated by an ORM — into the left-hand editor.",
      },
      {
        title: "Pick indent and case",
        description:
          "Choose 2 or 4 spaces (or tab) for indentation and whether keywords should be UPPERCASED, lowercased, or kept as-typed.",
      },
      {
        title: "Toggle newline-per-clause",
        description:
          "When on (default), each major clause (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT) starts on its own line. Turn it off for a denser one-line-per-statement layout.",
      },
      {
        title: "Format and copy",
        description:
          "Click Format SQL. The beautified query appears on the right; copy it or download as query.sql.",
      },
    ],
    useCases: [
      "Make an ORM-generated query readable before pasting it into a code review.",
      "Standardise keyword casing and indentation across a team's SQL files.",
      "Re-indent a minified query extracted from a log or a DB statement trace.",
      "Teach SQL by example — feed a messy query in, show the clean version out.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The formatter is structural, not semantic — it does not validate your SQL or catch syntax errors.</li>
        <li>
          Dialect-specific syntax (PL/pgSQL <code>$$blocks$$</code>, T-SQL <code>@@IDENTITY</code>,
          MySQL <code>:=</code> assignment) is tokenised but not specially pretty-printed.
        </li>
        <li>Inputs larger than 1 MB are rejected to keep the tab responsive.</li>
        <li>
          Subquery indentation is heuristic: parentheses immediately followed by <code>SELECT</code> or
          <code> WITH</code> are treated as subqueries; function-call parentheses stay inline.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Which SQL dialects are supported?",
        a: "The formatter works on standard SQL syntax shared by MySQL, PostgreSQL, SQLite, SQL Server and Oracle. It tokenises keywords, identifiers, strings, numbers and comments; dialect-specific procedural syntax (PL/pgSQL blocks, T-SQL batches) is left intact but not deeply understood.",
      },
      {
        q: "Is my SQL sent to a server?",
        a: "No. Tokenisation and formatting run entirely in your browser. Nothing is transmitted.",
      },
      {
        q: "Will it validate my SQL?",
        a: "No — it formats only. A query with a syntax error will still be formatted (the formatter is structural), so always run it through your database to catch errors.",
      },
      {
        q: "Why are some keywords not on their own line?",
        a: "Only major clauses (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, etc.) trigger newlines. Inline keywords like AS, ASC, DESC, NOT IN stay on the same line for readability. AND/OR get their own indented line when at the top level.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

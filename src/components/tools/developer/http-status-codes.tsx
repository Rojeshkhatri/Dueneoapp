"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { Search } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

interface StatusCode {
  code: number;
  name: string;
  description: string;
  cls: 1 | 2 | 3 | 4 | 5;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx — Informational
  { code: 100, name: "Continue", description: "The client should proceed with the request. Typically sent after an Expect: 100-continue header.", cls: 1 },
  { code: 101, name: "Switching Protocols", description: "The server is switching protocols as requested by the client via the Upgrade header (e.g. to WebSocket).", cls: 1 },
  { code: 102, name: "Processing", description: "WebDAV: the server has received the request and is still processing it, to prevent the client from timing out.", cls: 1 },
  { code: 103, name: "Early Hints", description: "Used to return some response headers before the final response message, allowing the browser to preload resources.", cls: 1 },

  // 2xx — Success
  { code: 200, name: "OK", description: "The request succeeded. The meaning depends on the HTTP method (resource returned, action completed).", cls: 2 },
  { code: 201, name: "Created", description: "The request succeeded and a new resource was created. Typically the response to POST or PUT.", cls: 2 },
  { code: 202, name: "Accepted", description: "The request has been accepted for processing but is not complete. Used for asynchronous operations.", cls: 2 },
  { code: 203, name: "Non-Authoritative Information", description: "The returned meta-information is from a local or third-party copy, not the origin server.", cls: 2 },
  { code: 204, name: "No Content", description: "The request succeeded but there is no content to send back. Common for PUT, PATCH, DELETE.", cls: 2 },
  { code: 205, name: "Reset Content", description: "Like 204, but the client should reset the document view (clear form fields, etc.).", cls: 2 },
  { code: 206, name: "Partial Content", description: "The server is delivering only part of the resource, in response to a Range header. Used by media players and download managers.", cls: 2 },
  { code: 207, name: "Multi-Status", description: "WebDAV: conveys information about multiple resources in a single XML response.", cls: 2 },
  { code: 208, name: "Already Reported", description: "WebDAV: used in a 207 response to avoid enumerating the same member twice inside a collection.", cls: 2 },
  { code: 226, name: "IM Used", description: "The server has fulfilled a GET request using instance manipulation (delta encoding).", cls: 2 },

  // 3xx — Redirection
  { code: 300, name: "Multiple Choices", description: "The request has more than one possible response. The client should choose one of them.", cls: 3 },
  { code: 301, name: "Moved Permanently", description: "The URL of the requested resource has changed permanently. The new URL is in the response.", cls: 3 },
  { code: 302, name: "Found", description: "The URI of requested resource has been changed temporarily. Browsers often rewrite POST→GET.", cls: 3 },
  { code: 303, name: "See Other", description: "The server is redirecting the user agent to a different resource via GET. Use after a PUT or POST.", cls: 3 },
  { code: 304, name: "Not Modified", description: "Indicates the cached version is still up-to-date, in response to a conditional request (If-Modified-Since, If-None-Match).", cls: 3 },
  { code: 305, name: "Use Proxy", description: "Deprecated. The requested resource must be accessed through the proxy given by the Location field.", cls: 3 },
  { code: 307, name: "Temporary Redirect", description: "Like 302 but the HTTP method is preserved. The client should re-issue the same method to the new URL.", cls: 3 },
  { code: 308, name: "Permanent Redirect", description: "Like 301 but the HTTP method is preserved. The resource is now permanently at the new URL.", cls: 3 },

  // 4xx — Client errors
  { code: 400, name: "Bad Request", description: "The server cannot process the request due to a client error (malformed syntax, invalid framing).", cls: 4 },
  { code: 401, name: "Unauthorized", description: "The client must authenticate itself. Sent with a WWW-Authenticate header describing how.", cls: 4 },
  { code: 402, name: "Payment Required", description: "Reserved for future use. Sometimes used by APIs for paywalls or quota exhaustion.", cls: 4 },
  { code: 403, name: "Forbidden", description: "The client is authenticated but does not have access rights to the resource.", cls: 4 },
  { code: 404, name: "Not Found", description: "The server cannot find the requested resource. The most common client error.", cls: 4 },
  { code: 405, name: "Method Not Allowed", description: "The HTTP method is known by the server but not supported by the target resource (e.g. POST to a read-only resource).", cls: 4 },
  { code: 406, name: "Not Acceptable", description: "No content matches the Accept header's media types, languages or encodings.", cls: 4 },
  { code: 407, name: "Proxy Authentication Required", description: "Like 401 but the client must authenticate with a proxy first.", cls: 4 },
  { code: 408, name: "Request Timeout", description: "The server closed the connection because the client did not send the request in time.", cls: 4 },
  { code: 409, name: "Conflict", description: "The request conflicts with the current state of the server (e.g. editing a stale resource, duplicate unique key).", cls: 4 },
  { code: 410, name: "Gone", description: "The resource is gone permanently. Like 404 but explicit — used for deleted resources.", cls: 4 },
  { code: 411, name: "Length Required", description: "The server requires a Content-Length header but the client didn't send one.", cls: 4 },
  { code: 412, name: "Precondition Failed", description: "A precondition in the request (If-Match, If-Unmodified-Since) evaluated to false.", cls: 4 },
  { code: 413, name: "Payload Too Large", description: "The request body is larger than the server is willing or able to process.", cls: 4 },
  { code: 414, name: "URI Too Long", description: "The requested URI is longer than the server can interpret (often from too many query params).", cls: 4 },
  { code: 415, name: "Unsupported Media Type", description: "The request's Content-Type is not supported by the server or resource.", cls: 4 },
  { code: 416, name: "Range Not Satisfiable", description: "The Range header can't be fulfilled — the requested byte range is outside the resource's size.", cls: 4 },
  { code: 417, name: "Expectation Failed", description: "The Expect header can't be met by the server.", cls: 4 },
  { code: 418, name: "I'm a Teapot", description: "RFC 2324 (HTCPCP). Returned by teapots requested to brew coffee. Used as an Easter egg by many servers.", cls: 4 },
  { code: 421, name: "Misdirected Request", description: "HTTP/2: the request was directed at a server that cannot produce a response (wrong SNI/Host).", cls: 4 },
  { code: 422, name: "Unprocessable Entity", description: "WebDAV: the request is well-formed but semantically invalid (e.g. validation failure).", cls: 4 },
  { code: 423, name: "Locked", description: "WebDAV: the resource being accessed is locked.", cls: 4 },
  { code: 424, name: "Failed Dependency", description: "WebDAV: the request failed because of a failed previous request in a batch.", cls: 4 },
  { code: 425, name: "Too Early", description: "The server is unwilling to process a request that might be replayed (0-RTT TLS).", cls: 4 },
  { code: 426, name: "Upgrade Required", description: "The client must upgrade to a different protocol (specified in the Upgrade header).", cls: 4 },
  { code: 428, name: "Precondition Required", description: "The origin server requires the request to be conditional (If-Match, If-None-Match).", cls: 4 },
  { code: 429, name: "Too Many Requests", description: "The client has sent too many requests in a given time (rate limiting). Sent with Retry-After.", cls: 4 },
  { code: 431, name: "Request Header Fields Too Large", description: "The server refuses to process because the header fields are too large.", cls: 4 },
  { code: 451, name: "Unavailable For Legal Reasons", description: "The resource is unavailable due to legal demands (censorship, DMCA, government order).", cls: 4 },

  // 5xx — Server errors
  { code: 500, name: "Internal Server Error", description: "The server encountered an unexpected condition that prevented it from fulfilling the request.", cls: 5 },
  { code: 501, name: "Not Implemented", description: "The server doesn't support the HTTP method used (e.g. PUT, PATCH on a basic server).", cls: 5 },
  { code: 502, name: "Bad Gateway", description: "The server, while acting as a gateway or proxy, got an invalid response from an upstream server.", cls: 5 },
  { code: 503, name: "Service Unavailable", description: "The server is not ready to handle the request — typically maintenance or overload. Often temporary.", cls: 5 },
  { code: 504, name: "Gateway Timeout", description: "The server, acting as a gateway, didn't receive a response from the upstream server in time.", cls: 5 },
  { code: 505, name: "HTTP Version Not Supported", description: "The server doesn't support the HTTP protocol version used in the request.", cls: 5 },
  { code: 506, name: "Variant Also Negotiates", description: "Transparent content negotiation: the chosen variant is itself a negotiable resource (configuration error).", cls: 5 },
  { code: 507, name: "Insufficient Storage", description: "WebDAV: the server can't store the representation needed to complete the request.", cls: 5 },
  { code: 508, name: "Loop Detected", description: "WebDAV: the server detected an infinite loop while processing the request.", cls: 5 },
  { code: 510, name: "Not Extended", description: "The server needs further extensions to the request to fulfil it.", cls: 5 },
  { code: 511, name: "Network Authentication Required", description: "The client must authenticate to gain network access (captive portals).", cls: 5 },
];

interface ClassMeta {
  id: 1 | 2 | 3 | 4 | 5;
  label: string;
  short: string;
  description: string;
  color: string;
}

const CLASS_META: ClassMeta[] = [
  { id: 1, label: "1xx Informational", short: "1xx", description: "Informational — the request was received, continuing processing.", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { id: 2, label: "2xx Success", short: "2xx", description: "Success — the request was successfully received, understood and accepted.", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { id: 3, label: "3xx Redirection", short: "3xx", description: "Redirection — further action is needed to complete the request.", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { id: 4, label: "4xx Client Errors", short: "4xx", description: "Client error — the request contains bad syntax or cannot be fulfilled.", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  { id: 5, label: "5xx Server Errors", short: "5xx", description: "Server error — the server failed to fulfil a valid request.", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
];

function classMeta(cls: number): ClassMeta {
  return CLASS_META[cls - 1] ?? CLASS_META[0];
}

export function HTTPStatusCodes({ tool }: { tool: ToolDefinition }) {
  const [query, setQuery] = React.useState("");
  const [activeClass, setActiveClass] = React.useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return STATUS_CODES.filter((c) => {
      if (activeClass !== 0 && c.cls !== activeClass) return false;
      if (!q) return true;
      return (
        String(c.code).includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [query, activeClass]);

  const copyCode = (code: number, name: string) => {
    navigator.clipboard
      .writeText(String(code))
      .then(() => toast.success(`Copied ${code} (${name})`))
      .catch(() => toast.error("Copy failed — please copy manually."));
  };

  const grouped = React.useMemo(() => {
    const map = new Map<number, StatusCode[]>();
    for (const c of filtered) {
      const arr = map.get(c.cls) ?? [];
      arr.push(c);
      map.set(c.cls, arr);
    }
    return map;
  }, [filtered]);

  const content: ToolContent = {
    intro:
      "A complete, searchable reference for HTTP status codes across the 1xx–5xx classes. Click any code to copy it. Filter by class or search by code, name or meaning — works offline, entirely in your browser.",
    tool: (
      <div className="space-y-5">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="http-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="http-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code (404), name (Not Found) or meaning…"
              className="pl-9"
              aria-label="Search HTTP status codes"
            />
          </div>
        </div>

        {/* Class filter tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status code class filter">
          <button
            type="button"
            role="tab"
            aria-selected={activeClass === 0}
            onClick={() => setActiveClass(0)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (activeClass === 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted")
            }
          >
            All ({STATUS_CODES.length})
          </button>
          {CLASS_META.map((m) => {
            const count = STATUS_CODES.filter((c) => c.cls === m.id).length;
            const active = activeClass === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveClass(m.id)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted")
                }
              >
                {m.short} ({count})
              </button>
            );
          })}
        </div>

        {/* Results — grouped by class */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No status codes match <span className="font-mono">{query}</span>.
          </div>
        ) : (
          <div className="space-y-6">
            {CLASS_META.map((m) => {
              const codes = grouped.get(m.id);
              if (!codes || codes.length === 0) return null;
              return (
                <section key={m.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold " +
                        m.color
                      }
                    >
                      {m.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {codes.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => copyCode(c.code, c.name)}
                        title="Click to copy"
                        className="group flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <span
                          className={
                            "inline-flex h-10 flex-none items-center justify-center rounded-md border px-2 font-mono text-sm font-bold " +
                            m.color
                          }
                        >
                          {c.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{c.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {c.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {STATUS_CODES.length} codes · Click any card to copy the numeric code.
        </p>
      </div>
    ),
    howTo: [
      {
        title: "Search by code, name or meaning",
        description:
          "Type into the search box to filter — try \"404\", \"Not Found\", \"rate\", or \"gateway\". Matches update as you type.",
      },
      {
        title: "Filter by class",
        description:
          "Click the 1xx / 2xx / 3xx / 4xx / 5xx tabs to narrow the list to one class. Click All to reset.",
      },
      {
        title: "Click a code to copy",
        description:
          "Click any status code card to copy the numeric code (e.g. 404) to your clipboard. A toast confirms the copy.",
      },
      {
        title: "Bookmark the page",
        description:
          "This is a static reference — no network calls, no analytics on your queries. Bookmark it for offline use.",
      },
    ],
    useCases: [
      "Quickly look up the meaning of an unfamiliar status code in an API response or server log.",
      "Decide which 4xx code to return from your own API (400 vs 422 vs 409 can be subtle).",
      "Teach HTTP fundamentals — the 5-class structure, with examples per class.",
      "Diagnose a flaky integration by searching the description text for keywords like 'gateway' or 'rate'.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The list covers all IANA-registered and widely-implemented status codes (RFCs 7231,
          7233, 7234, 6585, 7538, 7725, 8297, 9110, 9111 plus WebDAV). Cloud-vendor extensions
          (e.g. AWS 5xx variants, Cloudflare 52x) are not included.
        </li>
        <li>
          Non-standard codes (e.g. Twitter's 420 Enhance Your Calm, Laravel's 419) are omitted
          — search for them in the vendor's own docs.
        </li>
        <li>Reason phrases are conventional, not protocol-mandated — servers may use different wording.</li>
      </ul>
    ),
    faq: [
      {
        q: "Are these codes the official standard?",
        a: "Yes — every code in the list is registered with IANA or defined in an RFC. The list covers 1xx–5xx including WebDAV (207, 208, 226, 422–424, 507–508) and recent additions (103, 421, 425, 451).",
      },
      {
        q: "Is my search sent to a server?",
        a: "No. The entire reference table is embedded in the page and filtered in your browser. Nothing is transmitted.",
      },
      {
        q: "What's the difference between 401 and 403?",
        a: "401 Unauthorized means the client has not authenticated at all. 403 Forbidden means the client is authenticated (or authentication won't help) but isn't allowed to access the resource. Send 401 with WWW-Authenticate to prompt for credentials; send 403 when the identity is known but lacks permission.",
      },
      {
        q: "Why are some 4xx codes (418, 451) included?",
        a: "418 I'm a Teapot is from RFC 2324 (HTCPCP) and is widely implemented as an Easter egg. 451 Unavailable For Legal Reasons is RFC 7725 and is used for censorship/DMCA takedowns. Both are real, registered status codes.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

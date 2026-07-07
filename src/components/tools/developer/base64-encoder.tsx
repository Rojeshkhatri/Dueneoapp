"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import { RotateCcw, Wand2, AlertTriangle, Download } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_INPUT_BYTES,
  INPUT_TOO_LARGE_MSG,
  byteLength,
  formatBytes,
  encodeBase64,
  bytesToBase64,
  downloadText,
  readFileAsDataURL,
} from "./_dev-helpers";

export function Base64Encoder({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [urlSafe, setUrlSafe] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  const encodeText = React.useCallback(() => {
    if (!text) {
      setError("Please type or paste some text first.");
      setOutput("");
      return;
    }
    if (byteLength(text) > MAX_INPUT_BYTES) {
      setError(INPUT_TOO_LARGE_MSG);
      setOutput("");
      return;
    }
    try {
      // First encode to standard base64, then optionally transform.
      const standard = encodeBase64(text);
      const finalOut = urlSafe
        ? standard.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        : standard;
      setOutput(finalOut);
      setError(null);
      toast.success("Text encoded to Base64.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encoding failed.");
      setOutput("");
    }
  }, [text, urlSafe]);

  const onFiles = async (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (f.size > MAX_INPUT_BYTES) {
      toast.error(INPUT_TOO_LARGE_MSG);
      return;
    }
    setFile(f);
    setError(null);
    try {
      const url = await readFileAsDataURL(f);
      // For URL-safe, rebuild the data URL with the URL-safe alphabet.
      if (urlSafe) {
        const idx = url.indexOf(",");
        if (idx > -1) {
          const head = url.slice(0, idx + 1);
          const body = url.slice(idx + 1).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          setDataUrl(head + body);
        } else {
          setDataUrl(url);
        }
      } else {
        setDataUrl(url);
      }
      toast.success(`Encoded ${f.name} (${formatBytes(f.size)}) to a data URL.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "File read failed.");
      setDataUrl(null);
    }
  };

  const reset = () => {
    setText("");
    setOutput("");
    setError(null);
    setFile(null);
    setDataUrl(null);
    setUrlSafe(false);
  };

  // Re-derive URL-safe output when the toggle changes.
  React.useEffect(() => {
    if (!output) return;
    const standard = encodeBase64(text);
    setOutput(
      urlSafe
        ? standard.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        : standard
    );
    // `text` and `output` are intentionally omitted — this effect only
    // re-derives the URL-safe form when the toggle changes.
  }, [urlSafe]);

  const content: ToolContent = {
    intro:
      "Encode text or any file to Base64 right in your browser. Toggle URL-safe mode for JWTs, data URLs and other contexts where + and / are not allowed. Files are turned into a ready-to-use data URL via FileReader — nothing is uploaded.",
    tool: (
      <div className="space-y-5">
        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">Text → Base64</TabsTrigger>
            <TabsTrigger value="file">File → Data URL</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="be-input">Input text</Label>
                <Textarea
                  id="be-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Hello, world!"
                  className="min-h-[260px] font-mono text-xs"
                  spellCheck={false}
                  aria-label="Input text"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="be-output">Base64 output</Label>
                  <CopyButton value={output} size="sm" />
                </div>
                <Textarea
                  id="be-output"
                  value={output}
                  readOnly
                  placeholder="SGVsbG8sIHdvcmxkIQ=="
                  className="min-h-[260px] font-mono text-xs"
                  spellCheck={false}
                  aria-label="Base64 output"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Switch id="be-url" checked={urlSafe} onCheckedChange={setUrlSafe} />
                <Label htmlFor="be-url" className="text-sm font-normal">
                  URL-safe alphabet (<code>-</code> / <code>_</code>, no padding)
                </Label>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
                <Button onClick={encodeText}>
                  <Wand2 className="mr-1.5 h-4 w-4" /> Encode
                </Button>
              </div>
            </div>
            {error && <ErrorBox message={error} />}
            {output && (
              <p className="text-xs text-muted-foreground">
                Output size: {formatBytes(byteLength(output))} ·{" "}
                {output.length} characters
              </p>
            )}
          </TabsContent>

          <TabsContent value="file" className="space-y-4 pt-4">
            {!file ? (
              <Dropzone
                onFiles={onFiles}
                hint="Any file up to 1 MB · returns a data URL"
                maxSizeLabel="1 MB"
                label="Drop a file here or click to browse"
              />
            ) : (
              <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <FileChip name={file.name} size={file.size} onRemove={reset} />
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="be-file-url"
                    checked={urlSafe}
                    onCheckedChange={(v) => {
                      setUrlSafe(v);
                      // Re-derive on toggle.
                      if (!dataUrl) return;
                      const idx = dataUrl.indexOf(",");
                      if (idx === -1) return;
                      const head = dataUrl.slice(0, idx + 1);
                      let body = dataUrl.slice(idx + 1);
                      // Reverse previous transform, then re-apply.
                      body = body.replace(/-/g, "+").replace(/_/g, "/");
                      // Re-pad before decoding-atob if needed for output display.
                      if (v) {
                        body = body.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
                      }
                      setDataUrl(head + body);
                    }}
                  />
                  <Label htmlFor="be-file-url" className="text-sm font-normal">
                    URL-safe alphabet
                  </Label>
                </div>
                {dataUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="be-dataurl">Data URL</Label>
                      <div className="flex gap-1.5">
                        <CopyButton value={dataUrl} size="sm" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            downloadText(
                              `${file.name}.data-url.txt`,
                              dataUrl,
                              "text/plain"
                            );
                            toast.success("Saved data URL as text");
                          }}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="be-dataurl"
                      value={dataUrl}
                      readOnly
                      className="min-h-[180px] font-mono text-xs"
                      spellCheck={false}
                      aria-label="Data URL output"
                    />
                  </div>
                )}
              </div>
            )}
            {error && <ErrorBox message={error} />}
          </TabsContent>
        </Tabs>
      </div>
    ),
    howTo: [
      {
        title: "Choose a mode",
        description:
          "Use Text → Base64 for strings, or File → Data URL to encode a binary file as a self-contained data: URL.",
      },
      {
        title: "Toggle URL-safe mode if needed",
        description:
          "URL-safe Base64 swaps + and / for - and _ and removes padding. Use it for JWTs, query strings and tokens.",
      },
      {
        title: "Encode",
        description:
          "Click Encode (text tab) or drop a file (file tab). The output is generated locally with the browser's FileReader and btoa.",
      },
      {
        title: "Copy or save",
        description:
          "Use Copy to put the result on the clipboard, or Save to download it as a text file.",
      },
    ],
    useCases: [
      "Encode credentials or API tokens before storing them in a URL.",
      "Generate a data URL to inline a small image or font in HTML or CSS.",
      "Produce URL-safe Base64 for a JWT payload or signed token.",
      "Quickly inspect the Base64 representation of a string for debugging.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Files larger than 1 MB are rejected to keep memory usage safe.</li>
        <li>The text encoder uses UTF-8 — non-ASCII characters are encoded correctly.</li>
        <li>Base64 is not encryption. Treat it as an encoding, not a security boundary.</li>
      </ul>
    ),
    faq: [
      {
        q: "What is URL-safe Base64?",
        a: "Standard Base64 uses + and /, which are problematic in URLs. URL-safe Base64 replaces them with - and _ and drops the = padding so the result can be embedded in a URL path or query string without escaping.",
      },
      {
        q: "Is Base64 encrypted?",
        a: "No. Base64 is a reversible encoding. Anyone with the output can decode it back to the original. Use it for transport, not secrecy.",
      },
      {
        q: "Why does the output look slightly bigger than the input?",
        a: "Each Base64 character represents 6 bits, so 3 input bytes become 4 output characters — roughly a 33% size increase.",
      },
      {
        q: "Can I encode binary files?",
        a: "Yes. Switch to the File → Data URL tab, drop a file, and you get a data: URL you can embed directly in HTML or CSS.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <div className="space-y-1">
          <p className="font-medium">Encoding problem</p>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}

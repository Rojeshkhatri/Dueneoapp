"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dueneo/copy-button";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Images,
  RotateCcw,
  Eye,
  User,
  Contrast,
  Sparkles,
  Trophy,
  ArrowLeftRight,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { SectionLabel, StatCard } from "./_content-helpers";

type RatingKey = "readability" | "face" | "contrast" | "curiosity";

interface RatingMeta {
  key: RatingKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const RATINGS: RatingMeta[] = [
  {
    key: "readability",
    label: "Text readability",
    description: "Can a viewer read every word at thumbnail size on a phone?",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    key: "face",
    label: "Face visibility",
    description: "Is there a clear, expressive face making eye contact?",
    icon: <User className="h-4 w-4" />,
  },
  {
    key: "contrast",
    label: "Contrast",
    description: "Do text and subject pop against the background?",
    icon: <Contrast className="h-4 w-4" />,
  },
  {
    key: "curiosity",
    label: "Curiosity",
    description: "Does it make you want to click to find out more?",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

type Side = "A" | "B";

type RatingState = Record<Side, Record<RatingKey, number>>;

interface LoadedImage {
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function ThumbnailAbComparer({ tool }: { tool: ToolDefinition }) {
  const [imgA, setImgA] = React.useState<LoadedImage | null>(null);
  const [imgB, setImgB] = React.useState<LoadedImage | null>(null);
  const [dark, setDark] = React.useState<boolean>(false);
  const [previewSize, setPreviewSize] = React.useState<
    "small" | "medium" | "full"
  >("full");
  const [ratings, setRatings] = React.useState<RatingState>({
    A: { readability: 5, face: 5, contrast: 5, curiosity: 5 },
    B: { readability: 5, face: 5, contrast: 5, curiosity: 5 },
  });

  const loadImage = (
    file: File,
    cb: (img: LoadedImage) => void,
  ) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image is larger than 10 MB. Please use a smaller file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      cb({
        url,
        name: file.name,
        size: file.size,
        width: probe.naturalWidth,
        height: probe.naturalHeight,
      });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not load image. Try a different file.");
    };
    probe.src = url;
  };

  const onUploadA = (files: { file: File }[]) => {
    if (files[0]?.file) loadImage(files[0].file, (img) => setImgA(img));
  };
  const onUploadB = (files: { file: File }[]) => {
    if (files[0]?.file) loadImage(files[0].file, (img) => setImgB(img));
  };

  const setRating = (side: Side, key: RatingKey, value: number) =>
    setRatings((r) => ({
      ...r,
      [side]: { ...r[side], [key]: value },
    }));

  const totals = React.useMemo(() => {
    const sum = (s: Side) =>
      RATINGS.reduce((acc, r) => acc + ratings[s][r.key], 0);
    const max = RATINGS.length * 10;
    const a = sum("A");
    const b = sum("B");
    return { a, b, max, aPct: (a / max) * 100, bPct: (b / max) * 100 };
  }, [ratings]);

  const winner: Side | "tie" =
    totals.a === totals.b ? "tie" : totals.a > totals.b ? "A" : "B";

  const reset = () => {
    if (imgA) URL.revokeObjectURL(imgA.url);
    if (imgB) URL.revokeObjectURL(imgB.url);
    setImgA(null);
    setImgB(null);
    setRatings({
      A: { readability: 5, face: 5, contrast: 5, curiosity: 5 },
      B: { readability: 5, face: 5, contrast: 5, curiosity: 5 },
    });
    toast.info("Cleared.");
  };

  // Cleanup object URLs on unmount. We keep refs in sync via an effect so the
  // teardown closure can always revoke whatever URL is currently loaded.
  const imgARef = React.useRef<LoadedImage | null>(null);
  const imgBRef = React.useRef<LoadedImage | null>(null);
  React.useEffect(() => {
    imgARef.current = imgA;
  }, [imgA]);
  React.useEffect(() => {
    imgBRef.current = imgB;
  }, [imgB]);
  React.useEffect(() => {
    return () => {
      if (imgARef.current) URL.revokeObjectURL(imgARef.current.url);
      if (imgBRef.current) URL.revokeObjectURL(imgBRef.current.url);
    };
  }, []);

  const sizeClass = {
    full: "w-full",
    medium: "w-[320px]",
    small: "w-[180px]",
  }[previewSize];

  const toolBody = (
    <div className="space-y-5">
      {/* Upload row */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                A
              </span>
              Thumbnail A
            </span>
          </SectionLabel>
          {!imgA ? (
            <Dropzone
              accept="image/*"
              onFiles={onUploadA}
              label="Drop image A or click to browse"
              hint="JPG, PNG or WebP — processed locally."
              maxSizeLabel="10 MB"
            />
          ) : (
            <div className="space-y-2">
              <FileChip
                name={imgA.name}
                size={imgA.size}
                onRemove={() => {
                  URL.revokeObjectURL(imgA.url);
                  setImgA(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {imgA.width}×{imgA.height}px
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                B
              </span>
              Thumbnail B
            </span>
          </SectionLabel>
          {!imgB ? (
            <Dropzone
              accept="image/*"
              onFiles={onUploadB}
              label="Drop image B or click to browse"
              hint="JPG, PNG or WebP — processed locally."
              maxSizeLabel="10 MB"
            />
          ) : (
            <div className="space-y-2">
              <FileChip
                name={imgB.name}
                size={imgB.size}
                onRemove={() => {
                  URL.revokeObjectURL(imgB.url);
                  setImgB(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {imgB.width}×{imgB.height}px
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <SectionLabel>Preview</SectionLabel>
        <Tabs
          value={previewSize}
          onValueChange={(v) =>
            setPreviewSize(v as "small" | "medium" | "full")
          }
        >
          <TabsList>
            <TabsTrigger value="full" className="text-xs">
              Full
            </TabsTrigger>
            <TabsTrigger value="medium" className="text-xs">
              Medium
            </TabsTrigger>
            <TabsTrigger value="small" className="text-xs">
              Small
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDark((d) => !d)}
            aria-pressed={dark}
          >
            {dark ? (
              <>
                <Sun className="mr-1.5 h-3.5 w-3.5" /> Light BG
              </>
            ) : (
              <>
                <Moon className="mr-1.5 h-3.5 w-3.5" /> Dark BG
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Side-by-side preview */}
      <div
        className={`rounded-xl border p-4 transition-colors sm:p-6 ${
          dark
            ? "bg-neutral-950 border-neutral-800"
            : "bg-neutral-100 border-neutral-200"
        }`}
      >
        <div className="flex flex-wrap items-start justify-center gap-6">
          {(["A", "B"] as const).map((side) => {
            const img = side === "A" ? imgA : imgB;
            return (
              <div key={side} className={`flex flex-col items-center ${sizeClass}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      dark
                        ? "bg-white text-neutral-900"
                        : "bg-neutral-900 text-white"
                    }`}
                  >
                    {side}
                  </span>
                  <span
                    className={`text-xs ${
                      dark ? "text-neutral-400" : "text-neutral-600"
                    }`}
                  >
                    {img ? img.name : "(no image)"}
                  </span>
                </div>
                <div
                  className={`relative aspect-video w-full overflow-hidden rounded-md border ${
                    dark ? "border-neutral-800" : "border-neutral-300"
                  }`}
                >
                  {img ? (
                    <img
                      src={img.url}
                      alt={`Thumbnail ${side}: ${img.name}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center text-xs ${
                        dark ? "text-neutral-600" : "text-neutral-400"
                      }`}
                    >
                      No image
                    </div>
                  )}
                </div>
                <div
                  className={`mt-1 text-[10px] ${
                    dark ? "text-neutral-500" : "text-neutral-500"
                  }`}
                >
                  YouTube thumbnail 16:9 (1280×720)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scorecard */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Images className="h-3.5 w-3.5" /> Scorecard
            </span>
          </SectionLabel>
          <span className="text-xs text-muted-foreground">
            Rate each criterion 0–10. Winner updates live.
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs">
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Criterion
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Thumbnail A
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Thumbnail B
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Edge
                </th>
              </tr>
            </thead>
            <tbody>
              {RATINGS.map((r) => {
                const a = ratings.A[r.key];
                const b = ratings.B[r.key];
                const edge =
                  a === b ? "tie" : a > b ? "A" : "B";
                return (
                  <tr key={r.key} className="border-t">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">{r.icon}</span>
                        <div>
                          <div className="font-medium">{r.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[a]}
                          onValueChange={(v) =>
                            setRating("A", r.key, v[0] ?? 0)
                          }
                          min={0}
                          max={10}
                          step={1}
                          className="w-32"
                          aria-label={`A — ${r.label}`}
                        />
                        <span className="w-8 font-mono text-sm font-medium tabular-nums">
                          {a}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[b]}
                          onValueChange={(v) =>
                            setRating("B", r.key, v[0] ?? 0)
                          }
                          min={0}
                          max={10}
                          step={1}
                          className="w-32"
                          aria-label={`B — ${r.label}`}
                        />
                        <span className="w-8 font-mono text-sm font-medium tabular-nums">
                          {b}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <EdgeBadge side={edge} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td className="px-3 py-3 font-semibold">Total</td>
                <td className="px-3 py-3 font-mono font-bold tabular-nums">
                  {totals.a} / {totals.max}
                </td>
                <td className="px-3 py-3 font-mono font-bold tabular-nums">
                  {totals.b} / {totals.max}
                </td>
                <td className="px-3 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Thumbnail A"
            value={`${Math.round(totals.aPct)}%`}
            icon={
              <Trophy
                className={
                  winner === "A"
                    ? "h-3.5 w-3.5 text-emerald-500"
                    : "h-3.5 w-3.5 text-muted-foreground"
                }
              />
            }
            tone={winner === "A" ? "emerald" : "default"}
            hint={`${totals.a} / ${totals.max} pts`}
          />
          <StatCard
            label="Thumbnail B"
            value={`${Math.round(totals.bPct)}%`}
            icon={
              <Trophy
                className={
                  winner === "B"
                    ? "h-3.5 w-3.5 text-emerald-500"
                    : "h-3.5 w-3.5 text-muted-foreground"
                }
              />
            }
            tone={winner === "B" ? "emerald" : "default"}
            hint={`${totals.b} / ${totals.max} pts`}
          />
          <StatCard
            label="Verdict"
            value={
              winner === "tie" ? "Tie" : `Thumbnail ${winner}`
            }
            icon={
              winner === "tie" ? (
                <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Trophy className="h-3.5 w-3.5 text-emerald-500" />
              )
            }
            tone={winner === "tie" ? "amber" : "emerald"}
            hint={
              winner === "tie"
                ? "Tied scores — refine your ratings."
                : `By ${Math.abs(totals.a - totals.b)} pts`
            }
          />
        </div>
      </div>
    </div>
  );

  const content: ToolContent = {
    intro:
      "Upload two thumbnail images and compare them side by side at full, medium, and small sizes on either a dark or light background. Rate each on text readability, face visibility, contrast, and curiosity — the scorecard updates live and picks a winner.",
    tool: toolBody,
    howTo: [
      {
        title: "Upload both thumbnails",
        description:
          "Drag each image into its upload zone (or click to browse). Files are loaded as object URLs and never leave your browser.",
      },
      {
        title: "Toggle preview size and background",
        description:
          "Switch between Full, Medium, and Small to see how each thumbnail holds up at phone sizes. Toggle the dark background to test legibility on dark mode.",
      },
      {
        title: "Rate each criterion 0–10",
        description:
          "Move the sliders for text readability, face visibility, contrast, and curiosity. Use the small-size preview to judge readability honestly.",
      },
      {
        title: "Read the verdict",
        description:
          "Totals update live and the winning thumbnail is highlighted. The Edge column shows which side won each criterion.",
      },
    ],
    useCases: [
      "Pick the higher-CTR variant before running a YouTube thumbnail test.",
      "Audit your existing thumbnail against a redesigned version.",
      "Teach a team member what makes a thumbnail readable at small sizes.",
      "Compare thumbnail treatments across light and dark mode.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The scorecard is a structured self-review — the scores are your own
          ratings, not an automated ML prediction. Use it to force a
          deliberate comparison, not as ground truth.
        </li>
        <li>
          The 16:9 aspect ratio is hard-coded to match YouTube thumbnails
          (1280×720). Instagram reels, TikTok and Shorts use 9:16 — use a
          different tool for those.
        </li>
        <li>
          Images are loaded as <code>blob:</code> URLs and never uploaded.
          Closing the tab revokes the URLs and frees the memory.
        </li>
        <li>
          Maximum image size is 10 MB per file. Larger files slow down the
          preview and can crash low-memory devices.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How should I rate readability honestly?",
        a: "Switch the preview to Small (180px wide). That's roughly the size of a thumbnail in YouTube search results on a phone. If you can read every word at that size, give it 8–10. If you squint, 5–7. If words blur together, under 5.",
      },
      {
        q: "What counts as a high 'face visibility' score?",
        a: "A clear, expressive face that takes up at least a third of the frame and is making eye contact with the camera. No face or a tiny background face is 0–3. A clear medium-shot face is 7–10.",
      },
      {
        q: "Can I compare more than two thumbnails?",
        a: "Not in this tool. For 3+ variants, run successive A/B comparisons and note the winners. A future version may add multi-variant support.",
      },
      {
        q: "Are my images uploaded anywhere?",
        a: "No. Files are read with URL.createObjectURL() and stay in your browser's memory. Closing the tab or clicking Reset revokes the URLs and discards the data.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

function EdgeBadge({ side }: { side: "A" | "B" | "tie" }) {
  if (side === "tie") {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
        Tie
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
      {side}
    </span>
  );
}

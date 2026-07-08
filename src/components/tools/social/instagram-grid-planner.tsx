"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Download,
  GripVertical,
  LayoutGrid,
  RotateCcw,
  X,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { CopyButton } from "@/components/dueneo/copy-button";
import { uid } from "./_social-helpers";

interface GridItem {
  id: string;
  file: File;
  url: string;
  caption: string;
}

export function InstagramGridPlanner({ tool }: { tool: ToolDefinition }) {
  const [items, setItems] = React.useState<GridItem[]>([]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dropTarget, setDropTarget] = React.useState<number | null>(null);

  // Cleanup blob URLs on unmount.
  const itemsRef = React.useRef<GridItem[]>([]);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  React.useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);

  const onFiles = (files: { file: File }[]) => {
    const newItems: GridItem[] = [];
    for (const f of files) {
      if (!f.file.type.startsWith("image/")) {
        toast.error(`${f.file.name} is not an image.`);
        continue;
      }
      newItems.push({
        id: uid("ig"),
        file: f.file,
        url: URL.createObjectURL(f.file),
        caption: "",
      });
    }
    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      toast.success(`Added ${newItems.length} image${newItems.length === 1 ? "" : "s"} to the grid.`);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const removeAt = (idx: number) => {
    setItems((prev) => {
      const item = prev[idx];
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updateCaption = (idx: number, caption: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, caption } : it))
    );
  };

  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
  };

  // Drag handlers
  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {
      /* some browsers throw if setData is called with an empty string */
    }
  };
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== idx) {
      setDropTarget(idx);
    }
  };
  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      move(dragIndex, idx);
    }
    setDragIndex(null);
    setDropTarget(null);
  };
  const onDragEnd = () => {
    setDragIndex(null);
    setDropTarget(null);
  };

  const arrangementJson = React.useMemo(() => {
    const arrangement = items.map((it, i) => ({
      position: i + 1,
      row: Math.floor(i / 3) + 1,
      column: (i % 3) + 1,
      filename: it.file.name,
      sizeBytes: it.file.size,
      type: it.file.type,
      caption: it.caption || undefined,
    }));
    return JSON.stringify(
      {
        tool: "Dueneo Instagram Grid Planner",
        exportedAt: new Date().toISOString(),
        count: items.length,
        grid: { columns: 3, rows: Math.ceil(items.length / 3) },
        arrangement,
      },
      null,
      2
    );
  }, [items]);

  const downloadJson = () => {
    if (items.length === 0) {
      toast.error("Upload at least one image first.");
      return;
    }
    const blob = new Blob([arrangementJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "instagram-grid-arrangement.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Grid arrangement exported as JSON.");
  };

  const rows = Math.ceil(items.length / 3);

  const toolBody = (
    <div className="space-y-5">
      <Dropzone
        accept="image/*"
        multiple
        onFiles={onFiles}
        hint="JPG, PNG, WebP · select multiple files to add them all"
        label="Drop images here or click to browse"
        maxSizeLabel="50 MB per image"
      />

      {items.length > 0 && (
        <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">
                Your grid · {items.length} image{items.length === 1 ? "" : "s"} · {rows} row{rows === 1 ? "" : "s"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Drag tiles to reorder, or use the arrow buttons. The first 9 tiles form your top three rows.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
            </Button>
          </div>

          {/* Editable reorderable grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver(idx)}
                onDrop={onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`group relative aspect-square overflow-hidden rounded-md border bg-muted ${
                  dragIndex === idx ? "opacity-40" : ""
                } ${dropTarget === idx && dragIndex !== idx ? "ring-2 ring-primary" : ""}`}
                aria-label={`Grid position ${idx + 1}`}
              >
                <img
                  src={item.url}
                  alt={item.caption || `Grid position ${idx + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-1.5">
                  <span className="pointer-events-auto inline-flex cursor-grab items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white active:cursor-grabbing">
                    <GripVertical className="h-3 w-3" /> #{idx + 1}
                  </span>
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    R{Math.floor(idx / 3) + 1}·C{(idx % 3) + 1}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex translate-y-1 items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6"
                      onClick={() => move(idx, idx - 1)}
                      disabled={idx === 0}
                      aria-label={`Move image ${idx + 1} up`}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6"
                      onClick={() => move(idx, idx + 1)}
                      disabled={idx === items.length - 1}
                      aria-label={`Move image ${idx + 1} down`}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6"
                    onClick={() => removeAt(idx)}
                    aria-label={`Remove image ${idx + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Caption editor for each tile */}
          <details className="rounded-lg border bg-background p-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Add a caption per tile (optional, exported in JSON)
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {items.map((item, idx) => (
                <div key={`cap-${item.id}`} className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                    {idx + 1}
                  </span>
                  <img
                    src={item.url}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded object-cover"
                  />
                  <Input
                    value={item.caption}
                    onChange={(e) => updateCaption(idx, e.target.value)}
                    placeholder={`Caption for position ${idx + 1}`}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Profile preview */}
      {items.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-background p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Profile preview</h3>
            <span className="text-xs text-muted-foreground">
              How your grid will look to visitors
            </span>
          </div>
          <div className="rounded-lg border bg-white p-3 dark:bg-zinc-950">
            <div className="mx-auto max-w-md">
              <div className="flex items-center gap-4 px-1 pb-3">
                <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-bold dark:bg-zinc-950">
                    You
                  </div>
                </div>
                <div className="flex flex-1 items-start justify-around text-center">
                  <div>
                    <div className="text-sm font-bold">{items.length}</div>
                    <div className="text-[10px] text-muted-foreground">posts</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">0</div>
                    <div className="text-[10px] text-muted-foreground">followers</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">0</div>
                    <div className="text-[10px] text-muted-foreground">following</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {items.map((item, idx) => (
                  <div key={`prev-${item.id}`} className="relative aspect-square overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.caption || `Grid position ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON export */}
      {items.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Arrangement JSON</h3>
            <div className="flex gap-2">
              <CopyButton value={arrangementJson} size="sm" />
              <Button size="sm" onClick={downloadJson}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download JSON
              </Button>
            </div>
          </div>
          <pre className="max-h-72 overflow-auto rounded-md border bg-background p-3 text-[11px] leading-relaxed">
            <code>{arrangementJson}</code>
          </pre>
          <p className="text-xs text-muted-foreground">
            Use this JSON to remember your grid arrangement, hand it to a teammate, or feed
            it into a scheduling tool. Filenames, sizes, MIME types, positions and captions
            are all included.
          </p>
        </div>
      )}
    </div>
  );

  const content: ToolContent = {
    intro:
      "Plan your Instagram grid layout before posting. Upload as many images as you like, drag tiles to reorder them, and preview the result as your followers will see it on your profile. Export the final arrangement as JSON so you can recreate the order in your scheduler.",
    tool: toolBody,
    howTo: [
      {
        title: "Upload your images",
        description:
          "Drag multiple image files onto the dropzone or click to browse. JPG, PNG and WebP are accepted up to 50 MB each. Add as many as you need.",
      },
      {
        title: "Reorder the tiles",
        description:
          "Drag any tile to a new position — the grid updates instantly. For precision, hover a tile and use the arrow buttons to nudge it left/right/up/down.",
      },
      {
        title: "Preview the profile view",
        description:
          "The profile preview shows how your grid will appear to Instagram visitors, with the standard 3-column layout and a sample profile header.",
      },
      {
        title: "Export the arrangement",
        description:
          "Copy or download the arrangement as JSON. It records each image’s filename, size, position, row, column and optional caption so you can reproduce the layout later.",
      },
    ],
    useCases: [
      "Plan a product launch grid so colours and compositions flow from tile to tile.",
      "Preview how a 9-image mood board will look before you actually publish.",
      "Hand off a grid arrangement to a teammate or social media manager as JSON.",
      "Experiment with checkerboard, column, or diagonal patterns before committing.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Images are loaded into your browser only — nothing is uploaded to a server.</li>
        <li>The 3-column grid reflects Instagram’s current mobile and web layout, but the platform occasionally tweaks spacing and aspect ratios.</li>
        <li>The exported JSON does not contain the images themselves — only filenames, sizes and ordering. Keep your source files alongside the JSON.</li>
        <li>Captions you add here are for your own planning reference; they are not the captions you would post on Instagram (those have a 2,200 character limit each).</li>
      </ul>
    ),
    faq: [
      {
        q: "Is this connected to my Instagram account?",
        a: "No. The planner runs entirely in your browser and does not connect to Instagram or any other service. It’s a planning aid only.",
      },
      {
        q: "Can I rearrange tiles without using the mouse?",
        a: "Yes. Hover any tile and use the up/down arrow buttons that appear. Each click moves the tile by one position.",
      },
      {
        q: "What does the JSON export contain?",
        a: "For each image: position number, row, column, original filename, byte size, MIME type, and any caption you added. The whole document is a single object with a grid summary and an arrangement array.",
      },
      {
        q: "Why are my images shown as squares?",
        a: "Instagram crops profile grid tiles to 1:1 squares. The planner mirrors that crop so what you see matches what your followers will see.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

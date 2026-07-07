"use client";

import * as React from "react";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropzoneFile {
  id: string;
  file: File;
}

export function Dropzone({
  accept,
  multiple = false,
  onFiles,
  hint,
  label = "Drop file here or click to browse",
  className,
  maxSizeLabel,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: DropzoneFile[]) => void;
  hint?: string;
  label?: string;
  className?: string;
  maxSizeLabel?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const accepted = Array.from(fileList).filter((f) => {
      if (!accept) return true;
      const types = accept.split(",").map((t) => t.trim());
      const ext = `.${f.name.split(".").pop()?.toLowerCase()}`;
      return types.some((t) => {
        if (t.endsWith("/*")) return f.type.startsWith(t.slice(0, -1));
        if (t.startsWith(".")) return ext === t.toLowerCase();
        return f.type === t;
      });
    });
    if (accepted.length === 0) return;
    const wrapped: DropzoneFile[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
    }));
    onFiles(multiple ? wrapped : [wrapped[0]]);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        dragging && "border-primary bg-primary/5",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
        <UploadCloud className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {maxSizeLabel && (
        <p className="mt-1 text-xs text-muted-foreground">Max size: {maxSizeLabel}</p>
      )}
    </div>
  );
}

export function FileChip({
  name,
  size,
  onRemove,
}: {
  name: string;
  size?: number;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
      <span className="truncate max-w-[180px]">{name}</span>
      {size !== undefined && (
        <span className="text-muted-foreground">{formatBytes(size)}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-muted"
          aria-label={`Remove ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Shared helpers for image tools. Browser-only, no backend.
 *
 * All functions are safe to call from client components.
 */

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50 MB safety cap

/** Format a byte count as a friendly string (B/KB/MB). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes < 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k))
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Load a File into an HTMLImageElement. Rejects on error or unsupported type. */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(
        new Error(
          `File is too large (${formatBytes(file.size)}). The maximum supported size is ${formatBytes(MAX_IMAGE_BYTES)}.`
        )
      );
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load this image. It may be corrupted or unsupported."));
    };
    img.src = url;
  });
}

/** Load a string URL (data: or blob:) into an HTMLImageElement. */
export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = src;
  });
}

/** Trigger a browser download of a Blob with the given filename. */
export function downloadBlob(blob: Blob | null, filename: string): boolean {
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  requestAnimationFrame(() => {
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  });
  return true;
}

/** Build a safe filename by stripping the existing extension and appending a new one. */
export function replaceExtension(filename: string, newExt: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "");
  return `${base}.${newExt.replace(/^\.+/, "")}`;
}

/** Get a canvas 2D context, throwing a friendly error if unavailable. */
export function getCanvas2D(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available in this browser.");
  return ctx;
}

/** Convert a hex color (#rrggbb or #rrggbbaa) to an "rgba(...)" string for canvas APIs. */
export function hexToRgba(hex: string, alpha = 1): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = h.length >= 8 ? (parseInt(h.slice(6, 8), 16) || 255) / 255 : alpha;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "middle-left", label: "Middle left" },
  { value: "middle-center", label: "Middle center" },
  { value: "middle-right", label: "Middle right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

/**
 * 9-position grid for watermark / overlay placement.
 * Returns [x, y] in canvas coordinates for the top-left of the bounding box
 * with the given width/height and padding.
 */
export function positionFor(
  position: Position,
  canvasW: number,
  canvasH: number,
  boxW: number,
  boxH: number,
  padding: number
): [number, number] {
  let x: number;
  let y: number;
  switch (position) {
    case "top-left":
      x = padding; y = padding; break;
    case "top-center":
      x = (canvasW - boxW) / 2; y = padding; break;
    case "top-right":
      x = canvasW - boxW - padding; y = padding; break;
    case "middle-left":
      x = padding; y = (canvasH - boxH) / 2; break;
    case "middle-center":
      x = (canvasW - boxW) / 2; y = (canvasH - boxH) / 2; break;
    case "middle-right":
      x = canvasW - boxW - padding; y = (canvasH - boxH) / 2; break;
    case "bottom-left":
      x = padding; y = canvasH - boxH - padding; break;
    case "bottom-center":
      x = (canvasW - boxW) / 2; y = canvasH - boxH - padding; break;
    case "bottom-right":
      x = canvasW - boxW - padding; y = canvasH - boxH - padding; break;
    default:
      x = padding; y = padding;
  }
  return [x, y];
}

/** Read a File into a data URL. */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** Read a File into a text string. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

/** Small presentational component for an image preview tile with optional caption. */
export function PreviewTile({
  src,
  label,
  caption,
  className,
}: {
  src: string | null;
  label?: string;
  caption?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      )}
      <div className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(hsl(0_0%_90%)_0_25%,transparent_0_50%)] bg-[length:20px_20px] dark:bg-[repeating-conic-gradient(hsl(0_0%_22%)_0_25%,transparent_0_50%)]">
        {src ? (
          <img
            src={src}
            alt={label ?? "Preview"}
            className="max-h-[360px] w-auto max-w-full object-contain"
          />
        ) : (
          <span className="px-6 py-10 text-center text-xs text-muted-foreground">
            Nothing to preview yet.
          </span>
        )}
      </div>
      {caption && <p className="mt-2 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

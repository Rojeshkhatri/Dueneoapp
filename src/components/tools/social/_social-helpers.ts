/**
 * Shared helpers for social media tools. Browser-only, no backend.
 *
 * Pure functions only (no JSX) so this can stay a `.ts` module.
 */

/** Maximum size for an uploaded image (50 MB). */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

/** Format a byte count as a friendly B/KB/MB string. */
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

/** Get a canvas 2D context, throwing a friendly error if unavailable. */
export function getCanvas2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available in this browser.");
  return ctx;
}

/** Trigger a browser download of a Blob with the given filename. */
export function downloadBlob(blob: Blob | null, filename: string): boolean {
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Load a File into an HTMLImageElement. */
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

/** Convert a hex color (#rrggbb) to an "rgba(r,g,b,a)" string. */
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
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Pick a readable text colour (black or white) for a given hex background.
 * Uses the W3C relative-luminance contrast formula.
 */
export function readableTextOn(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = (parseInt(h.slice(0, 2), 16) || 0) / 255;
  const g = (parseInt(h.slice(2, 4), 16) || 0) / 255;
  const b = (parseInt(h.slice(4, 6), 16) || 0) / 255;
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  return L > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Wrap a long string into lines no longer than `maxWidth` (canvas units),
 * breaking on word boundaries. Honours explicit newlines.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (para.trim() === "") {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = ctx.measureText(test).width;
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Generate a stable-ish unique id without crypto (good enough for UI keys). */
export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Draw multi-line text onto a canvas context using `wrapText`. Returns the
 * y-coordinate after the last line so callers can stack additional content.
 */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "left"
): number {
  const lines = wrapText(ctx, text, maxWidth);
  ctx.textAlign = align;
  let cy = y;
  for (const line of lines) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

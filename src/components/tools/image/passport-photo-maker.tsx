"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Dropzone, FileChip } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, RotateCcw, User, Info } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  MAX_IMAGE_BYTES,
  PreviewTile,
  formatBytes,
  getCanvas2D,
  loadImageFromFile,
  replaceExtension,
} from "./_image-helpers";

interface CountryPreset {
  id: string;
  name: string;
  /** Document width in millimetres. */
  widthMm: number;
  /** Document height in millimetres. */
  heightMm: number;
  /** Notes shown to the user (head size guidance, background colour, etc.). */
  notes: string;
}

const DPI = 300;

/** 1 inch = 25.4 mm. */
const MM_PER_INCH = 25.4;

const PRESETS: CountryPreset[] = [
  { id: "us", name: "United States (2×2 in)", widthMm: 51, heightMm: 51, notes: "2×2 inch square. White background. Head size 25–35 mm from chin to crown." },
  { id: "uk", name: "United Kingdom (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Light grey or cream background. Head 29–34 mm from chin to crown." },
  { id: "eu", name: "European Union (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Light, neutral background. Head 32–36 mm from chin to crown." },
  { id: "india", name: "India (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. White background. Head 70–80% of the photo." },
  { id: "australia", name: "Australia (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Plain light background. Head 32–36 mm from chin to crown." },
  { id: "canada", name: "Canada (50×70 mm)", widthMm: 50, heightMm: 70, notes: "50×70 mm. White or light grey background. Head 31–36 mm from chin to crown." },
  { id: "china", name: "China (33×48 mm)", widthMm: 33, heightMm: 48, notes: "33×48 mm. White background. Head 28–33 mm from chin to crown." },
  { id: "japan", name: "Japan (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Plain light background. Head 34 mm (±2 mm) from chin to crown." },
  { id: "singapore", name: "Singapore (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. White background. Head 25–35 mm from chin to crown." },
  { id: "philippines", name: "Philippines (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Plain white background. Head 70–80% of the photo." },
  { id: "germany", name: "Germany (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Light grey background. Head 32–36 mm from chin to crown." },
  { id: "russia", name: "Russia (35×45 mm)", widthMm: 35, heightMm: 45, notes: "35×45 mm. Light, uniform background. Head 30–32 mm from chin to crown." },
];

interface LoadedPhoto {
  file: File;
  url: string;
  img: HTMLImageElement;
}

/**
 * Passport Photo Maker — pick a country preset, upload a portrait, then pan
 * and zoom the photo inside an aspect-correct frame with a head-position
 * guide overlay. Output is rendered on a Canvas at 300 DPI for print.
 */
export function PassportPhotoMaker({ tool }: { tool: ToolDefinition }) {
  const [presetId, setPresetId] = React.useState<string>("us");
  const [photo, setPhoto] = React.useState<LoadedPhoto | null>(null);
  const [panX, setPanX] = React.useState<number>(0.5); // 0..1 (centre)
  const [panY, setPanY] = React.useState<number>(0.4); // 0..1 (slightly above centre to favour face)
  const [zoom, setZoom] = React.useState<number>(1);   // 1 = cover; >1 = zoom in further
  const [bgWhite, setBgWhite] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const processGen = React.useRef(0);

  const preset = PRESETS.find((p) => p.id === presetId)!;

  React.useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const onFiles = (files: { file: File }[]) => {
    const f = files[0]?.file;
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error(
        `File is too large (${formatBytes(f.size)}). The maximum supported size is ${formatBytes(MAX_IMAGE_BYTES)}.`
      );
      return;
    }
    setBusy(true);
    loadImageFromFile(f)
      .then((img) => {
        if (photo) URL.revokeObjectURL(photo.url);
        setPhoto({ file: f, url: URL.createObjectURL(f), img });
        // Reset crop defaults — slight upward bias suits most portraits.
        setPanX(0.5);
        setPanY(0.4);
        setZoom(1);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load the image.");
      })
      .finally(() => setBusy(false));
  };

  const reset = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setPanX(0.5);
    setPanY(0.4);
    setZoom(1);
  };

  const outputPixels = React.useMemo(
    () => ({
      w: Math.round((preset.widthMm / MM_PER_INCH) * DPI),
      h: Math.round((preset.heightMm / MM_PER_INCH) * DPI),
    }),
    [preset]
  );

  // Auto-render passport preview when settings change (debounced).
  React.useEffect(() => {
    if (!photo) return;
    const gen = ++processGen.current;
    const timer = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = outputPixels.w;
      canvas.height = outputPixels.h;
      const ctx = getCanvas2D(canvas);
      if (bgWhite) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      drawCoverCropped(ctx, photo.img, canvas.width, canvas.height, panX, panY, zoom);
      canvas.toBlob((blob) => {
        if (processGen.current !== gen) return;
        if (!blob) return;
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(blob));
      }, "image/png");
    }, 300);
    return () => clearTimeout(timer);
  }, [photo, presetId, panX, panY, zoom, bgWhite, outputPixels]);

  // Revoke outputUrl on cleanup.
  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const download = async () => {
    if (!photo) {
      toast.error("Upload a photo first.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = outputPixels.w;
    canvas.height = outputPixels.h;
    const ctx = getCanvas2D(canvas);
    if (bgWhite) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawCoverCropped(ctx, photo.img, canvas.width, canvas.height, panX, panY, zoom);
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Could not render the photo.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${preset.id}-passport.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
      toast.success(
        `Passport photo downloaded (${canvas.width}×${canvas.height}px @ 300 DPI).`
      );
    }, "image/png");
  };

  const content: ToolContent = {
    intro:
      "Crop a portrait to the exact passport or visa dimensions for 12 countries. Position your head with the pan/zoom controls and the on-screen guide, then download a 300 DPI PNG ready for printing. Everything runs in your browser — your photo is never uploaded.",
    tool: (
      <div className="space-y-5">
        {!photo ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Country / format</Label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {preset.widthMm} × {preset.heightMm} mm · prints at {outputPixels.w} × {outputPixels.h}px (300 DPI)
              </p>
            </div>
            <Dropzone
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onFiles={onFiles}
              hint="JPG, PNG, WebP or BMP · up to 50 MB · a clear front-facing portrait works best"
              maxSizeLabel="50 MB"
              label="Drop your photo here or click to browse"
            />
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                Tip: For best results, use the <strong>Background Remover</strong> tool first to
                cut out your subject, then place them on a white background here using the
                "Fill white background" option below.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FileChip name={photo.file.name} size={photo.file.size} onRemove={reset} />
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Choose another photo
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewTile src={photo.url} label="Original" />
              <PreviewTile
                src={outputUrl}
                label="Passport photo"
                caption={`${preset.widthMm} × ${preset.heightMm} mm · ${outputPixels.w} × ${outputPixels.h}px @ 300 DPI`}
              />
            </div>

            {/* Head alignment guide */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Crop & align</p>
              <PassportCropPreview
                photoUrl={photo.url}
                aspect={outputPixels.w / outputPixels.h}
                panX={panX}
                panY={panY}
                zoom={zoom}
                bgWhite={bgWhite}
              />
            </div>

            {/* Controls */}
            <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Country / format</Label>
                  <Select value={presetId} onValueChange={setPresetId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESETS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    {preset.notes}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pp-panx">Horizontal position</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(panX * 100)}%</span>
                  </div>
                  <input
                    id="pp-panx"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={panX}
                    onChange={(e) => setPanX(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pp-pany">Vertical position</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(panY * 100)}%</span>
                  </div>
                  <input
                    id="pp-pany"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={panY}
                    onChange={(e) => setPanY(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pp-zoom">Zoom</Label>
                    <span className="text-xs text-muted-foreground">{zoom.toFixed(2)}×</span>
                  </div>
                  <input
                    id="pp-zoom"
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <Label htmlFor="pp-bg" className="text-sm">Fill white background</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Paints behind the photo. Use after removing the original background.
                    </p>
                  </div>
                  <Switch id="pp-bg" checked={bgWhite} onCheckedChange={setBgWhite} />
                </div>
            </div>

            <Button onClick={download} disabled={busy} className="w-full sm:w-auto">
              <Download className="mr-1.5 h-4 w-4" />
              Download passport photo
            </Button>
          </div>
        )}
      </div>
    ),
    howTo: [
      {
        title: "Pick a country preset",
        description:
          "Choose your destination country — the tool loads the correct width, height and head-size guidance for that document.",
      },
      {
        title: "Upload a portrait",
        description:
          "Drop a front-facing photo with good lighting. JPG, PNG, WebP or BMP up to 50MB are supported.",
      },
      {
        title: "Align with the head guide",
        description:
          "Use the horizontal, vertical and zoom sliders to position your face inside the oval guide. The crop frame matches the exact aspect ratio of the target document.",
      },
      {
        title: "Download at 300 DPI",
        description:
          "Click Download to render at full print resolution (300 DPI). The PNG is ready to print at home or at a photo kiosk.",
      },
    ],
    useCases: [
      "Prepare a passport or visa photo for a government application.",
      "Generate ID photos for student cards, gym memberships or transit passes.",
      "Re-crop an existing portrait to the correct dimensions before printing.",
      "Quickly produce a visa photo for a last-minute trip application.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Dueneo cannot verify whether your photo meets every official rule (lighting,
          expression, head angle, glasses). Always check the issuing authority's guidelines.
        </li>
        <li>The head-position guide is approximate — adjust the sliders until your face fits naturally.</li>
        <li>
          The white-background fill paints behind the photo but does not remove the existing
          background. Use the Background Remover tool first to cut out your subject.
        </li>
        <li>Output is a PNG at 300 DPI. Some authorities require JPG — convert it with the Format Converter.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my photo uploaded?",
        a: "No. The photo is loaded into a Canvas in your browser, cropped, and saved as a PNG locally. Nothing is transmitted to a server.",
      },
      {
        q: "What does 300 DPI mean?",
        a: "300 dots per inch is the standard print resolution. At 300 DPI, a 35×45 mm photo is rendered as a 413×531 pixel PNG — sharp enough for any photo printer.",
      },
      {
        q: "How do I get a white background?",
        a: "First use Dueneo's Background Remover to cut out your subject, then save the transparent PNG and upload it here. Enable 'Fill white background' so the canvas paints white behind the cut-out.",
      },
      {
        q: "My country isn't in the list — what do I do?",
        a: "Most countries use 35×45 mm or 2×2 inch (51×51 mm) — pick the closest preset. The crop and 300 DPI output are the same; only the printed dimensions change.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

// ───────────────────────── Crop preview component ───────────────────────────

function PassportCropPreview({
  photoUrl,
  aspect,
  panX,
  panY,
  zoom,
  bgWhite,
}: {
  photoUrl: string;
  aspect: number;
  panX: number;
  panY: number;
  zoom: number;
  bgWhite: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [imgReady, setImgReady] = React.useState(false);

  // Preload the photo once.
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgReady(true);
    };
    img.onerror = () => setImgReady(false);
    img.src = photoUrl;
  }, [photoUrl]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = getCanvas2D(canvas);
    // Render preview at a reasonable size (max 360 wide).
    const previewMaxW = 360;
    const w = previewMaxW;
    const h = Math.round(previewMaxW / aspect);
    canvas.width = w;
    canvas.height = h;
    if (bgWhite) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
      // Subtle neutral backdrop so transparency is visible.
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(0, 0, w, h);
    }
    drawCoverCropped(ctx, img, w, h, panX, panY, zoom);

    // Head-position guide: an oval centred on the upper third of the frame.
    ctx.save();
    ctx.strokeStyle = "rgba(37, 99, 235, 0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    const cx = w / 2;
    const cy = h * 0.42;
    const rx = w * 0.28;
    const ry = h * 0.34;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Centre crosshair.
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
    ctx.restore();
  }, [imgReady, aspect, panX, panY, zoom, bgWhite]);

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/40">
      <canvas ref={canvasRef} className="block h-auto w-full max-w-full" />
      <div className="flex items-center gap-2 border-t bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        Align your face inside the blue oval guide.
      </div>
    </div>
  );
}

/**
 * Draw an image "cover" style into a destination rectangle, with optional
 * pan (0..1, 0.5 = centre) and zoom (1 = exactly cover, >1 = zoom in).
 */
function drawCoverCropped(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLImageElement,
  destW: number,
  destH: number,
  panX: number,
  panY: number,
  zoom: number
) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) return;
  // Compute the base "cover" scale (image fills the destination exactly).
  const coverScale = Math.max(destW / srcW, destH / srcH) * zoom;
  const drawW = srcW * coverScale;
  const drawH = srcH * coverScale;
  // The image is drawn such that the pan-point of the SOURCE aligns with
  // the pan-point of the DESTINATION. pan=0.5 means centre → centre.
  const destCenterX = destW * panX;
  const destCenterY = destH * panY;
  const drawX = destCenterX - drawW / 2;
  const drawY = destCenterY - drawH / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

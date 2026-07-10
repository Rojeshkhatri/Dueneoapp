"use client";

import * as React from "react";
import QRCode from "qrcode";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, RotateCcw, Wand2 } from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

type ErrorLevel = "L" | "M" | "Q" | "H";

type ContentType = "text" | "url" | "email" | "phone" | "sms" | "wifi";

interface WifiEncryption {
  value: "WPA" | "WEP" | "nopass";
  label: string;
}

const WIFI_ENCRYPTIONS: WifiEncryption[] = [
  { value: "WPA", label: "WPA/WPA2" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "None (open)" },
];

function escapeWifi(value: string): string {
  // RFC 4122-style escape for QR Wi-Fi config: \ ; , : "
  return value.replace(/([\\;,":])/g, "\\$1");
}

function buildContent(type: ContentType, fields: Record<string, string>): string {
  switch (type) {
    case "text":
      return fields.text ?? "";
    case "url": {
      const url = (fields.url ?? "").trim();
      if (!url) return "";
      // Auto-prepend scheme if missing so the QR opens a browser.
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return `https://${url}`;
      return url;
    }
    case "email": {
      const to = (fields.email ?? "").trim();
      const subject = (fields.subject ?? "").trim();
      const body = (fields.body ?? "").trim();
      if (!to) return "";
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (body) params.set("body", body);
      const qs = params.toString();
      return `mailto:${to}${qs ? `?${qs}` : ""}`;
    }
    case "phone":
      return (fields.phone ?? "").trim() ? `tel:${(fields.phone ?? "").trim()}` : "";
    case "sms": {
      const num = (fields.smsNumber ?? "").trim();
      if (!num) return "";
      const body = (fields.smsBody ?? "").trim();
      return body ? `SMSTO:${num}:${body}` : `sms:${num}`;
    }
    case "wifi": {
      const ssid = (fields.ssid ?? "").trim();
      if (!ssid) return "";
      const enc = fields.encryption ?? "WPA";
      const password = enc === "nopass" ? "" : (fields.wifiPassword ?? "");
      const hidden = fields.hidden === "true" ? "true" : "false";
      return `WIFI:T:${enc};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden};;`;
    }
    default:
      return "";
  }
}

interface QrState {
  dataUrl: string | null;
  error: string | null;
  busy: boolean;
}

export function QrCodeGenerator({ tool }: { tool: ToolDefinition }) {
  const [type, setType] = React.useState<ContentType>("text");
  const [fields, setFields] = React.useState<Record<string, string>>({ text: "https://dueneo.app" });
  const [size, setSize] = React.useState(320);
  const [margin, setMargin] = React.useState(4);
  const [errorLevel, setErrorLevel] = React.useState<ErrorLevel>("M");
  const [fg, setFg] = React.useState("#0f172a");
  const [bg, setBg] = React.useState("#ffffff");
  const [state, setState] = React.useState<QrState>({ dataUrl: null, error: null, busy: false });

  const content = React.useMemo(() => buildContent(type, fields), [type, fields]);

  const generate = React.useCallback(async () => {
    if (!content) {
      setState({ dataUrl: null, error: "Please enter some content first.", busy: false });
      return;
    }
    setState({ dataUrl: null, error: null, busy: true });
    try {
      const dataUrl = await QRCode.toDataURL(content, {
        errorCorrectionLevel: errorLevel,
        margin,
        width: size,
        color: { dark: fg, light: bg },
      });
      setState({ dataUrl, error: null, busy: false });
      toast.success("QR code generated.");
    } catch (e) {
      setState({
        dataUrl: null,
        error: e instanceof Error ? e.message : "Could not generate QR code.",
        busy: false,
      });
    }
  }, [content, errorLevel, margin, size, fg, bg]);

  // Live regenerate whenever inputs change (debounced implicitly by React batching).
  React.useEffect(() => {
    let cancelled = false;
    if (!content) {
      setState({ dataUrl: null, error: null, busy: false });
      return;
    }
    setState((s) => ({ ...s, busy: true }));
    const t = setTimeout(() => {
      QRCode.toDataURL(content, {
        errorCorrectionLevel: errorLevel,
        margin,
        width: size,
        color: { dark: fg, light: bg },
      })
        .then((dataUrl) => {
          if (cancelled) return;
          setState({ dataUrl, error: null, busy: false });
        })
        .catch((e) => {
          if (cancelled) return;
          setState({
            dataUrl: null,
            error: e instanceof Error ? e.message : "Could not generate QR code.",
            busy: false,
          });
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [content, errorLevel, margin, size, fg, bg]);

  const update = (key: string, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const switchType = (next: ContentType) => {
    setType(next);
    // Seed empty fields so the UI doesn't show stale data from another tab.
    setFields((f) => {
      const seed: Record<string, string> = {};
      if (next === "text") seed.text = f.text ?? "Hello, Dueneo!";
      if (next === "url") seed.url = f.url ?? "https://dueneo.app";
      if (next === "email") {
        seed.email = f.email ?? "";
        seed.subject = f.subject ?? "";
        seed.body = f.body ?? "";
      }
      if (next === "phone") seed.phone = f.phone ?? "";
      if (next === "sms") {
        seed.smsNumber = f.smsNumber ?? "";
        seed.smsBody = f.smsBody ?? "";
      }
      if (next === "wifi") {
        seed.ssid = f.ssid ?? "";
        seed.wifiPassword = f.wifiPassword ?? "";
        seed.encryption = f.encryption ?? "WPA";
        seed.hidden = f.hidden ?? "false";
      }
      return seed;
    });
  };

  const reset = () => {
    setType("text");
    setFields({ text: "https://dueneo.app" });
    setSize(320);
    setMargin(4);
    setErrorLevel("M");
    setFg("#0f172a");
    setBg("#ffffff");
  };

  const download = () => {
    if (!state.dataUrl) {
      toast.error("Generate a QR code first.");
      return;
    }
    const a = document.createElement("a");
    a.href = state.dataUrl;
    a.download = "dueneo-qr.png";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click(); setTimeout(() => a.remove(), 100);
    toast.success("Downloaded dueneo-qr.png");
  };

  const toolBody = (
    <div className="space-y-5">
      <Tabs value={type} onValueChange={(v) => switchType(v as ContentType)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="wifi">Wi-Fi</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-2">
          <Label htmlFor="qr-text">Text content</Label>
          <Textarea
            id="qr-text"
            value={fields.text ?? ""}
            onChange={(e) => update("text", e.target.value)}
            placeholder="Anything: a note, a contact, a message…"
            className="min-h-[120px]"
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <Label htmlFor="qr-url">URL</Label>
          <Input
            id="qr-url"
            value={fields.url ?? ""}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://example.com"
            type="text"
            inputMode="url"
          />
          <p className="text-xs text-muted-foreground">
            A scheme is added automatically if you type a bare domain.
          </p>
        </TabsContent>

        <TabsContent value="email" className="space-y-2">
          <Label htmlFor="qr-email">Recipient</Label>
          <Input
            id="qr-email"
            value={fields.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            placeholder="hello@example.com"
            type="email"
          />
          <Label htmlFor="qr-subject">Subject (optional)</Label>
          <Input
            id="qr-subject"
            value={fields.subject ?? ""}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Subject"
          />
          <Label htmlFor="qr-body">Body (optional)</Label>
          <Textarea
            id="qr-body"
            value={fields.body ?? ""}
            onChange={(e) => update("body", e.target.value)}
            placeholder="Pre-filled message body…"
            className="min-h-[80px]"
          />
        </TabsContent>

        <TabsContent value="phone" className="space-y-2">
          <Label htmlFor="qr-phone">Phone number</Label>
          <Input
            id="qr-phone"
            value={fields.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+1 555 123 4567"
            type="tel"
          />
          <p className="text-xs text-muted-foreground">
            Scanning the QR will start a phone call to this number.
          </p>
        </TabsContent>

        <TabsContent value="sms" className="space-y-2">
          <Label htmlFor="qr-sms-num">Phone number</Label>
          <Input
            id="qr-sms-num"
            value={fields.smsNumber ?? ""}
            onChange={(e) => update("smsNumber", e.target.value)}
            placeholder="+1 555 123 4567"
            type="tel"
          />
          <Label htmlFor="qr-sms-body">Pre-filled message (optional)</Label>
          <Textarea
            id="qr-sms-body"
            value={fields.smsBody ?? ""}
            onChange={(e) => update("smsBody", e.target.value)}
            placeholder="Hey, I scanned your QR…"
            className="min-h-[80px]"
          />
        </TabsContent>

        <TabsContent value="wifi" className="space-y-2">
          <Label htmlFor="qr-ssid">Network name (SSID)</Label>
          <Input
            id="qr-ssid"
            value={fields.ssid ?? ""}
            onChange={(e) => update("ssid", e.target.value)}
            placeholder="MyHomeNetwork"
          />
          <div className="space-y-2">
            <Label htmlFor="qr-enc">Encryption</Label>
            <Select
              value={fields.encryption ?? "WPA"}
              onValueChange={(v) => update("encryption", v)}
            >
              <SelectTrigger id="qr-enc" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WIFI_ENCRYPTIONS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(fields.encryption ?? "WPA") !== "nopass" && (
            <div className="space-y-2">
              <Label htmlFor="qr-wifi-pass">Password</Label>
              <Input
                id="qr-wifi-pass"
                value={fields.wifiPassword ?? ""}
                onChange={(e) => update("wifiPassword", e.target.value)}
                placeholder="Wi-Fi password"
                type="text"
              />
            </div>
          )}
          <Label
            htmlFor="qr-hidden"
            className="flex cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2.5 text-sm"
          >
            <span>Hidden network</span>
            <Switch
              id="qr-hidden"
              checked={fields.hidden === "true"}
              onCheckedChange={(v) => update("hidden", v ? "true" : "false")}
            />
          </Label>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="qr-size">Size</Label>
            <span className="font-mono text-xs text-muted-foreground">{size}px</span>
          </div>
          <Slider
            id="qr-size"
            value={[size]}
            min={128}
            max={1024}
            step={16}
            onValueChange={(v) => setSize(v[0] ?? 320)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="qr-margin">Quiet zone</Label>
            <span className="font-mono text-xs text-muted-foreground">{margin}</span>
          </div>
          <Slider
            id="qr-margin"
            value={[margin]}
            min={0}
            max={10}
            step={1}
            onValueChange={(v) => setMargin(v[0] ?? 4)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qr-ec">Error correction</Label>
          <Select value={errorLevel} onValueChange={(v) => setErrorLevel(v as ErrorLevel)}>
            <SelectTrigger id="qr-ec" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L · ~7%</SelectItem>
              <SelectItem value="M">M · ~15%</SelectItem>
              <SelectItem value="Q">Q · ~25%</SelectItem>
              <SelectItem value="H">H · ~30%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="qr-fg">Foreground</Label>
            <input
              id="qr-fg"
              type="color"
              value={fg}
              onChange={(e) => setFg(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-md border bg-background"
              aria-label="Foreground color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr-bg">Background</Label>
            <input
              id="qr-bg"
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-md border bg-background"
              aria-label="Background color"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} disabled={state.busy}>
          <Wand2 className="mr-1.5 h-4 w-4" />
          {state.busy ? "Generating…" : "Generate"}
        </Button>
        <Button variant="outline" onClick={download} disabled={!state.dataUrl}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download PNG
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          {state.dataUrl ? (
            <img
              src={state.dataUrl}
              alt="Generated QR code"
              width={Math.min(size, 320)}
              height={Math.min(size, 320)}
              className="rounded-md border"
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground"
              style={{ width: Math.min(size, 320), height: Math.min(size, 320) }}
            >
              QR preview
            </div>
          )}
          <div className="flex-1 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">Encoded payload</p>
            <pre className="max-h-40 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs break-all whitespace-pre-wrap">
              {content || "(empty)"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );

  const pageContent: ToolContent = {
    intro:
      "Generate QR codes for text, URLs, email, phone, SMS or Wi-Fi credentials. Customise size, quiet zone, error-correction level and colours, then download a PNG. Encoding runs entirely in your browser — your data is never uploaded.",
    tool: toolBody,
    howTo: [
      {
        title: "Pick a content type",
        description:
          "Use the tabs to switch between Text, URL, Email, Phone, SMS and Wi-Fi. Each tab shows the fields relevant to that type.",
      },
      {
        title: "Fill in the fields",
        description:
          "Type your content. The preview updates automatically. For Wi-Fi, choose the encryption type and tick “Hidden network” if needed.",
      },
      {
        title: "Adjust appearance",
        description:
          "Use the size, quiet-zone, error-correction and colour controls. Higher error correction lets the code keep scanning even if partially obscured.",
      },
      {
        title: "Download the PNG",
        description:
          "Click Download PNG to save the QR code image to your device. The downloaded image is at the full resolution you selected.",
      },
    ],
    useCases: [
      "Print a Wi-Fi QR code for guests to scan instead of typing the password.",
      "Encode a vCard-style contact or business URL on a flyer.",
      "Generate a phone-call QR for a customer-support hotline.",
      "Pre-fill an SMS draft so attendees can quickly text a keyword to a number.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Output is PNG only. For SVG, use the underlying <code>qrcode</code> library directly.</li>
        <li>Very long inputs may exceed QR capacity at low error-correction levels — switch to a higher level or shorten the content.</li>
        <li>Light-on-dark QR codes scan less reliably on some phones; keep the foreground darker than the background when possible.</li>
      </ul>
    ),
    faq: [
      {
        q: "Is my QR content sent to a server?",
        a: "No. The QR code is generated in your browser using the `qrcode` JavaScript library. Nothing you type is transmitted.",
      },
      {
        q: "Which error-correction level should I pick?",
        a: "L is fine for clean digital displays. For printed materials that might get smudged or partial scans, use M or Q. Use H for harsh environments where the code may be damaged.",
      },
      {
        q: "Can I make a coloured QR code?",
        a: "Yes. Use the foreground and background colour pickers. Keep the contrast high — pale foregrounds on white backgrounds often fail to scan.",
      },
      {
        q: "Why does my Wi-Fi QR not auto-join on iPhone?",
        a: "iOS prompts the user to join rather than auto-connecting. Android behaves similarly. Make sure the encryption type matches your router.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={pageContent} />;
}

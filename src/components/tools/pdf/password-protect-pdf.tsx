"use client";

import * as React from "react";
import { PDFDocument } from "@cantoo/pdf-lib";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { PrivacyNote } from "@/components/dueneo/privacy-note";
import { Dropzone, FileChip, formatBytes, type DropzoneFile } from "@/components/dueneo/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import {
  estimatePasswordStrength,
  type StrengthLevel,
} from "../security/_security-helpers";
import {
  derivedPdfName,
  isPdfFile,
  LARGE_PDF_WARN_BYTES,
  MAX_PDF_BYTES,
  readFileAsArrayBuffer,
} from "./_pdf-helpers";

const STRENGTH_BAR: Record<StrengthLevel, number> = {
  weak: 25,
  fair: 50,
  good: 75,
  strong: 100,
};

const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  weak: "text-rose-600 dark:text-rose-400",
  fair: "text-amber-600 dark:text-amber-400",
  good: "text-sky-600 dark:text-sky-400",
  strong: "text-emerald-600 dark:text-emerald-400",
};

const STRENGTH_LABEL: Record<StrengthLevel, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const STRENGTH_TRACK: Record<StrengthLevel, string> = {
  weak: "[&>[data-state=indicator]]:bg-rose-500",
  fair: "[&>[data-state=indicator]]:bg-amber-500",
  good: "[&>[data-state=indicator]]:bg-sky-500",
  strong: "[&>[data-state=indicator]]:bg-emerald-500",
};

interface Permissions {
  printing: boolean;
  copying: boolean;
  modifying: boolean;
  annotating: boolean;
  fillingForms: boolean;
  documentAssembly: boolean;
  contentAccessibility: boolean;
}

const DEFAULT_PERMS: Permissions = {
  printing: true,
  copying: true,
  modifying: false,
  annotating: false,
  fillingForms: true,
  documentAssembly: false,
  contentAccessibility: true,
};

const MIN_PASSWORD_LENGTH = 4;

export function PasswordProtectPdf({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);
  const [busy, setBusy] = React.useState(false);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [outputSize, setOutputSize] = React.useState<number>(0);
  const [progress, setProgress] = React.useState<number>(0);
  const [progressLabel, setProgressLabel] = React.useState<string>("");

  // Revoke the object URL on cleanup / replace.
  React.useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const estimate = React.useMemo(
    () => estimatePasswordStrength(password),
    [password]
  );

  const handleFiles = (incoming: DropzoneFile[]) => {
    const f = incoming[0]?.file;
    if (!f) return;
    if (!isPdfFile(f)) {
      toast.error(`"${f.name}" is not a PDF.`);
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      toast.error(
        `"${f.name}" is ${formatBytes(f.size)}. The limit is ${formatBytes(MAX_PDF_BYTES)}.`
      );
      return;
    }
    if (f.size > LARGE_PDF_WARN_BYTES) {
      toast.warning(
        `"${f.name}" is ${formatBytes(f.size)}. Large files may take a while to encrypt.`
      );
    }
    setFile(f);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
  };

  const reset = () => {
    setFile(null);
    setPassword("");
    setConfirm("");
    setPerms(DEFAULT_PERMS);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputSize(0);
    setProgress(0);
    setProgressLabel("");
  };

  const encrypt = async () => {
    if (!file) {
      toast.error("Upload a PDF first.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    setProgress(5);
    setProgressLabel("Reading file…");
    try {
      const buffer = await readFileAsArrayBuffer(file);
      setProgress(25);
      setProgressLabel("Loading PDF…");

      // Load with @cantoo/pdf-lib (ignoreEncryption lets us re-encrypt
      // PDFs that already have an empty owner password set).
      let doc: PDFDocument;
      try {
        doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/encrypt|password/i.test(msg)) {
          throw new Error(
            "This PDF is already encrypted with a password. Please decrypt it first."
          );
        }
        throw new Error(`Could not read this PDF. ${msg}`);
      }

      setProgress(50);
      setProgressLabel("Applying encryption…");

      doc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: perms.printing ? "highResolution" : false,
          copying: perms.copying,
          modifying: perms.modifying,
          annotating: perms.annotating,
          fillingForms: perms.fillingForms,
          documentAssembly: perms.documentAssembly,
          contentAccessibility: perms.contentAccessibility,
        },
      });

      setProgress(75);
      setProgressLabel("Saving encrypted PDF…");
      const bytes = await doc.save({ useObjectStreams: true });

      setProgress(95);
      setProgressLabel("Preparing download…");
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(url);
      setOutputSize(blob.size);

      setProgress(100);
      setProgressLabel("Done");
      toast.success("Encrypted PDF ready — click Download to save it.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Encryption failed.";
      toast.error(msg);
      setProgress(0);
      setProgressLabel("");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = derivedPdfName(file?.name, "encrypted");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started.");
  };

  const canEncrypt =
    !!file &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirm &&
    !busy;

  const mismatch = confirm.length > 0 && password !== confirm;

  const content: ToolContent = {
    intro:
      "Add password encryption to a PDF directly in your browser. Drop in a file, set a password (with confirmation), optionally restrict printing, copying and editing, and download an encrypted copy. Encryption is performed by the @cantoo/pdf-lib library — a fork of pdf-lib that supports true PDF password protection (RC4/AES) — entirely on your device. Your PDF and password never leave this tab.",
    tool: (
      <div className="space-y-5">
        <PrivacyNote level="sensitive" className="mb-1">
          Sensitive tool — your PDF and password are processed locally and never
          uploaded, logged or stored. Lose the password and the file is
          unrecoverable.
        </PrivacyNote>

        {!file ? (
          <Dropzone
            accept="application/pdf,.pdf"
            onFiles={handleFiles}
            label="Drop a PDF here or click to browse"
            hint="Max 250 MB. Encrypted PDFs are supported only if they have no password yet — decrypt first if needed."
            maxSizeLabel="250 MB"
            className="py-12"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <Lock className="h-5 w-5 text-primary" />
              <FileChip name={file.name} size={file.size} onRemove={reset} />
              <span className="ml-auto text-xs text-muted-foreground">
                Source PDF
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ppp-pw">Password</Label>
                  <div className="relative">
                    <Input
                      id="ppp-pw"
                      type={reveal ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 4 characters…"
                      autoComplete="new-password"
                      spellCheck={false}
                      className="pr-12 font-mono"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={reveal ? "Hide password" : "Reveal password"}
                      tabIndex={-1}
                    >
                      {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ppp-confirm">Confirm password</Label>
                  <Input
                    id="ppp-confirm"
                    type={reveal ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter the password"
                    autoComplete="new-password"
                    spellCheck={false}
                    className="font-mono"
                    aria-invalid={mismatch}
                    aria-describedby={mismatch ? "ppp-mismatch" : undefined}
                    disabled={busy}
                  />
                  {mismatch && (
                    <p id="ppp-mismatch" className="text-xs text-destructive">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                {password && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Strength</span>
                      <span
                        className={`text-xs font-medium ${STRENGTH_COLOR[estimate.level]}`}
                      >
                        {STRENGTH_LABEL[estimate.level]}
                      </span>
                    </div>
                    <Progress
                      value={STRENGTH_BAR[estimate.level]}
                      className={`mt-2 h-1.5 ${STRENGTH_TRACK[estimate.level]}`}
                      aria-label="Password strength"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      ≈ {estimate.entropyBits.toFixed(0)} bits of entropy ·
                      offline crack time {estimate.crackTime}.
                    </p>
                    {estimate.reasons[0] && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {estimate.reasons[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">
                      Permissions (when opened with the user password)
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The owner password (same as the user password here) always
                    grants full access. These restrictions only apply when the
                    PDF is opened with the user password.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <PermissionToggle
                      label="Printing"
                      checked={perms.printing}
                      onChange={(v) => setPerms((p) => ({ ...p, printing: v }))}
                      disabled={busy}
                    />
                    <PermissionToggle
                      label="Copy text & graphics"
                      checked={perms.copying}
                      onChange={(v) => setPerms((p) => ({ ...p, copying: v }))}
                      disabled={busy}
                    />
                    <PermissionToggle
                      label="Modify content"
                      checked={perms.modifying}
                      onChange={(v) => setPerms((p) => ({ ...p, modifying: v }))}
                      disabled={busy}
                    />
                    <PermissionToggle
                      label="Annotate"
                      checked={perms.annotating}
                      onChange={(v) => setPerms((p) => ({ ...p, annotating: v }))}
                      disabled={busy}
                    />
                    <PermissionToggle
                      label="Fill form fields"
                      checked={perms.fillingForms}
                      onChange={(v) => setPerms((p) => ({ ...p, fillingForms: v }))}
                      disabled={busy}
                    />
                    <PermissionToggle
                      label="Assemble pages"
                      checked={perms.documentAssembly}
                      onChange={(v) => setPerms((p) => ({ ...p, documentAssembly: v }))}
                      disabled={busy}
                    />
                    <PermissionToggle
                      label="Screen-reader access"
                      checked={perms.contentAccessibility}
                      onChange={(v) => setPerms((p) => ({ ...p, contentAccessibility: v }))}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Lose the password, lose the file.</p>
                  <p className="mt-1">
                    There is no password-recovery mechanism in the PDF spec.
                    Store the password in a password manager before downloading.
                  </p>
                </div>
              </div>
            </div>

            {busy && (
              <div className="space-y-2">
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{progressLabel}</p>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-4">
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New file
              </Button>
              <Button onClick={encrypt} disabled={!canEncrypt} className="ml-auto">
                {busy ? (
                  <>
                    <span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Encrypting…
                  </>
                ) : (
                  <>
                    <Lock className="mr-1.5 h-4 w-4" /> Encrypt PDF
                  </>
                )}
              </Button>
            </div>

            {outputUrl && (
              <div className="space-y-3">
                <div
                  role="status"
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                    <div className="space-y-1">
                      <p className="font-medium">Encrypted PDF ready</p>
                      <p className="text-xs">
                        Output size: {formatBytes(outputSize)} · encrypted with
                        AES (PDF 2.0) or RC4 (PDF 1.7), depending on what
                        @cantoo/pdf-lib selects for this document.
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={download}>
                  <Download className="mr-1.5 h-4 w-4" /> Download encrypted PDF
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-foreground">
                How the encryption works
              </p>
              <p className="mt-1">
                This tool uses <code>@cantoo/pdf-lib</code> (a maintained fork
                of <code>pdf-lib</code> that adds native encryption support).
                It applies the PDF standard encryption handler — RC4 40/128-bit
                for older PDFs or AES-128/256 for newer ones — so the resulting
                file is a genuine password-protected PDF that all major readers
                (Acrobat, Preview, browsers) will prompt for. This is true PDF
                encryption, not a wrapper.
              </p>
              <p className="mt-2">
                The user and owner passwords are set to the same value, which
                means anyone with the password has full owner access. The
                permission toggles above only affect viewers that honour the
                PDF permission flags — they are a deterrent, not a hard
                guarantee, since some readers ignore them.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Upload your PDF",
        description:
          "Drag a non-encrypted PDF onto the dropzone (max 250 MB). If the file is already password-protected, decrypt it first — this tool cannot re-encrypt an already-encrypted file.",
      },
      {
        title: "Set a strong password",
        description:
          "Enter the password twice. The strength meter shows entropy and an estimated offline crack time. Use at least 12 mixed characters — store it in a password manager before downloading.",
      },
      {
        title: "Choose permissions (optional)",
        description:
          "Restrict printing, copying, editing, annotating, form filling, page assembly or screen-reader access. These apply only when the file is opened with the user password; the owner password (same value here) always has full access.",
      },
      {
        title: "Encrypt and download",
        description:
          "Click Encrypt PDF. The file is encrypted locally with @cantoo/pdf-lib and saved as a standard password-protected PDF. Download it and verify in any PDF reader.",
      },
    ],
    useCases: [
      "Protect a tax form, contract or payslip before emailing it.",
      "Lock down a draft document so collaborators can read but not edit or print it.",
      "Add a password to a scanned ID or medical record for secure storage.",
      "Restrict copying and printing of a sensitive internal report shared externally.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The user and owner passwords are set to the same value. To use
          different owner/user passwords, encrypt the file in Acrobat or
          qpdf afterwards.
        </li>
        <li>
          PDF permission flags (printing, copying, etc.) are honoured by
          well-behaved readers but are not cryptographically enforced —
          some tools ignore them entirely. They are a deterrent, not a hard
          guarantee.
        </li>
        <li>
          The library chooses between RC4 (PDF 1.4–1.6) and AES (PDF 1.7+)
          based on the source document. For maximum compatibility with
          modern readers, the output is generally PDF 1.7 or 2.0 with AES.
        </li>
        <li>
          Files larger than 250 MB are rejected to keep the browser tab
          responsive. For very large PDFs, use a desktop tool such as qpdf
          or Acrobat.
        </li>
        <li>
          There is <strong>no password recovery</strong>. If you forget the
          password, the file is unrecoverable. Store it in a password
          manager before deleting the original.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Is this real PDF encryption?",
        a: "Yes. We use @cantoo/pdf-lib, a fork of pdf-lib that implements the PDF standard encryption handler (RC4 40/128-bit or AES-128/256, depending on the document). The output is a genuine password-protected PDF — every major reader will prompt for the password.",
      },
      {
        q: "Why @cantoo/pdf-lib instead of plain pdf-lib?",
        a: "The original pdf-lib does not implement encryption (it is a long-standing feature request). The @cantoo fork adds native encrypt() support while keeping the same API, so we get true PDF encryption without falling back to a ZIP wrapper.",
      },
      {
        q: "Are my PDF and password sent to a server?",
        a: "No. Both stay in your browser tab. The encryption runs entirely client-side via the @cantoo/pdf-lib library. Nothing is uploaded, logged or stored — close the tab and the password is gone.",
      },
      {
        q: "Can I remove the password later?",
        a: "Not with this tool — it only adds passwords. To remove a password you already know, re-save the PDF in Acrobat/Preview (Print → Save as PDF) or use qpdf with --decrypt.",
      },
      {
        q: "Why don't the permission toggles always work?",
        a: "PDF permissions are a flag the reader is asked to honour. Adobe Acrobat respects them strictly, but some third-party readers (and most browser built-in viewers) ignore them. They deter casual users but are not a hard cryptographic boundary.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

/* ─────────────────────────── small subcomponents ─────────────────────── */

function PermissionToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Label
      className={`flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs font-normal ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </Label>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "dueneo-company-logo";

/**
 * Get the saved company logo from localStorage.
 * Returns a data URL string or null.
 */
export function getCompanyLogo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Logo upload component for business documents.
 * Saves to localStorage so it persists across sessions.
 * Returns the logo URL via onChange callback.
 */
export function LogoUpload({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (logo: string | null) => void;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(STORAGE_KEY, dataUrl);
      onChange(dataUrl);
      toast.success("Logo saved.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (value) {
    return (
      <div className={`relative inline-block ${className ?? ""}`}>
        <img
          src={value}
          alt="Company logo"
          className="h-16 w-auto max-w-[200px] rounded border object-contain"
        />
        <button
          onClick={clear}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          aria-label="Remove logo"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground ${className ?? ""}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Upload company logo"
    >
      <ImageIcon className="h-4 w-4" />
      <span>Upload logo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

/**
 * Logo display component for document previews.
 * Shows the logo if available, otherwise nothing.
 */
export function LogoPreview({ className }: { className?: string }) {
  const logo = getCompanyLogo();
  if (!logo) return null;
  return (
    <img
      src={logo}
      alt="Company logo"
      className={className ?? "h-12 w-auto max-w-[160px] object-contain"}
    />
  );
}

"use client";

import { type DragEvent, type ReactNode, useId, useRef, useState } from "react";
import { AlertCircle, FileUp, Link, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ACCEPTED_CV_MIME, CV_FILE_ACCEPT } from "@/lib/cv-file-parser";
import { COPY, type CvLocale } from "@/lib/cv-matcher-copy";

/**
 * Import controls for the CV matcher (OTH-103). A visitor can upload a PDF/DOC/DOCX, drop
 * one onto the CV box, or follow the guided LinkedIn → "Save to PDF" route. Every file is
 * read in the browser by {@link parseCvFile}; nothing is uploaded. Copy lives in
 * `cv-matcher-copy.ts` so EN and SK stay in step (Golden Stack rule 4).
 */

/** Drag-and-drop wrapper around the CV textarea. Keyboard users use the Upload button. */
export function CvImportDropzone({
  locale,
  accepting,
  onFile,
  children,
}: {
  locale: CvLocale;
  accepting: boolean;
  onFile: (file: File) => void;
  children: ReactNode;
}) {
  const c = COPY[locale];
  const [drag, setDrag] = useState<"none" | "valid" | "invalid">("none");
  const depth = useRef(0);

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const kind = (e: DragEvent): "valid" | "invalid" => {
    // The file name is hidden mid-drag, so judge by MIME type; when it is blank (common on
    // some OSes) assume valid rather than block a file the drop would actually accept.
    const type = e.dataTransfer.items?.[0]?.type ?? "";
    if (!type) return "valid";
    return ACCEPTED_CV_MIME.has(type) ? "valid" : "invalid";
  };

  return (
    <div
      className="relative"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        if (!accepting) return;
        depth.current += 1;
        setDrag(kind(e));
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        if (!accepting) return;
        setDrag(kind(e));
      }}
      onDragLeave={(e) => {
        if (!accepting) return;
        e.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setDrag("none");
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!accepting) return;
        depth.current = 0;
        setDrag("none");
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      {children}
      {drag !== "none" && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-opacity duration-100 motion-reduce:transition-none",
            drag === "valid"
              ? "border-primary bg-primary/5 text-primary"
              : "border-destructive bg-destructive/5 text-destructive"
          )}
        >
          <FileUp className="size-6" />
          <span className="text-sm font-medium">
            {drag === "valid" ? c.importDragHint : c.importDragInvalid}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The CV text panel plus its import affordances: Upload / LinkedIn buttons, an inline
 * error, a drag-and-drop zone around the textarea, and a polite live region for status.
 */
export function CvInputPanel({
  locale,
  label,
  placeholder,
  value,
  onChange,
  clearLabel,
  words,
  loading,
  error,
  status,
  onFile,
  onOpenLinkedIn,
}: {
  locale: CvLocale;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  clearLabel: string;
  words: string;
  loading: boolean;
  error: string | null;
  status: string;
  onFile: (file: File) => void;
  onOpenLinkedIn: () => void;
}) {
  const c = COPY[locale];
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <div role="status" className="flex items-center gap-2">
              <Skeleton className="h-11 w-28" />
              <span className="sr-only">{c.importLoading}</span>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={CV_FILE_ACCEPT}
                aria-hidden="true"
                tabIndex={-1}
                data-testid="cv-file-input"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11"
                aria-label={c.importFileAriaLabel}
                onClick={() => fileRef.current?.click()}
              >
                <Upload aria-hidden />
                {c.importFile}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                aria-haspopup="dialog"
                aria-label={c.importLinkedInAriaLabel}
                onClick={onOpenLinkedIn}
              >
                <Link aria-hidden />
                {c.importLinkedIn}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <CvImportDropzone locale={locale} accepting={!loading} onFile={onFile}>
        <textarea
          id={id}
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="min-h-56 w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-72"
        />
      </CvImportDropzone>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="off">{words}</span>
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={!value || loading}
          aria-label={`${clearLabel} ${label}`}
          className="min-h-11 rounded-md px-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * LinkedIn has no direct import, so this walks the visitor through LinkedIn's own
 * "Save to PDF" export and then reads that PDF with the same parser as any other file.
 */
export function LinkedInImportDialog({
  open,
  onOpenChange,
  locale,
  loading,
  error,
  status,
  onFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: CvLocale;
  loading: boolean;
  error: string | null;
  status: string;
  onFile: (file: File) => void;
}) {
  const c = COPY[locale];
  const fileRef = useRef<HTMLInputElement>(null);
  const steps = [c.linkedInStep1, c.linkedInStep2, c.linkedInStep3];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={c.linkedInClose}
        // Don't let a stray click outside throw away a parse that is in flight.
        onInteractOutside={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogTitle>{c.linkedInDialogTitle}</DialogTitle>
        <DialogDescription>{c.linkedInDialogDesc}</DialogDescription>

        <ol aria-label={c.linkedInDialogTitle} className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span
                aria-hidden
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground"
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          aria-hidden="true"
          tabIndex={-1}
          data-testid="linkedin-file-input"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
        <Button
          type="button"
          className="mt-5 h-11 w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={loading}
          aria-label={c.linkedInUpload}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp aria-hidden />
          {c.linkedInUpload}
        </Button>

        {loading && (
          <div role="status" className="mt-3">
            <Skeleton className="h-4 w-40" />
            <span className="sr-only">{status}</span>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

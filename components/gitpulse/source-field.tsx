"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { AudioLines, ExternalLink, FileText, GitBranch, ImageIcon, LinkIcon, Upload, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldWidgetError, type FieldWidget, type FieldWidgetInputProps } from "@/components/patterns/data-grid/widget-types";
import { getDemoSlug } from "@/lib/demo-slug";
import { gitpulseCopy, type GitpulseCopy } from "@/lib/gitpulse/copy";
import {
  FILE_KINDS,
  FILE_LIMITS,
  SOURCE_KINDS,
  contentTypeFor,
  encodeSource,
  fileIssue,
  isHttpUrl,
  newUploadId,
  parseSource,
  safeFileName,
  sourceLabel,
  sourcePath,
  type FileKind,
  type SourceKind,
  type StoredSource,
} from "@/lib/gitpulse/source";
import { cn } from "@/lib/utils";

/**
 * source-field.tsx — a content item's source, picked on a phone: six tiles (repository,
 * video, image, sound, Markdown, link), then the one input that tile needs. A file is
 * previewed from the device and uploaded only when the record is saved (record-dialog.tsx
 * drives commit/release); the grid stores the encoded source (lib/gitpulse/source.ts).
 */

const ICONS: Record<SourceKind, LucideIcon> = {
  repository: GitBranch,
  video: Video,
  image: ImageIcon,
  audio: AudioLines,
  markdown: FileText,
  url: LinkIcon,
};

/** One draft per tile, so switching tiles loses nothing typed or picked. */
interface SourceDraft {
  kind: SourceKind;
  repository: string;
  url: string;
  files: Partial<Record<FileKind, File>>;
  /** What the record stores today, when that is a file — kept unless replaced. */
  stored: FileSource | null;
}

type FileSource = Extract<StoredSource, { uploadId: string }>;

const isFileKind = (kind: SourceKind): kind is FileKind => (FILE_KINDS as readonly SourceKind[]).includes(kind);
const isFileSource = (source: StoredSource): source is FileSource => "uploadId" in source;

function initial(stored: unknown): SourceDraft {
  const draft: SourceDraft = { kind: "repository", repository: "", url: "", files: {}, stored: null };
  const source = parseSource(stored);
  if (!source) return draft;
  if (source.kind === "repository") return { ...draft, repository: source.text };
  if (source.kind === "url") return { ...draft, kind: "url", url: source.url };
  return { ...draft, kind: source.kind, stored: source as FileSource };
}

function draftText(draft: SourceDraft): string {
  const { kind } = draft;
  if (kind === "repository") return draft.repository.trim();
  if (kind === "url") return draft.url.trim();
  const file = draft.files[kind];
  if (file) return encodeSource({ kind, uploadId: "0".repeat(32), name: safeFileName(file.name) });
  return draft.stored?.kind === kind ? encodeSource(draft.stored) : "";
}

function issue(value: unknown, locale: string): string | null {
  const draft = value as SourceDraft;
  const copy = gitpulseCopy(locale).source;
  if (draft.kind === "url" && draft.url.trim() && !isHttpUrl(draft.url)) return copy.errors.url;
  const file = isFileKind(draft.kind) ? draft.files[draft.kind] : undefined;
  const problem = file && isFileKind(draft.kind) ? fileIssue(draft.kind, file) : null;
  return problem ? copy.errors[problem] : null;
}

export const sourceWidget: FieldWidget = {
  initial,
  draft: (value) => draftText(value as SourceDraft),
  issue,
  async commit(value, { uid, locale, onProgress, signal }) {
    const draft = value as SourceDraft;
    const { kind } = draft;
    const file = isFileKind(kind) ? draft.files[kind] : undefined;
    if (!file || !isFileKind(kind)) return draftText(draft);
    const copy = gitpulseCopy(locale).source;
    const contentType = contentTypeFor(kind, file);
    if (!contentType) throw new FieldWidgetError(copy.errors.type);
    if (!uid) throw new FieldWidgetError(copy.errors.auth);
    const source: FileSource = { kind, uploadId: newUploadId(), name: safeFileName(file.name) };
    const { uploadFile } = await import("@/lib/gitpulse/source-storage");
    try {
      await uploadFile(sourcePath(getDemoSlug(), uid, source.uploadId, source.name), file, contentType, onProgress, signal);
    } catch (err) {
      console.error("[source] upload failed:", err);
      const code = (err as { code?: string }).code;
      throw new FieldWidgetError(code === "storage/unauthenticated" ? copy.errors.auth : copy.errors.upload);
    }
    return encodeSource(source);
  },
  async release(stored, uid) {
    const source = parseSource(stored);
    if (!source || !isFileSource(source)) return;
    const { deleteFile } = await import("@/lib/gitpulse/source-storage");
    await deleteFile(sourcePath(getDemoSlug(), uid, source.uploadId, source.name));
  },
  Input: SourceInput,
  Cell: SourceCell,
};

function SourceInput({ id, field, uid, value, onChange, invalid, describedBy, progress, disabled }: FieldWidgetInputProps) {
  const copy = gitpulseCopy(useLocale()).source;
  const draft = value as SourceDraft;
  const group = useId();
  const [pickError, setPickError] = useState<string | null>(null);
  const set = (patch: Partial<SourceDraft>) => onChange({ ...draft, ...patch });
  const percent = progress === null ? null : Math.round(progress * 100);

  return (
    <fieldset className="space-y-2" disabled={disabled} data-source-field>
      <legend className="mb-1.5 text-sm text-muted-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-primary" aria-hidden>*</span>}
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {SOURCE_KINDS.map((kind) => {
          const Icon = ICONS[kind];
          const active = draft.kind === kind;
          return (
            <label
              key={kind}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border px-1 text-center text-xs transition-colors motion-reduce:transition-none",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="radio"
                name={group}
                value={kind}
                checked={active}
                onChange={() => {
                  setPickError(null);
                  set({ kind });
                }}
                className="sr-only"
              />
              <Icon className="size-5" aria-hidden />
              {copy.kinds[kind]}
            </label>
          );
        })}
      </div>

      {draft.kind === "repository" && (
        <Input id={id} className="h-11 text-base sm:text-sm" value={draft.repository} placeholder={copy.repoPlaceholder}
          aria-label={copy.kinds.repository} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next"
          aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => set({ repository: e.target.value })} />
      )}
      {draft.kind === "url" && (
        <Input id={id} className="h-11 text-base sm:text-sm" type="url" inputMode="url" value={draft.url} placeholder={copy.urlPlaceholder}
          aria-label={copy.kinds.url} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next"
          aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => set({ url: e.target.value })} />
      )}
      {isFileKind(draft.kind) && (
        <FilePicker id={id} kind={draft.kind} draft={draft} uid={uid} copy={copy} invalid={invalid} describedBy={describedBy}
          onPick={(file) => {
            const kind = draft.kind as FileKind;
            const problem = file ? fileIssue(kind, file) : null;
            if (problem) return setPickError(copy.errors[problem]);
            setPickError(null);
            set({ files: { ...draft.files, [kind]: file ?? undefined } });
          }} />
      )}
      {pickError && <p className="text-sm text-destructive" aria-live="polite">{pickError}</p>}

      {percent !== null && (
        <div className="space-y-1">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={copy.uploading(percent)}
            className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground" aria-hidden>{copy.uploading(percent)}</p>
        </div>
      )}
    </fieldset>
  );
}

function FilePicker({ id, kind, draft, uid, copy, invalid, describedBy, onPick }: {
  id: string;
  kind: FileKind;
  draft: SourceDraft;
  uid: string | null;
  copy: GitpulseCopy["source"];
  invalid: boolean;
  describedBy?: string;
  onPick: (file: File | null) => void;
}) {
  const file = draft.files[kind] ?? null;
  const stored = !file && draft.stored?.kind === kind ? draft.stored : null;
  const local = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local);
  }, [local]);

  const storedPath = stored && uid ? sourcePath(getDemoSlug(), uid, stored.uploadId, stored.name) : null;
  const [remote, setRemote] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!storedPath) return;
    let live = true;
    import("@/lib/gitpulse/source-storage")
      .then((storage) => storage.fileUrl(storedPath))
      .then((url) => live && setRemote({ path: storedPath, url }))
      .catch((err) => console.warn("[source] no download URL:", err));
    return () => {
      live = false;
    };
  }, [storedPath]);
  const remoteUrl = remote && remote.path === storedPath ? remote.url : null;

  return (
    <div className="space-y-2 rounded-lg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ring">
      <input id={id} type="file" accept={FILE_LIMITS[kind].accept} className="sr-only" aria-label={copy.choose[kind]}
        aria-invalid={invalid} aria-describedby={describedBy}
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = ""; // picking the same file again still fires
        }} />
      {file || stored ? (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <Preview kind={kind} src={local ?? remoteUrl} file={file} />
          <p className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate" data-source-name>{file ? file.name : stored!.name}</span>
            {file && <span className="shrink-0 text-muted-foreground">{formatSize(file.size)}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 cursor-pointer px-4">
              <label htmlFor={id}>{copy.replace}</label>
            </Button>
            {file && (
              <Button type="button" variant="ghost" className="h-11" onClick={() => onPick(null)}>{copy.remove}</Button>
            )}
            {!file && remoteUrl && (
              <Button asChild variant="ghost" className="h-11">
                <a href={remoteUrl} target="_blank" rel="noopener noreferrer">
                  {copy.open}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <label htmlFor={id}
          className={cn(
            "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center",
            invalid ? "border-destructive" : "border-border hover:border-primary"
          )}>
          <Upload className="size-6 text-primary" aria-hidden />
          <span className="text-sm font-medium">{copy.choose[kind]}</span>
          <span className="text-xs text-muted-foreground">{copy.limits[kind]}</span>
        </label>
      )}
    </div>
  );
}

function Preview({ kind, src, file }: { kind: FileKind; src: string | null; file: File | null }) {
  if (kind === "markdown") return <MarkdownExcerpt file={file} />;
  if (!src) return null;
  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="max-h-48 w-full rounded-md bg-muted object-contain"
        onError={(e) => (e.currentTarget.hidden = true)} /> // HEIC outside Safari
    );
  }
  if (kind === "video") return <video src={src} controls playsInline preload="metadata" className="max-h-56 w-full rounded-md bg-black" />;
  return <audio src={src} controls preload="metadata" className="w-full" />;
}

function MarkdownExcerpt({ file }: { file: File | null }) {
  const [read, setRead] = useState<{ file: File; text: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    let live = true;
    file.slice(0, 600).text().then((text) => live && setRead({ file, text }));
    return () => {
      live = false;
    };
  }, [file]);
  const text = read && read.file === file ? read.text.trim() : "";
  if (!text) return null;
  return <pre className="max-h-32 overflow-hidden whitespace-pre-wrap break-words font-sans text-xs text-muted-foreground">{text}</pre>;
}

function SourceCell({ value }: { value: unknown }) {
  const copy = gitpulseCopy(useLocale()).source;
  const source = parseSource(value);
  if (!source) return <>—</>;
  const Icon = ICONS[source.kind];
  return (
    <span className="inline-flex max-w-[16rem] items-center gap-1.5 align-middle" data-source-kind={source.kind}>
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="sr-only">{copy.kinds[source.kind]}: </span>
      <span className="min-w-0 truncate">{sourceLabel(source)}</span>
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

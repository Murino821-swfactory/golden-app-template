/**
 * cv-file-parser.ts — pulls the plain text out of an uploaded CV, entirely in the browser
 * (OTH-103). Static export has no server, so a PDF or Word file is read on the visitor's
 * own machine and nothing is uploaded anywhere — same promise the matcher already makes.
 *
 * The heavy readers (pdf.js, mammoth) are loaded with `await import()` only when a file is
 * actually parsed, so they never weigh down the first paint. Everything that validates a
 * file before parsing is pure and synchronous, so it can be unit-tested without them.
 */

/** Largest file we will try to read. Bigger ones are almost always scans, not CVs. */
export const MAX_CV_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** The `accept` attribute for every CV file input — one source of truth. */
export const CV_FILE_ACCEPT = ".pdf,.doc,.docx";

/** MIME types we recognise while a file is still being dragged (the name is unknown then). */
export const ACCEPTED_CV_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXTENSION = /\.(pdf|docx|doc)$/i;

/** Why a file cannot be read — carried by the thrown error and mapped to localized copy. */
export type CvParseReason = "type" | "size" | "read" | "empty";

export class CvParseError extends Error {
  constructor(public readonly reason: CvParseReason) {
    super(`cv-parse:${reason}`);
    this.name = "CvParseError";
  }
}

/** True when the file name ends in a format we can read. */
export function isAcceptedCvFile(file: { name: string }): boolean {
  return EXTENSION.test(file.name);
}

/** The reason a file would be rejected before parsing, or `null` when it is accepted. */
export function rejectionFor(file: { name: string; size: number }): "type" | "size" | null {
  if (!isAcceptedCvFile(file)) return "type";
  if (file.size > MAX_CV_FILE_BYTES) return "size";
  return null;
}

function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/** Collapse the ragged whitespace a document extractor leaves behind. */
function tidy(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // The worker is a separate asset; `new URL(..., import.meta.url)` lets the bundler emit and
  // fingerprint it so it is served from our own origin (no CDN — Golden Stack rule 4).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return pages.join("\n\n");
  } finally {
    await doc.destroy();
  }
}

async function parseDocx(file: File): Promise<string> {
  // The browser bundle avoids mammoth's Node-only dependencies (fs, etc.).
  const mammoth = await import("mammoth/mammoth.browser.js");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Read a CV file to plain text. Validates type and size first, then dispatches to the right
 * reader. Any failure surfaces as a {@link CvParseError} with a reason the UI can explain —
 * the caller never sees a raw library stack trace.
 */
export async function parseCvFile(file: File): Promise<string> {
  const rejection = rejectionFor(file);
  if (rejection) throw new CvParseError(rejection);

  let raw: string;
  try {
    raw = extensionOf(file.name) === "pdf" ? await parsePdf(file) : await parseDocx(file);
  } catch (err) {
    if (err instanceof CvParseError) throw err;
    throw new CvParseError("read");
  }

  const text = tidy(raw);
  if (!text) throw new CvParseError("empty");
  return text;
}

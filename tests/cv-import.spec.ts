import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { find, read, write } from "cfb";
import {
  CvParseError,
  MAX_CV_FILE_BYTES,
  isAcceptedCvFile,
  parseCvFile,
  rejectionFor,
} from "../lib/cv-file-parser";

/**
 * OTH-103 — the pure guards that run before any document reader is loaded. The actual
 * PDF/DOCX extraction is exercised through the browser (cv-matcher.spec.ts); here we only
 * prove that type and size are enforced without pulling in pdf.js or mammoth.
 */

const file = (name: string, size = 16, type = ""): File =>
  new File([new Uint8Array(size)], name, { type });

test.describe("CV file guards", () => {
  test("accepts the three supported formats, case-insensitively", () => {
    expect(isAcceptedCvFile(file("resume.pdf"))).toBe(true);
    expect(isAcceptedCvFile(file("resume.docx"))).toBe(true);
    expect(isAcceptedCvFile(file("resume.DOC"))).toBe(true);
    expect(isAcceptedCvFile(file("Resume.PDF"))).toBe(true);
  });

  test("rejects anything else", () => {
    expect(isAcceptedCvFile(file("resume.txt"))).toBe(false);
    expect(isAcceptedCvFile(file("photo.png"))).toBe(false);
    expect(isAcceptedCvFile(file("resume"))).toBe(false);
  });

  test("rejectionFor names the reason", () => {
    expect(rejectionFor(file("photo.png"))).toBe("type");
    expect(rejectionFor(file("cv.pdf", MAX_CV_FILE_BYTES + 1))).toBe("size");
    expect(rejectionFor(file("cv.pdf", 1024))).toBeNull();
  });

  test("parseCvFile throws a typed error for an unsupported file, without a reader", async () => {
    const err = await parseCvFile(file("photo.png")).catch((e) => e);
    expect(err).toBeInstanceOf(CvParseError);
    expect((err as CvParseError).reason).toBe("type");
  });

  test("parseCvFile throws a size error before reading an oversized file", async () => {
    const err = await parseCvFile(file("cv.pdf", MAX_CV_FILE_BYTES + 1)).catch((e) => e);
    expect(err).toBeInstanceOf(CvParseError);
    expect((err as CvParseError).reason).toBe("size");
  });

  test("reads the main story of a real Word 97 document including diacritics", async () => {
    const bytes = readFileSync(resolve("tests/fixtures/cv/resume.doc"));
    const text = await parseCvFile(new File([bytes], "resume.doc"));
    expect(text).toContain("Jana Nováková");
    expect(text).toContain("React and TypeScript");
  });

  test("refuses an encrypted DOC instead of interpreting its binary as text", async () => {
    const bytes = readFileSync(resolve("tests/fixtures/cv/resume.doc"));
    const container = read(bytes, { type: "buffer" });
    const word = find(container, "WordDocument")!;
    word.content[11] |= 1; // FibBase.fEncrypted
    const encrypted = Uint8Array.from(write(container, { type: "array" }) as number[]);
    await expect(parseCvFile(new File([encrypted], "encrypted.doc")))
      .rejects.toMatchObject({ reason: "read" });
  });
});

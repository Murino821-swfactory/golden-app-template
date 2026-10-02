import { test, expect } from "@playwright/test";
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
});

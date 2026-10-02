# OTH-115 / OTH-103: CV import

OTH-103 was blocked at typecheck because Lucide 1.x no longer exports the
LinkedIn brand icon. Use its supported Link icon with localized accessible copy.

PDF uses PDF.js; DOCX uses Mammoth's browser bundle. Legacy DOC needs a distinct
reader: Mammoth does not parse binary Word files. Read the Word 97–2003 OLE streams
and the main story's character pieces with CFB, preserving Unicode. Encrypted,
corrupt and pre-97 DOCs fail with the existing localized message. Scanned PDFs
without text require copy/paste or OCR outside this browser-only feature.

The PDF worker, CMaps and font data are copied from the locked PDF.js package
during prebuild, self-hosted under the actual base path and versioned to avoid
worker/API cache mismatches. Files are limited to 5 MB; PDFs to 100 pages.
No CV file or extracted text is uploaded. Parse errors preserve the previous CV.

LinkedIn import means the user's real profile exported with **Save to PDF**.
The earlier generated spec suggested deriving CV content from a profile URL.
A URL contains no experience or skills, and browser scraping requires access
LinkedIn does not grant. We do not fabricate a profile from a URL. The guided
PDF flow imports the actual profile; pasted profile text also works in the CV box.

Synthetic DOC/PDF/DOCX fixtures exercise success in desktop/mobile browsers,
live scores, LinkedIn PDF in EN/SK, drop, error/retry and document confidentiality.
Guard tests cover unsupported/oversized files and an encrypted Word document.

Production publication is coordinated through factory-web's main `deploy` job,
with an immutable source SHA in `deployment/cv-matcher.json`, tested export
artifact and post-publication browser imports. The source PR targets only
`demo/cv-matcher`; this customer code must never enter the template's main branch.

# OSS Billing — accountant & e-invoicing 2027 panel

Branch `demo/oss-billing` only. A panel on `/dashboard` (above the invoice grid) that turns an
accountant's onboarding letter (2026-10-13) into a checklist the founder can act on.

## What it does

| Block | Behaviour | Code |
|---|---|---|
| Phase banner | "Hybrid mode — N days" until 2026-12-31, "mandatory" from 2027-01-01 | `einvoicePhase` |
| Readiness (6 steps) | power of attorney for the Financial Administration, suppliers bill the company, digital postman chosen, postman automates (XML/API), handoff format agreed, onboarding meeting | `readiness` |
| Company setup | VAT status (non-payer / payer), digital postman name + capability, accountant, e-mail, software (default Money S3) | `ComplianceState` |
| Supplier invoice check | channel = Peppol when the supplier is a VAT payer and the invoice is dated 2027+; flags invoices billed to the founder personally, a missing postman, a mailbox-only postman | `routeIncoming` |
| Meeting agenda | 7 topics from the letter; "E-mail the agenda" opens a `mailto:` from the founder's own mailbox | `agendaMailto` |
| Handoff | CSV (RFC 4180, UTF-8 BOM) of the visitor's invoices from the grid | `invoicesCsv` |

State lives in the browser (`localStorage` key `oss-billing.compliance.v1`); the visitor's
Firestore sandbox holds only the configured `invoice` entity. Copy: `lib/billing/copy.ts`
(en, sk, es; other locales fall back to English). Tests: `tests/oss-billing-compliance.spec.ts`.

## Facts behind the rules

- [FAKT] Slovak mandatory e-invoicing starts 2027-01-01; 2026 is a transition year in which
  invoices still travel the old way (accountant's letter; PwC SK, Crowe SK, Fakturoid).
- [FAKT] From 2027 an invoice from a domestic VAT payer reaches a business only through a
  certified Peppol access point the business chose; the duty to receive applies to non-VAT
  payers too. Invoices from non-VAT payers arrive as before (accountant's letter; Fakturoid,
  Pohoda portal).
- [FAKT] Supplier invoices must be billed to the company, not the founder as a person
  (accountant's letter).
- [OVERIŤ] Exact scope in the amended VAT Act (B2B vs. B2G, cross-border from 2030 under ViDA)
  and the final list of certified access points (stabilised mid-2026 per one source).
- [OVERIŤ] Money S3 import format for the handoff — the accountant offered XML or API and a
  paid customisation; the CSV is a raw export until the format is agreed.

The panel says "guidance, not tax advice"; it never claims a filing or a submission.

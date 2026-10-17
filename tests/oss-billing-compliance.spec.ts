import { test, expect } from "@playwright/test";
import {
  AGENDA_IDS,
  agendaMailto,
  defaultState,
  einvoicePhase,
  invoicesCsv,
  outgoingChannel,
  parseState,
  readiness,
  routeIncoming,
} from "../lib/billing/compliance";
import { complianceCopy } from "../lib/billing/copy";

/**
 * The accountant panel's rules (components/billing): Slovak e-invoicing from 2027, supplier
 * invoices billed to the company, readiness and the handoff. Pure functions, no browser.
 */

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

test.describe("e-invoicing phase", () => {
  test("hybrid mode counts down to 1 January 2027", () => {
    expect(einvoicePhase(local(2026, 10, 17))).toEqual({ phase: "hybrid", daysLeft: 76 });
    expect(einvoicePhase(local(2026, 12, 31))).toEqual({ phase: "hybrid", daysLeft: 1 });
  });

  test("from 1 January 2027 it is mandatory", () => {
    expect(einvoicePhase(local(2027, 1, 1))).toEqual({ phase: "mandatory", daysLeft: 0 });
    expect(einvoicePhase(local(2027, 6, 1)).phase).toBe("mandatory");
  });
});

test.describe("supplier invoices", () => {
  const ready = { ...defaultState(), postmanName: "Any provider", postmanKind: "api" as const };

  test("a VAT payer's invoice from 2027 must come through the digital postman", () => {
    expect(routeIncoming({ supplierVatPayer: true, issueDate: "2027-01-01", billedTo: "company" }, ready))
      .toEqual({ channel: "peppol", issues: [] });
  });

  test("in 2026, or from a non-VAT payer, it arrives as before", () => {
    expect(routeIncoming({ supplierVatPayer: true, issueDate: "2026-12-31", billedTo: "company" }, ready).channel).toBe("asBefore");
    expect(routeIncoming({ supplierVatPayer: false, issueDate: "2027-03-01", billedTo: "company" }, ready).channel).toBe("asBefore");
  });

  test("an invoice billed to the founder personally is flagged", () => {
    expect(routeIncoming({ supplierVatPayer: false, issueDate: "2026-10-17", billedTo: "person" }, ready).issues)
      .toEqual(["billedToPerson"]);
  });

  test("a Peppol invoice without an automatable postman is flagged", () => {
    const inv = { supplierVatPayer: true, issueDate: "2027-02-01", billedTo: "company" as const };
    expect(routeIncoming(inv, defaultState()).issues).toEqual(["noPostman"]);
    expect(routeIncoming(inv, { ...ready, postmanKind: "mailbox" }).issues).toEqual(["manualPostman"]);
  });

  test("a missing date is an issue, never a silent channel", () => {
    expect(routeIncoming({ supplierVatPayer: true, issueDate: "", billedTo: "company" }, ready))
      .toEqual({ channel: "asBefore", issues: ["badDate"] });
  });
});

test("own invoices go through the postman only for a VAT payer from 2027", () => {
  expect(outgoingChannel("nonPayer", "2027-05-01")).toBe("asBefore");
  expect(outgoingChannel("payer", "2026-12-31")).toBe("asBefore");
  expect(outgoingChannel("payer", "2027-01-01")).toBe("peppol");
});

test.describe("readiness", () => {
  test("a fresh company has nothing done", () => {
    const r = readiness(defaultState());
    expect(r).toMatchObject({ done: 0, total: 6 });
  });

  test("a named API postman ticks both postman items; a mailbox only the first", () => {
    const api = readiness({ ...defaultState(), postmanName: "X", postmanKind: "api" });
    expect(api.done).toBe(2);
    const mailbox = readiness({ ...defaultState(), postmanName: "X", postmanKind: "mailbox" });
    expect(mailbox.items.find((i) => i.id === "postmanChosen")?.done).toBe(true);
    expect(mailbox.items.find((i) => i.id === "postmanAutomation")?.done).toBe(false);
  });

  test("a kind without a provider name is not a choice", () => {
    expect(readiness({ ...defaultState(), postmanKind: "xml" }).items.find((i) => i.id === "postmanChosen")?.done).toBe(false);
  });
});

test.describe("stored state", () => {
  test("garbage and missing storage fall back to the defaults", () => {
    expect(parseState(null)).toEqual(defaultState());
    expect(parseState("{not json")).toEqual(defaultState());
    expect(parseState('"text"')).toEqual(defaultState());
  });

  test("bad values are defaulted and unknown keys dropped", () => {
    const s = parseState(JSON.stringify({
      vatStatus: "maybe", postmanKind: "fax", accountantName: 42, checks: { poa: true, extra: true }, agenda: { volumes: "yes" },
    }));
    expect(s.vatStatus).toBe("nonPayer");
    expect(s.postmanKind).toBe("none");
    expect(s.accountantName).toBe("");
    expect(s.checks).toEqual({ ...defaultState().checks, poa: true });
    expect(s.agenda.volumes).toBe(false);
  });

  test("a saved state round-trips", () => {
    const saved = { ...defaultState(), vatStatus: "payer" as const, postmanName: "P", postmanKind: "xml" as const, accountantEmail: "a@b.sk" };
    expect(parseState(JSON.stringify(saved))).toEqual(saved);
  });
});

test("CSV escapes separators, quotes and new lines", () => {
  const csv = invoicesCsv(
    [{ key: "n", label: "Number" }, { key: "c", label: "Customer, country" }],
    [{ values: { n: "2026/001", c: 'Acme "EU"' } }, { values: { n: 2, c: "line\nbreak" } }]
  );
  expect(csv).toBe('Number,"Customer, country"\r\n2026/001,"Acme ""EU"""\r\n2,"line\nbreak"\r\n');
});

test("the agenda mailto encodes subject and body", () => {
  const href = agendaMailto(" acc@office.sk ", "Agenda & more", ["One", "Two"]);
  expect(href).toBe("mailto:acc%40office.sk?subject=Agenda%20%26%20more&body=-%20One%0A-%20Two");
});

test("every locale's copy covers every agenda item and readiness step", () => {
  const ids = readiness(defaultState()).items.map((i) => i.id);
  for (const locale of ["en", "sk", "es"]) {
    const copy = complianceCopy(locale);
    for (const id of AGENDA_IDS) expect(copy.agenda[id], `${locale}.${id}`).toBeTruthy();
    for (const id of ids) expect(copy.readiness[id]?.label, `${locale}.${id}`).toBeTruthy();
  }
  expect(complianceCopy("de")).toBe(complianceCopy("en"));
});

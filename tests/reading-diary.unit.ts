import { test } from "node:test";
import assert from "node:assert/strict";
import { appendEntry, localDate, parseDiary, parseSearchResults, persistDiary, quizVerdict, starterBooks, STORAGE_KEY, type Book, type Entry } from "../lib/reading-diary";

const starter = starterBooks("en")[0];
const external: Book = { id: "/works/OL123W", title: "A story", author: "Writer", source: "openlibrary" };
const reflection = ["The main character travels to a faraway land.", "They lose their way and ask a friend for help.", "The last scene shows everyone returning home safely."];
const valid = (book = starter) => ({ book, date: localDate(), rating: 5, answers: book.source === "starter" ? ["0", "1", "2"] : reflection });

test("every starter needs all correct answers; incomplete, wrong and forged options fail", () => {
  for (const book of starterBooks("en")) {
    assert.equal(quizVerdict(book, ["0", "1", "2"]).passed, true);
    for (const answers of [[], ["0", "1"], ["0", "1", "1"], ["0", "1", "9"], ["0", "1", "2", "3"]]) assert.equal(quizVerdict(book, answers).passed, false);
  }
  assert.throws(() => appendEntry([], { ...valid(), answers: ["0", "1", "1"] }));
});
test("catalogue book with an identical title never gets a starter answer key", () => {
  const sameTitle = { ...external, title: starter.title };
  assert.equal(quizVerdict(sameTitle, ["0", "1", "2"]).passed, false);
  assert.deepEqual(quizVerdict(sameTitle, reflection), { passed: true, score: null });
  for (const answers of [reflection.slice(1), [" ".repeat(25), ...reflection.slice(1)], ["x".repeat(1001), ...reflection.slice(1)]]) assert.equal(quizVerdict(external, answers).passed, false);
});
test("append validates non-future real dates, rating, book identity and quiz evidence", () => {
  const entries = appendEntry([], valid());
  assert.equal(entries.length, 1);
  assert.deepEqual(parseDiary(JSON.stringify({ version: 1, entries })), entries);
  assert.equal(parseDiary(null).length, 0);
  for (const patch of [{ date: "2026-02-30" }, { date: "2099-01-01" }, { date: "invalid" }, { rating: 0 }, { rating: 6 }, { rating: 1.5 }, { book: { ...starter, id: "unknown" } }, { book: { ...external, id: "javascript:bad" } }]) assert.throws(() => appendEntry([], { ...valid(), ...patch }));
  assert.throws(() => appendEntry(entries, valid()));
  assert.throws(() => parseDiary("bad JSON"));
  assert.throws(() => parseDiary(JSON.stringify({ version: 1, entries: [{ ...entries[0], answers: ["0", "0", "0"] }] })));
});
test("maximum 200 distinct books, with no duplicate IDs", () => {
  let entries: Entry[] = [];
  for (let i = 1; i <= 200; i++) entries = appendEntry(entries, valid({ ...external, id: `/works/OL${i}W` }));
  assert.throws(() => appendEntry(entries, valid({ ...external, id: "/works/OL201W" })));
  assert.throws(() => parseDiary(JSON.stringify({ version: 1, entries: [entries[0], { ...entries[1], id: entries[0].id }] })));
});
test("malformed catalogue documents and unsafe work IDs are discarded", () => {
  const books = parseSearchResults({ docs: [{ key: "/works/OL123W", title: "A book", author_name: ["Author"] }, { key: "/works/OL123W", title: "Duplicate" }, { key: "javascript:alert(1)", title: "Unsafe" }, { key: "/works/OL4W", title: "x".repeat(201) }, null, { key: "/works/OL5W", title: "No author" }] });
  assert.equal(books.length, 2);
  assert.equal(books[1].author, "");
  assert.throws(() => parseSearchResults({ error: true }));
});
test("storage denial, quota and stale data do not report a save or overwrite", () => {
  const entries = appendEntry([], valid());
  let raw: string | null = null;
  const storage = { getItem: (key: string) => { assert.equal(key, STORAGE_KEY); return raw; }, setItem: (_key: string, value: string) => { raw = value; } };
  const saved = persistDiary(storage, null, entries);
  assert.equal(raw, saved);
  assert.throws(() => persistDiary(storage, null, []));
  assert.equal(raw, saved);
  assert.throws(() => persistDiary({ getItem() { throw new Error("denied"); }, setItem() { assert.fail("must not write"); } }, null, entries));
  assert.throws(() => persistDiary({ getItem: () => null, setItem() { throw new Error("quota"); } }, null, entries));
  assert.equal(raw, saved);
});

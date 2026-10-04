import { z } from "zod";

export type Localized = { en: string; sk: string };
export type Question = { text: Localized; options: readonly Localized[]; correct: number };
export type Book = { id: string; title: string; author: string; source: "starter" | "openlibrary" };
const words = (en: string, sk: string): Localized => ({ en, sk });

// Authored questions refer to the original stories; no LLM-generated answer keys.
export const STARTER_BOOKS = [
  { id: "prince", title: words("The Little Prince", "Malý princ"), author: "Antoine de Saint-Exupéry", reference: "https://openlibrary.org/works/OL10263W", questions: [
    { text: words("What flower does the prince care for on his planet?", "O aký kvet sa princ stará na svojej planéte?"), options: [words("A rose", "Ruža"), words("A sunflower", "Slnečnica"), words("A tulip", "Tulipán")], correct: 0 },
    { text: words("Which animal teaches him about friendship?", "Ktoré zviera ho učí o priateľstve?"), options: [words("A wolf", "Vlk"), words("A fox", "Líška"), words("A bear", "Medveď")], correct: 1 },
    { text: words("Who meets the prince in the desert?", "Kto stretne princa na púšti?"), options: [words("A sailor", "Námorník"), words("A gardener", "Záhradník"), words("A pilot", "Pilot")], correct: 2 },
  ] },
  { id: "alice", title: words("Alice's Adventures in Wonderland", "Alica v krajine zázrakov"), author: "Lewis Carroll", reference: "https://www.gutenberg.org/ebooks/11", questions: [
    { text: words("Who does Alice follow down the rabbit hole?", "Koho Alica nasleduje do králičej nory?"), options: [words("The White Rabbit", "Bieleho králika"), words("A mouse", "Myš"), words("The Queen", "Kráľovnú")], correct: 0 },
    { text: words("What is unusual about the Cheshire Cat?", "Čím je nezvyčajná mačka Škľabka?"), options: [words("It flies", "Lieta"), words("It disappears, leaving its grin", "Zmizne a zostane po nej úsmev"), words("It never speaks", "Nikdy nehovorí")], correct: 1 },
    { text: words("Who keeps shouting 'Off with their heads!'?", "Kto stále kričí, aby im odťali hlavy?"), options: [words("The Hatter", "Klobučník"), words("The Rabbit", "Králik"), words("The Queen of Hearts", "Srdcová kráľovná")], correct: 2 },
  ] },
  { id: "oz", title: words("The Wonderful Wizard of Oz", "Čarodejník z krajiny Oz"), author: "L. Frank Baum", reference: "https://www.gutenberg.org/ebooks/55", questions: [
    { text: words("What is Dorothy's dog's name?", "Ako sa volá Dorotkin pes?"), options: [words("Toto", "Toto"), words("Max", "Max"), words("Rex", "Rex")], correct: 0 },
    { text: words("What does the Scarecrow ask the Wizard for?", "O čo žiada Strašiak čarodejníka?"), options: [words("A heart", "Srdce"), words("A brain", "Mozog"), words("A crown", "Korunu")], correct: 1 },
    { text: words("Which road leads to the Emerald City?", "Ktorá cesta vedie do Smaragdového mesta?"), options: [words("A red road", "Červená cesta"), words("A river", "Rieka"), words("The yellow brick road", "Cesta zo žltých tehál")], correct: 2 },
  ] },
] as const;

export const REFLECTION_QUESTIONS = [
  words("Who is the main character? Describe something they do in the story.", "Kto je hlavná postava? Opíš niečo, čo v príbehu urobí."),
  words("What problem happens in the story, and how is it resolved?", "Aký problém sa v príbehu objaví a ako sa vyrieši?"),
  words("Describe a scene you remember and explain why it matters.", "Opíš scénu, ktorú si pamätáš, a vysvetli, prečo je dôležitá."),
];
export function localized(value: Localized, locale: string) { return value[locale === "sk" ? "sk" : "en"]; }
export function starterBooks(locale: string): Book[] {
  return STARTER_BOOKS.map((b) => ({ id: b.id, title: localized(b.title, locale), author: b.author, source: "starter" }));
}
export function questionsFor(book: Book): readonly Question[] | null {
  return book.source === "starter" ? STARTER_BOOKS.find((b) => b.id === book.id)?.questions ?? null : null;
}
export function quizVerdict(book: Book, answers: string[]): { passed: boolean; score: number | null } {
  const questions = questionsFor(book);
  if (answers.length !== 3) return { passed: false, score: questions ? 0 : null };
  if (questions) {
    const score = questions.filter((q, i) => answers[i] === String(q.correct)).length;
    return { passed: score === questions.length, score };
  }
  return { passed: answers.every((a) => a.trim().length >= 20 && a.trim().length <= 1000), score: null };
}

const bookSchema = z.object({ id: z.string().min(1).max(100), title: z.string().trim().min(1).max(200), author: z.string().max(200), source: z.enum(["starter", "openlibrary"]) }).superRefine((b, ctx) => {
  if (b.source === "starter" ? !STARTER_BOOKS.some((s) => s.id === b.id && s.author === b.author && Object.values(s.title).includes(b.title)) : !/^\/works\/OL\d+W$/.test(b.id)) ctx.addIssue({ code: "custom", message: "Invalid book" });
});
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && s <= localDate() && s >= "1900-01-01";
});
const entrySchema = z.object({ id: z.string().uuid(), book: bookSchema, date: dateSchema, rating: z.number().int().min(1).max(5), answers: z.array(z.string().max(1000)).length(3), createdAt: z.string().datetime() }).refine((e) => quizVerdict(e.book, e.answers).passed, "Quiz required");
const diarySchema = z.object({ version: z.literal(1), entries: z.array(entrySchema).max(200) }).superRefine((d, ctx) => {
  if (new Set(d.entries.map((e) => e.book.id)).size !== d.entries.length || new Set(d.entries.map((e) => e.id)).size !== d.entries.length) ctx.addIssue({ code: "custom", message: "Duplicate entry" });
});
export type Entry = z.infer<typeof entrySchema>;
export const STORAGE_KEY = "tokenwise:reading-diary:v1";
export function parseDiary(raw: string | null): Entry[] {
  if (raw === null) return [];
  if (raw.length > 1_000_000) throw new Error("Invalid diary");
  return diarySchema.parse(JSON.parse(raw)).entries;
}
export function appendEntry(entries: Entry[], input: Omit<Entry, "id" | "createdAt">): Entry[] {
  return diarySchema.parse({ version: 1, entries: [{ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...entries] }).entries;
}
// Compare before writing: stale tabs must never silently overwrite another tab's work.
export function persistDiary(storage: Pick<Storage, "getItem" | "setItem">, expected: string | null, entries: Entry[]): string {
  if (storage.getItem(STORAGE_KEY) !== expected) throw new Error("Diary changed in another tab");
  const raw = JSON.stringify(diarySchema.parse({ version: 1, entries }));
  storage.setItem(STORAGE_KEY, raw);
  return raw;
}

export function parseSearchResults(payload: unknown): Book[] {
  const parsed = z.object({ docs: z.array(z.unknown()) }).parse(payload);
  const books: Book[] = [];
  for (const value of parsed.docs.slice(0, 24)) {
    const doc = z.object({ key: z.string().regex(/^\/works\/OL\d+W$/), title: z.string().trim().min(1).max(200), author_name: z.array(z.string().max(200)).optional() }).safeParse(value);
    if (doc.success && !books.some((b) => b.id === doc.data.key)) books.push({ id: doc.data.key, title: doc.data.title, author: (doc.data.author_name ?? []).join(", ").slice(0, 200), source: "openlibrary" });
  }
  return books;
}
export async function searchBooks(query: string, signal: AbortSignal): Promise<Book[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 150) throw new Error("Invalid query");
  const url = new URL("https://openlibrary.org/search.json");
  url.search = new URLSearchParams({ q, limit: "12", fields: "key,title,author_name" }).toString();
  const response = await fetch(url, { signal, credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error("Book catalogue unavailable");
  return parseSearchResults(await response.json());
}

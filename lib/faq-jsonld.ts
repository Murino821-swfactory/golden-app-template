/** The FAQ as schema.org FAQPage JSON-LD (golden rule 3, SEO + GEO). `<` is escaped so
 * model-written text can never close the <script> element it is embedded in. */
export function faqJsonLd(items: ReadonlyArray<{ question: string; answer: string }>): string {
  const doc = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return JSON.stringify(doc).replace(/</g, "\\u003c");
}

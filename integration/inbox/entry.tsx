import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import MessagesPage from "../../app/[locale]/messages/page";
import en from "../../messages/en.json";
import sk from "../../messages/sk.json";
import de from "../../messages/de.json";
const locale = location.pathname.split("/")[1];
const bundles = { en, sk, de };
const language = locale === "sk" || locale === "de" ? locale : "en";
document.documentElement.lang = language;
createRoot(document.getElementById("root")!).render(
  <NextIntlClientProvider locale={language} messages={bundles[language]} timeZone="UTC">
    <MessagesPage />
  </NextIntlClientProvider>
);

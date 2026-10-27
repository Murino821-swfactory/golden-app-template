import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import DashboardPage from "../../app/[locale]/dashboard/page";
import { Header } from "../../components/layout/header";
import { Footer } from "../../components/layout/footer";
import { AuthProvider } from "./adapters";
import en from "../../messages/en.json";
import sk from "../../messages/sk.json";
import de from "../../messages/de.json";

const segment = location.pathname.split("/")[1];
const language = segment === "sk" || segment === "de" ? segment : "en";
document.documentElement.lang = language;
createRoot(document.getElementById("root")!).render(
  <NextIntlClientProvider locale={language} messages={{ en, sk, de }[language]} timeZone="UTC">
    <AuthProvider><Header /><main><DashboardPage /></main><Footer /></AuthProvider>
  </NextIntlClientProvider>
);

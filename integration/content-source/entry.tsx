import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import DashboardPage from "../../app/[locale]/dashboard/page";
import { AuthProvider } from "./adapters";
import en from "../../messages/en.json";
import cs from "../../messages/cs.json";

const language = location.pathname.split("/")[1] === "cs" ? "cs" : "en";
document.documentElement.lang = language;
createRoot(document.getElementById("root")!).render(
  <NextIntlClientProvider locale={language} messages={{ en, cs }[language]} timeZone="UTC">
    <AuthProvider><main><DashboardPage /></main></AuthProvider>
  </NextIntlClientProvider>
);

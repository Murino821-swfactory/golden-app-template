import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { ThemeBootstrap } from "@tokenwise/shared-ui";
import DashboardPage from "../../app/[locale]/dashboard/page";
import { AuthProvider } from "./adapters";
import en from "../../messages/en.json";
import sk from "../../messages/sk.json";

const language = location.pathname.split("/")[1] === "sk" ? "sk" : "en";
document.documentElement.lang = language;
document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(
  <NextIntlClientProvider locale={language} messages={{ en, sk }[language]} timeZone="Europe/Bratislava">
    {/* The real palettes, so a screenshot of the fixture is the prototype's own colours. */}
    <ThemeBootstrap palettes appearance="dark" />
    <AuthProvider><main><DashboardPage /></main></AuthProvider>
  </NextIntlClientProvider>
);

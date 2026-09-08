import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
      <p>
        &copy; {new Date().getFullYear()} {t("appName")}
      </p>
    </footer>
  );
}

import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "en"; // Static export: single locale at build time

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

/**
 * The root layout is a pass-through.
 *
 * Next requires a layout at `app/`, but `<html lang>` changes per language, so the real
 * document is built by `app/[locale]/layout.tsx`. The only other route at this level is the
 * root redirect, which renders its own `<html>` because it is a whole document in itself
 * rather than a page inside the app.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

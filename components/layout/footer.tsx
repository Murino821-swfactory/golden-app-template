import { config } from "@/lib/prototype-config";

/** Names the customer's app, like the header — see the note in header.tsx. */
export function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
      <p>
        &copy; {new Date().getFullYear()} {config.appName}
      </p>
    </footer>
  );
}

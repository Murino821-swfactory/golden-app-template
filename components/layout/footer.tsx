import { config } from "@/lib/prototype-config";

// The customer's name comes from the config, never from messages/en.json ("Golden App").
export function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
      <p>
        &copy; {new Date().getFullYear()} {config.appName}
      </p>
    </footer>
  );
}

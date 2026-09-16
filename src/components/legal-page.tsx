import { Link } from "@tanstack/react-router";
import { ArrowLeft, Flame } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="ocean-premium min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3 font-display text-lg font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Flame className="size-4" />
            </span>
            Knowly
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft /> Back home</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-6xl">{title}</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{intro}</p>
        <p className="mt-5 text-xs text-muted-foreground">Effective September 12, 2026</p>
        <div className="legal-copy mt-14 space-y-10">{children}</div>
      </main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-6 text-sm text-muted-foreground">
          <span>© 2026 Knowly</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
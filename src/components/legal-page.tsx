import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flame } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CopyrightNotice } from "@/components/copyright-notice";

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
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b-[3px] border-border bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <Link to="/" className="flex min-w-0 items-center gap-3 font-display text-lg font-bold">
            <span className="grid size-9 place-items-center rounded-lg border-[3px] border-border bg-surface text-primary shadow-[2px_2px_0_0_var(--shadow-ink)]">
              <Flame className="size-4" />
            </span>
            Knowly
          </Link>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft /> Back
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Open Knowly</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-6xl">{title}</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{intro}</p>
        <p className="mt-5 text-xs text-muted-foreground">Effective November 25, 2026</p>
        <div className="legal-copy mt-14 space-y-10">{children}</div>
      </main>
      <footer className="border-t-[3px] border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-6 text-sm text-muted-foreground">
          <CopyrightNotice className="basis-full" />
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
        <div className="mx-auto mt-6 max-w-3xl border-t-[2px] border-border px-6 pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          <p>
            Made with love by Frederic Liam De Guzman, for the kind students of the School of Our
            Lady of La Salette.
          </p>
          <p className="mt-1">To God be all the glory! 🙏</p>
        </div>
      </footer>
    </div>
  );
}

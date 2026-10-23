import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface TourStep {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
}

export function useFeatureTour(storageKey: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Private browsing can disable storage. Dismissing still works for this session.
    }
    setOpen(false);
  };

  return { open, setOpen, dismiss, replay: () => setOpen(true) };
}

export function FeatureTour({
  open,
  onOpenChange,
  onDismiss,
  steps,
  product,
  finishLabel = "Start exploring",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
  steps: TourStep[];
  product: string;
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!step) return null;

  const Icon = step.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onDismiss();
      }}
    >
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <div className="grid sm:grid-cols-[0.82fr_1.18fr]">
          <div className="relative flex min-h-52 flex-col overflow-hidden bg-surface-2 p-6 text-foreground sm:min-h-[460px] sm:p-7">
            <div
              aria-hidden
              className="absolute -right-24 -top-20 size-72 rounded-full bg-primary/50 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 -left-20 size-64 rounded-full bg-accent/30 blur-3xl"
            />
            <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              {product}
            </div>
            <div className="relative mt-8 flex flex-1 items-center justify-center sm:mt-0">
              <div className="relative grid size-32 place-items-center rounded-[2rem] border border-primary/20 bg-primary/10 shadow-2xl backdrop-blur-xl">
                <div
                  aria-hidden
                  className="absolute inset-3 rounded-[1.45rem] border border-primary/15"
                />
                <Icon className="relative size-14" strokeWidth={1.4} />
              </div>
            </div>
            <div className="relative mt-6 sm:mt-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                Step {index + 1} of {steps.length}
              </p>
              <p className="mt-2 hidden max-w-[15rem] text-sm leading-6 text-muted-foreground sm:block">
                Small, focused improvements that make studying feel lighter.
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-5 sm:min-h-[460px] sm:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {step.eyebrow}
              </p>
            </div>

            <div key={index} className="anim-fade-up mt-5">
              <DialogTitle className="font-display text-2xl leading-tight sm:text-3xl">
                {step.title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-sm leading-6">
                {step.description}
              </DialogDescription>
              <ul className="mt-5 space-y-2.5">
                {step.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-sm leading-5"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-7">
              <div className="mb-4 flex gap-1.5">
                {steps.map((item, dotIndex) => (
                  <button
                    key={item.title}
                    type="button"
                    aria-label={`Go to step ${dotIndex + 1}`}
                    onClick={() => setIndex(dotIndex)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      dotIndex === index
                        ? "w-7 bg-primary"
                        : "w-1.5 bg-border hover:bg-muted-foreground/40",
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                      <ArrowLeft className="size-4" /> Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      if (last) onDismiss();
                      else setIndex(index + 1);
                    }}
                  >
                    {last ? finishLabel : "Next"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

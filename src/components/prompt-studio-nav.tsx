import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "deck", label: "Deck", description: "Question bank", to: "/generate" },
  { id: "course", label: "Course", description: "Modules and lessons", to: "/courses/forge" },
  { id: "module", label: "Module", description: "One focused lesson", to: "/modules/prompter" },
] as const;

export function PromptStudioNav({ active }: { active: (typeof MODES)[number]["id"] }) {
  return (
    <section className="panel p-3" aria-label="Prompt Studio output type">
      <p className="px-1 text-xs font-semibold text-muted-foreground">What are you making?</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {MODES.map((mode) => (
          <Link
            key={mode.id}
            to={mode.to}
            aria-current={active === mode.id ? "page" : undefined}
            className={cn(
              "rounded-xl border px-3 py-2 text-center transition-colors",
              active === mode.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            <span className="block text-sm font-semibold">{mode.label}</span>
            <span className="mt-0.5 block text-[10px] leading-tight">{mode.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Download,
  Hammer,
  Layers,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKnowly } from "@/store/knowly";
import type { Module } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/modules/")({
  head: () => ({
    meta: [
      { title: "Modules — Standalone Lessons | Knowly" },
      {
        name: "description",
        content:
          "Your library of standalone one-off lessons: notes, blurbs, checkpoint questions and activity squares that launch your decks.",
      },
    ],
  }),
  component: ModulesIndex,
});

const DIFFICULTY_LABEL = ["", "Intro", "Core", "Advanced"] as const;

function modulePercent(
  module: Module,
  progress: { status: string; questionStats?: Record<string, { correct: number }> } | undefined,
): number {
  if (progress?.status === "completed") return 100;
  const stats = progress?.questionStats ?? {};
  const attempted = Object.keys(stats).length;
  if (!module.questions.length || !attempted) return progress?.status === "in-progress" ? 15 : 0;
  const correct = Object.values(stats).filter((s) => s.correct > 0).length;
  return Math.min(90, Math.round((correct / module.questions.length) * 100));
}

function ModulesIndex() {
  const { state, deleteModule } = useKnowly();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return state.modules;
    return state.modules.filter((module) =>
      [module.title, module.subject, module.tags.join(" ")].join(" ").toLowerCase().includes(term),
    );
  }, [state.modules, query]);

  return (
    <AppPage>
      <PageHeader
        title="Modules"
        description="Standalone one-off lessons — a single idea, fully editable, with blurbs, checkpoints and activity squares."
        action={
          <>
            <Button asChild variant="outline">
              <Link to="/modules/import">
                <Download className="size-4" /> Import module
              </Link>
            </Button>
            <Button asChild>
              <Link to="/modules/prompter">
                <Plus className="size-4" /> Module Prompter
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, subjects or tags…"
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{state.modules.length} modules</Badge>
      </div>

      {filtered.length === 0 ? (
        <EmptyModules hasModules={state.modules.length > 0} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((module) => (
            <ModuleCard key={module.id} module={module} onDelete={deleteModule} />
          ))}
        </div>
      )}
    </AppPage>
  );
}

function ModuleCard({ module, onDelete }: { module: Module; onDelete: (id: string) => void }) {
  const { state } = useKnowly();
  const progress = state.moduleProgress[module.id];
  const percent = modulePercent(module, progress);
  const activityCount = module.blocks.filter((block) => block.type === "activity").length;
  const blurbCount = module.blocks.filter((block) => block.type === "callout").length;

  return (
    <div className="panel group relative flex min-w-0 flex-col overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: module.color }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <Link
            to="/modules/$moduleId"
            params={{ moduleId: module.id }}
            className="flex min-w-0 flex-1 items-start gap-3"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface2 text-2xl ring-1 ring-border">
              {module.emoji || "📘"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-display text-lg font-semibold">{module.title}</h2>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {module.subject} · {DIFFICULTY_LABEL[module.difficulty]}
              </p>
            </div>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Delete ${module.title}`}
            onClick={() => {
              onDelete(module.id);
              toast.success("Module deleted");
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {module.objectives[0] && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {module.objectives[0]}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="outline">{module.blocks.length} blocks</Badge>
          {blurbCount > 0 && <Badge variant="outline">{blurbCount} blurbs</Badge>}
          <Badge variant="outline">{module.questions.length} checkpoints</Badge>
          {activityCount > 0 && <Badge variant="outline">{activityCount} activities</Badge>}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progress?.status === "completed"
                ? "Complete"
                : progress?.status === "in-progress"
                  ? "In progress"
                  : "Not started"}
            </span>
            <span className="font-semibold">{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(percent, percent ? 6 : 0)}%`, background: module.color }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="truncate text-muted-foreground">{module.estimatedMinutes} min</span>
          <Button size="sm" variant="ghost" className="h-7" asChild>
            <Link to="/modules/$moduleId" params={{ moduleId: module.id }}>
              Open module
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyModules({ hasModules }: { hasModules: boolean }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
        {hasModules ? <Search className="size-7" /> : <BookOpen className="size-7" />}
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">
        {hasModules ? "No modules match that search" : "Your first module starts here"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasModules
          ? "Try a different title, subject or tag."
          : "Get instructions for your AI with Module Prompter, bring a module file in, or hand-build one block by block."}
      </p>
      {!hasModules && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/modules/prompter">
              <Plus className="size-4" /> Module Prompter
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/modules/forge">
              <Hammer className="size-4" /> Module Forge
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/modules/import">
              <Layers className="size-4" /> Add a module file
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

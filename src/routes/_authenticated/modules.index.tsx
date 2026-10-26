import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Module } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/modules/")({
  head: () => ({
    meta: [{ title: "Modules — Standalone Lessons | Knowly" }],
  }),
  component: () => (
    <AppPage>
      <ModulesIndex />
    </AppPage>
  ),
});

function ModulesIndex() {
  const { state, addModule, deleteModule } = useKnowly();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");

  const filtered = state.modules.filter((m) =>
    [m.title, m.subject, m.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const create = () => {
    if (!title.trim()) return;
    const now = Date.now();
    const mod: Module = {
      id: `mod_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`,
      title: title.trim(),
      subject: subject.trim() || "General",
      color: "#6d8cff",
      emoji: "📘",
      tags: [],
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
      objectives: [],
      blocks: [
        { id: `b_${now}`, type: "markdown", markdown: "# " + title.trim() + "\n\nStart writing…" },
      ],
      questions: [],
      linkedDeckIds: [],
      estimatedMinutes: 15,
      difficulty: 2,
      createdAt: now,
      updatedAt: now,
    };
    addModule(mod);
    setCreating(false);
    setTitle("");
    setSubject("");
    toast.success("Module created");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Modules"
        description="Standalone one-off lessons. Each module is a single idea, fully editable, with checkpoints and activity squares."
      />
      <Badge variant="outline" className="w-fit">
        {state.modules.length} modules
      </Badge>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules…"
          className="max-w-xs"
        />
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New module
        </Button>
      </div>

      {creating && (
        <div className="panel grid gap-3 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Photosynthesis in 10 minutes"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Biology"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={!title.trim()}>
              Create
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="grid min-h-48 place-items-center text-muted-foreground">
          No modules yet. Create your first standalone lesson.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const progress = state.moduleProgress[m.id];
            return (
              <div key={m.id} className="panel group relative p-4">
                <Link
                  to={"/modules/$moduleId" as never}
                  params={{ moduleId: m.id } as never}
                  className="block space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold">{m.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.subject}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant="outline">{DIFFICULTY_LABEL[m.difficulty]}</Badge>
                    <Badge variant="outline">{m.estimatedMinutes} min</Badge>
                    <Badge variant="outline">{m.linkedDeckIds.length} activities</Badge>
                    <Badge variant="outline">{progress?.status ?? "not-started"}</Badge>
                  </div>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 size-7 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    deleteModule(m.id);
                    toast.success("Module deleted");
                  }}
                  aria-label="Delete module"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const DIFFICULTY_LABEL = ["", "Intro", "Core", "Advanced"] as const;

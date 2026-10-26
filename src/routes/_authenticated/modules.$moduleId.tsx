import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Lightbulb,
  Pencil,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import { serializeModuleJson } from "@/lib/module-schema";
import type { CourseBlock, Module } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/modules/$moduleId")({
  head: () => ({
    meta: [{ title: "Module — Knowly" }],
  }),
  component: () => (
    <AppPage>
      <ModuleEditor />
    </AppPage>
  ),
});

const DIFFICULTY_LABEL = ["", "Intro", "Core", "Advanced"] as const;

function ModuleEditor() {
  const { moduleId } = Route.useParams() as { moduleId: string };
  const navigate = useNavigate();
  const {
    state,
    updateModule,
    deleteModule,
    updateModuleProgress,
    recordModuleQuestion,
    recordSession,
  } = useKnowly();
  const module = state.modules.find((m) => m.id === moduleId);
  const progress = module ? state.moduleProgress[module.id] : undefined;
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  if (!module) {
    return (
      <div className="grid min-h-64 place-items-center text-muted-foreground">
        Module not found.{" "}
        <Link to={"/modules" as never} className="ml-2 text-primary underline">
          Back to modules
        </Link>
      </div>
    );
  }

  const patch = (p: Partial<Module>) => updateModule(module.id, p);
  const blockPatch = (id: string, p: Partial<CourseBlock>) =>
    patch({ blocks: module.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) });

  const addBlock = (type: CourseBlock["type"]) => {
    const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const block: CourseBlock =
      type === "markdown"
        ? { id, type: "markdown", markdown: "" }
        : type === "callout"
          ? { id, type: "callout", tone: "info", title: "Note", markdown: "" }
          : type === "example"
            ? { id, type: "example", title: "Example", markdown: "" }
            : type === "checkpoint"
              ? { id, type: "checkpoint", questionId: `q_${id}` }
              : type === "divider"
                ? { id, type: "divider" }
                : { id, type: "image", url: "", alt: "", caption: "" };
    patch({ blocks: [...module.blocks, block] });
    // ensure a checkpoint question exists
    if (type === "checkpoint") {
      const qId = (block as { questionId: string }).questionId;
      if (!module.questions.some((q) => q.id === qId)) {
        patch({
          questions: [
            ...module.questions,
            {
              id: qId,
              type: "short-answer",
              question: "Checkpoint question",
              answer: "",
              explanation: "",
              difficulty: "medium",
            },
          ],
        });
      }
    }
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = module.blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= module.blocks.length) return;
    const next = [...module.blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    patch({ blocks: next });
  };

  const removeBlock = (id: string) => {
    patch({ blocks: module.blocks.filter((b) => b.id !== id) });
  };

  const markComplete = () => {
    updateModuleProgress(module.id, (p) => ({
      ...p,
      status: "completed",
      completedAt: Date.now(),
    }));
    recordSession({
      mode: "study",
      deckIds: module.linkedDeckIds,
      deckTitles: [module.title],
      answered: module.questions.length,
      correct: module.questions.length,
      skipped: 0,
      durationMs: (module.estimatedMinutes ?? 15) * 60_000,
      xpEarned: 25,
      bestCombo: 0,
      masteredIds: {},
      conceptStats: {},
    });
    toast.success("Module complete — +25 XP");
  };

  const importActivity = () => {
    const deck = state.decks[0];
    if (!deck) {
      toast.info("Create a deck first, then import it here.");
      return;
    }
    const id = `b_${Date.now()}`;
    patch({
      blocks: [
        ...module.blocks,
        {
          id,
          type: "activity" as CourseBlock["type"],
          markdown: deck.id,
          title: deck.title,
        } as CourseBlock,
      ],
      linkedDeckIds: Array.from(new Set([...module.linkedDeckIds, deck.id])),
    });
    toast.success(`Imported “${deck.title}” as an activity square`);
  };

  const objectivesDone = progress?.status === "completed" ? module.objectives.length : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/modules" } as never)}>
          <ArrowLeft className="size-4" /> Modules
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const json = serializeModuleJson(module);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `${module.title.replace(/[\\/:*?"<>|]+/g, "-").trim() || "module"} — knowly module.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              toast.success("Module file downloaded");
            }}
          >
            <Download className="size-4" /> <span className="hidden sm:inline">Export JSON</span>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/modules/$moduleId/print" params={{ moduleId: module.id }}>
              <Printer className="size-4" /> <span className="hidden sm:inline">Print</span>
            </Link>
          </Button>
          <Label className="text-xs text-muted-foreground">Edit</Label>
          <Switch checked={editing} onCheckedChange={setEditing} />
        </div>
      </div>

      <PageHeader title={module.title} description={module.subject} />
      <div className="-mt-2">
        <Badge variant="outline" className="gap-1">
          {module.emoji} Module · {DIFFICULTY_LABEL[module.difficulty]}
        </Badge>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5" /> {module.estimatedMinutes} min
        </span>
        <Badge variant="outline">{progress?.status ?? "not-started"}</Badge>
        {module.linkedDeckIds.length > 0 && (
          <Badge variant="outline">{module.linkedDeckIds.length} activities</Badge>
        )}
        <Button size="sm" variant="outline" onClick={markComplete} className="ml-auto">
          <CheckCircle2 className="size-4" /> Mark complete
        </Button>
      </div>

      {/* Objectives */}
      <section className="panel p-4">
        <h3 className="mb-2 font-display text-sm font-semibold">Objectives</h3>
        {editing ? (
          <Textarea
            value={module.objectives.join("\n")}
            onChange={(e) =>
              patch({
                objectives: e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="One objective per line"
            className="min-h-20"
          />
        ) : module.objectives.length ? (
          <ul className="space-y-1 text-sm">
            {module.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 text-success" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No objectives yet — add some in Edit mode.
          </p>
        )}
      </section>

      {/* Title + subject (edit) */}
      {editing && (
        <section className="panel grid gap-3 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={module.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={module.subject} onChange={(e) => patch({ subject: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <Input value={module.emoji} onChange={(e) => patch({ emoji: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <Input value={module.color} onChange={(e) => patch({ color: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select
              value={String(module.difficulty)}
              onValueChange={(v) => patch({ difficulty: Number(v) as 1 | 2 | 3 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Intro</SelectItem>
                <SelectItem value="2">Core</SelectItem>
                <SelectItem value="3">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estimated minutes</Label>
            <Input
              type="number"
              value={module.estimatedMinutes}
              onChange={(e) => patch({ estimatedMinutes: Number(e.target.value) || 15 })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tags (comma separated)</Label>
            <Input
              value={module.tags.join(", ")}
              onChange={(e) =>
                patch({
                  tags: e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </section>
      )}

      {/* Blocks */}
      <section className="space-y-4">
        {module.blocks.map((block, idx) => (
          <BlockView
            key={block.id}
            block={block}
            editing={editing}
            module={module}
            reveal={!!reveal[block.id]}
            onReveal={() => setReveal((r) => ({ ...r, [block.id]: true }))}
            onChange={(p) => blockPatch(block.id, p)}
            onMove={(dir) => moveBlock(block.id, dir)}
            onRemove={() => removeBlock(block.id)}
            isFirst={idx === 0}
            isLast={idx === module.blocks.length - 1}
            decks={state.decks}
            onAnswer={(qid, correct) => recordModuleQuestion(module.id, qid, correct)}
            onQuestionChange={(qid, p) => {
              updateModule(module.id, {
                questions: module.questions.map((qq) => (qq.id === qid ? { ...qq, ...p } : qq)),
              });
            }}
          />
        ))}
      </section>

      {editing && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => addBlock("markdown")}>
            <Plus className="size-4" /> Note
          </Button>
          <Button size="sm" variant="outline" onClick={() => addBlock("callout")}>
            <Plus className="size-4" /> Callout
          </Button>
          <Button size="sm" variant="outline" onClick={() => addBlock("example")}>
            <Plus className="size-4" /> Example
          </Button>
          <Button size="sm" variant="outline" onClick={() => addBlock("checkpoint")}>
            <Plus className="size-4" /> Checkpoint
          </Button>
          <Button size="sm" variant="outline" onClick={() => addBlock("divider")}>
            <Plus className="size-4" /> Divider
          </Button>
          <Button size="sm" variant="outline" onClick={importActivity}>
            <Plus className="size-4" /> Activity square
          </Button>
        </div>
      )}

      {editing && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              deleteModule(module.id);
              navigate({ to: "/modules" } as never);
            }}
          >
            <Trash2 className="size-4" /> Delete module
          </Button>
        </div>
      )}
    </div>
  );
}

interface BlockViewProps {
  block: CourseBlock;
  editing: boolean;
  module: Module;
  reveal: boolean;
  onReveal: () => void;
  onChange: (p: Partial<CourseBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
  decks: { id: string; title: string; questions: { id: string }[] }[];
  onAnswer: (qid: string, correct: boolean) => void;
  onQuestionChange: (
    qid: string,
    patch: { question?: string; answer?: string; explanation?: string },
  ) => void;
}

function BlockView({
  block,
  editing,
  module,
  reveal,
  onReveal,
  onChange,
  onMove,
  onRemove,
  isFirst,
  isLast,
  decks,
  onAnswer,
  onQuestionChange,
}: BlockViewProps) {
  const q =
    block.type === "checkpoint"
      ? module.questions.find((qq) => qq.id === block.questionId)
      : undefined;

  if (editing) {
    return (
      <div className="panel space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] uppercase">
            {block.type}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={isFirst}
              onClick={() => onMove(-1)}
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={isLast}
              onClick={() => onMove(1)}
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7" onClick={onRemove}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        {block.type === "markdown" && (
          <Textarea
            value={block.markdown ?? ""}
            onChange={(e) => onChange({ markdown: e.target.value })}
            placeholder="Write markdown (LaTeX with $…$ supported)…"
            className="min-h-28 font-mono text-sm"
          />
        )}
        {(block.type === "callout" || block.type === "example") && (
          <>
            <Input
              value={block.title ?? ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Title"
            />
            <Textarea
              value={block.markdown ?? ""}
              onChange={(e) => onChange({ markdown: e.target.value })}
              placeholder="Body markdown…"
              className="min-h-24"
            />
            {block.type === "callout" && (
              <Select
                value={block.tone ?? "info"}
                onValueChange={(v) =>
                  onChange({ tone: v as "info" | "tip" | "warning" | "definition" })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                  <SelectItem value="warning">Warn</SelectItem>
                  <SelectItem value="definition">Key</SelectItem>
                </SelectContent>
              </Select>
            )}
          </>
        )}
        {block.type === "checkpoint" && q && (
          <>
            <Input
              value={q.question}
              onChange={(e) => onQuestionChange(q.id, { question: e.target.value })}
              placeholder="Question"
            />
            <Textarea
              value={q.answer ?? ""}
              onChange={(e) => onQuestionChange(q.id, { answer: e.target.value })}
              placeholder="Expected answer / explanation"
              className="min-h-16"
            />
          </>
        )}
        {block.type === "image" && (
          <>
            <Input
              value={block.url ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="Image URL or data URL"
            />
            <Input
              value={block.alt ?? ""}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="Alt text"
            />
          </>
        )}
        {block.type === "activity" && (
          <Input
            value={block.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Activity title"
          />
        )}
      </div>
    );
  }

  // View mode
  if (block.type === "markdown") {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {block.markdown || "_Empty note_"}
        </ReactMarkdown>
      </div>
    );
  }
  if (block.type === "callout") {
    const tone = block.tone ?? "info";
    const cls =
      tone === "warning"
        ? "border-warning/40 bg-warning/10"
        : tone === "definition"
          ? "border-primary/40 bg-primary/10"
          : tone === "tip"
            ? "border-success/40 bg-success/10"
            : "border-border bg-surface/60";
    return (
      <div className={`rounded-xl border p-4 ${cls}`}>
        {block.title && <p className="mb-1 font-semibold">{block.title}</p>}
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {block.markdown || ""}
        </ReactMarkdown>
      </div>
    );
  }
  if (block.type === "example") {
    return (
      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Lightbulb className="size-3.5" /> {block.title || "Example"}
        </p>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {block.markdown || ""}
        </ReactMarkdown>
      </div>
    );
  }
  if (block.type === "divider") {
    return <hr className="border-border" />;
  }
  if (block.type === "image") {
    return block.url ? (
      <figure className="overflow-hidden rounded-xl border border-border">
        <img src={block.url} alt={block.alt ?? ""} className="w-full" />
        {block.caption && (
          <figcaption className="p-2 text-xs text-muted-foreground">{block.caption}</figcaption>
        )}
      </figure>
    ) : null;
  }
  if (block.type === "checkpoint") {
    const question = q;
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="size-3.5" /> Checkpoint
        </p>
        <p className="mb-3 font-medium">{question?.question ?? "Checkpoint"}</p>
        {!reveal ? (
          <Button size="sm" variant="outline" onClick={onReveal}>
            Reveal answer
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{q?.answer || q?.explanation}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onAnswer(question!.id, true);
                  toast.success("Marked correct");
                }}
              >
                <Check className="size-4" /> Got it
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onAnswer(question!.id, false);
                  toast.info("We'll revisit this");
                }}
              >
                <X className="size-4" /> Missed
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  if (block.type === "activity") {
    const deck = decks.find((d) => d.id === block.markdown);
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <BookOpenCheck className="size-3.5" /> Activity square
        </p>
        <p className="mb-3 font-medium">{block.title || "Imported activity"}</p>
        {deck ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{deck.title}</Badge>
            <Badge variant="outline">{deck.questions.length} cards</Badge>
            <Button size="sm" asChild>
              <Link to={"/study/$deckId" as never} params={{ deckId: deck.id } as never}>
                Start session
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No deck linked yet. Add one in Edit mode.</p>
        )}
      </div>
    );
  }
  return null;
}

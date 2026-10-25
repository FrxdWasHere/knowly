import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Hammer,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  questionTypes,
  validateDeckJson,
  validateQuestionsJson,
  type ValidationResult,
  type QuestionsValidationResult,
} from "@/lib/schema";
import { BLANK_TOKEN, countBlanks } from "@/lib/interactive";
import { TYPE_LABELS } from "@/lib/answers";
import { createId } from "@/lib/id";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Difficulty, QuestionType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/forge")({
  validateSearch: (search: Record<string, unknown>): { deck?: string } => ({
    deck: typeof search.deck === "string" ? search.deck : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Deck Forge — Write Your Own Questions | Knowly" },
      {
        name: "description",
        content:
          "Build decks by hand in Knowly. Write flashcards, multiple choice, true/false, fill-in-the-blank, short answer, ordering, matching and word-bank questions with hints, concepts and explanations.",
      },
      { property: "og:title", content: "Deck Forge — Knowly" },
      {
        property: "og:description",
        content: "Craft your own question decks manually — every question type, every field.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <ForgePage />
    </AppPage>
  ),
});

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface DraftQuestion {
  key: string;
  type: QuestionType;
  question: string;
  answer: string;
  options: string[];
  items: string[];
  pairs: { left: string; right: string }[];
  blanks: string[];
  wordBank: string[];
  explanation: string;
  difficulty: Difficulty;
  concept: string;
  hint: string;
  tags: string;
}

const newKey = () => createId();

function blankQuestion(type: QuestionType = "flashcard"): DraftQuestion {
  return {
    key: newKey(),
    type,
    question: "",
    answer: type === "true-false" ? "true" : "",
    options: type === "multiple-choice" ? ["", "", "", ""] : [],
    items: type === "ordering" ? ["", ""] : [],
    pairs:
      type === "matching"
        ? [
            { left: "", right: "" },
            { left: "", right: "" },
          ]
        : [],
    blanks: [],
    wordBank: [],
    explanation: "",
    difficulty: "medium",
    concept: "",
    hint: "",
    tags: "",
  };
}

/** Converts a draft into the JSON shape the deck schema expects. */
function toPayload(d: DraftQuestion) {
  const base: Record<string, unknown> = {
    type: d.type,
    question: d.question,
    difficulty: d.difficulty,
  };
  if (d.explanation.trim()) base.explanation = d.explanation.trim();
  if (d.concept.trim()) base.concept = d.concept.trim();
  if (d.hint.trim()) base.hint = d.hint.trim();
  const tags = d.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length) base.tags = tags;

  switch (d.type) {
    case "multiple-choice":
      base.options = d.options.map((o) => o.trim()).filter(Boolean);
      base.answer = d.answer;
      break;
    case "ordering":
      base.items = d.items.map((i) => i.trim()).filter(Boolean);
      break;
    case "matching":
      base.pairs = d.pairs
        .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
        .filter((p) => p.left || p.right);
      break;
    case "word-bank":
      base.blanks = d.blanks.map((b) => b.trim());
      base.wordBank = [...d.blanks, ...d.wordBank].map((w) => w.trim()).filter(Boolean);
      break;
    default:
      base.answer = d.answer;
  }
  return base;
}

function ForgePage() {
  const { state, addDeck, addQuestions } = useKnowly();
  const navigate = useNavigate();
  const { deck: deckParam } = Route.useSearch();

  const [mode, setMode] = useState<"deck" | "append">(deckParam ? "append" : "deck");
  const [targetId, setTargetId] = useState(deckParam ?? state.decks[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(state.settings.focusSubjects[0] ?? "General");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [checked, setChecked] = useState(false);

  const target = state.decks.find((d) => d.id === targetId);

  const patch = (key: string, changes: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...changes } : q)));

  const payload = useMemo(() => {
    const qs = questions.map(toPayload);
    return mode === "deck"
      ? JSON.stringify({
          title: title.trim(),
          subject: subject.trim() || "General",
          description: description.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          questions: qs,
        })
      : JSON.stringify({ questions: qs });
  }, [questions, mode, title, subject, description, tags]);

  const result = useMemo<ValidationResult | QuestionsValidationResult>(
    () =>
      mode === "deck"
        ? validateDeckJson(payload)
        : validateQuestionsJson(payload, target?.questions ?? []),
    [payload, mode, target],
  );

  const builtDeck = "deck" in result ? result.deck : undefined;
  const builtQuestions = "questions" in result ? result.questions : undefined;

  const save = () => {
    setChecked(true);
    if (!result.ok) {
      toast.error("Fix the highlighted problems first");
      return;
    }
    if (mode === "deck") {
      if (!builtDeck) return;
      addDeck(builtDeck);
      toast.success(`Created “${builtDeck.title}”`, {
        description: `${builtDeck.questions.length} questions forged by hand.`,
      });
      navigate({ to: "/decks/$deckId", params: { deckId: builtDeck.id } });
      return;
    }
    if (!builtQuestions || !target) {
      toast.error("Pick a deck to add these questions to");
      return;
    }
    addQuestions(target.id, builtQuestions);
    toast.success(`Added ${builtQuestions.length} questions`, {
      description: `“${target.title}” now has ${target.questions.length + builtQuestions.length}.`,
    });
    navigate({ to: "/decks/$deckId", params: { deckId: target.id } });
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Deck Forge"
        description="Write your own questions by hand — every type, every detail. Nothing is saved until every question is complete."
      />

      <div className="panel mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="flex gap-2">
          {(
            [
              ["deck", "New deck"],
              ["append", "Add to a deck"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                mode === m
                  ? "border-primary bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "append" && (
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-2/60 px-3 text-xs"
          >
            {!state.decks.length && <option value="">No decks yet</option>}
            {state.decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.questions.length})
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "deck" && (
        <section className="panel mb-6 space-y-4 p-6">
          <h2 className="text-sm font-semibold">Deck details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="forge-title">Title *</Label>
              <Input
                id="forge-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cell Biology — Membranes"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="forge-subject">Subject</Label>
              <Input
                id="forge-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Biology"
                list="forge-subject-options"
              />
              <datalist id="forge-subject-options">
                {state.settings.focusSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="forge-desc">Description</Label>
            <Textarea
              id="forge-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this deck covers."
              className="min-h-20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="forge-tags">Tags (comma separated)</Label>
            <Input
              id="forge-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="biology, cells, exam-prep"
            />
          </div>
        </section>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionEditor
            key={q.key}
            index={i}
            total={questions.length}
            draft={q}
            onChange={(changes) => patch(q.key, changes)}
            onRemove={() =>
              setQuestions((qs) => (qs.length > 1 ? qs.filter((x) => x.key !== q.key) : qs))
            }
            onDuplicate={() =>
              setQuestions((qs) => {
                const copy = { ...q, key: newKey() };
                const next = [...qs];
                next.splice(i + 1, 0, copy);
                return next;
              })
            }
            onMove={(dir) =>
              setQuestions((qs) => {
                const j = i + dir;
                if (j < 0 || j >= qs.length) return qs;
                const next = [...qs];
                const [moved] = next.splice(i, 1);
                next.splice(j, 0, moved);
                return next;
              })
            }
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
          <Plus /> Add question
        </Button>
        {questionTypes.map((t) => (
          <button
            key={t}
            onClick={() => setQuestions((qs) => [...qs, blankQuestion(t)])}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            + {TYPE_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      <section className="panel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              result.ok ? "text-success" : checked ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {result.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {result.ok
              ? `Ready — ${(builtDeck?.questions ?? builtQuestions ?? []).length} question(s)`
              : `${result.errors.length} problem(s) to fix`}
          </h2>
          <Button onClick={save} disabled={mode === "append" && !target}>
            <Hammer /> {mode === "deck" ? "Create deck" : `Add to “${target?.title ?? "deck"}”`}
          </Button>
        </div>

        {(checked || result.ok) && result.errors.length > 0 && (
          <ul className="mt-4 space-y-2">
            {result.errors.map((e) => (
              <li
                key={e}
                className="rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive"
              >
                {e}
              </li>
            ))}
          </ul>
        )}

        {result.ok && result.warnings.length > 0 && (
          <ul className="mt-4 space-y-2">
            {result.warnings.map((w) => (
              <li
                key={w}
                className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StringList({
  label,
  values,
  onChange,
  placeholder,
  min = 0,
  addLabel = "Add",
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  min?: number;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={placeholder ? `${placeholder} ${i + 1}` : undefined}
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={values.length <= min}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            aria-label={`Remove ${label} ${i + 1}`}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...values, ""])}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}

function QuestionEditor({
  index,
  total,
  draft,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: {
  index: number;
  total: number;
  draft: DraftQuestion;
  onChange: (changes: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: 1 | -1) => void;
}) {
  const slots = countBlanks(draft.question);

  const switchType = (type: QuestionType) => {
    const fresh = blankQuestion(type);
    onChange({
      type,
      answer: type === "true-false" ? (draft.answer === "false" ? "false" : "true") : draft.answer,
      options: draft.options.length ? draft.options : fresh.options,
      items: draft.items.length ? draft.items : fresh.items,
      pairs: draft.pairs.length ? draft.pairs : fresh.pairs,
    });
  };

  return (
    <section className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">#{index + 1}</Badge>
          <select
            value={draft.type}
            onChange={(e) => switchType(e.target.value as QuestionType)}
            className="h-9 rounded-md border border-border bg-surface-2/60 px-3 text-xs"
            aria-label="Question type"
          >
            {questionTypes.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
          <select
            value={draft.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value as Difficulty })}
            className="h-9 rounded-md border border-border bg-surface-2/60 px-3 text-xs"
            aria-label="Difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ChevronDown />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicate question">
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={total <= 1}
            aria-label="Delete question"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          {draft.type === "flashcard" ? "Front (the word or question) *" : "Question *"}
        </Label>
        <Textarea
          value={draft.question}
          onChange={(e) => {
            const question = e.target.value;
            if (draft.type === "word-bank") {
              const n = countBlanks(question);
              const blanks = Array.from({ length: n }, (_, i) => draft.blanks[i] ?? "");
              onChange({ question, blanks });
            } else {
              onChange({ question });
            }
          }}
          className="min-h-20"
          placeholder={
            draft.type === "fill-blank" || draft.type === "word-bank"
              ? `Use ${BLANK_TOKEN} where a word is missing.`
              : "What do you want to ask?"
          }
        />
        {(draft.type === "fill-blank" || draft.type === "word-bank") && (
          <p className="text-xs text-muted-foreground">
            {slots} blank{slots === 1 ? "" : "s"} detected ({BLANK_TOKEN}).
          </p>
        )}
      </div>

      {draft.type === "multiple-choice" && (
        <div className="space-y-2">
          <Label>Options — click the circle to mark the correct one *</Label>
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ answer: o })}
                aria-label={`Mark option ${i + 1} correct`}
                className={cn(
                  "size-5 shrink-0 rounded-full border-2 transition-colors",
                  o && draft.answer === o ? "border-success bg-success" : "border-border",
                )}
              />
              <Input
                value={o}
                onChange={(e) => {
                  const next = draft.options.map((x, j) => (j === i ? e.target.value : x));
                  onChange({
                    options: next,
                    answer: draft.answer === o ? e.target.value : draft.answer,
                  });
                }}
                placeholder={`Option ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={draft.options.length <= 2}
                onClick={() => onChange({ options: draft.options.filter((_, j) => j !== i) })}
                aria-label={`Remove option ${i + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ options: [...draft.options, ""] })}
          >
            <Plus /> Add option
          </Button>
        </div>
      )}

      {draft.type === "true-false" && (
        <div className="space-y-1.5">
          <Label>Correct answer *</Label>
          <div className="flex gap-2">
            {["true", "false"].map((v) => (
              <button
                key={v}
                onClick={() => onChange({ answer: v })}
                className={cn(
                  "rounded-full border border-border px-4 py-1.5 text-xs font-medium capitalize transition-colors",
                  draft.answer === v
                    ? "border-primary bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {(draft.type === "flashcard" ||
        draft.type === "fill-blank" ||
        draft.type === "short-answer") && (
        <div className="space-y-1.5">
          <Label>{draft.type === "flashcard" ? "Back (answer) *" : "Answer *"}</Label>
          <Textarea
            value={draft.answer}
            onChange={(e) => onChange({ answer: e.target.value })}
            className="min-h-16"
            placeholder="The expected answer."
          />
        </div>
      )}

      {draft.type === "ordering" && (
        <StringList
          label="Items — in the correct order *"
          values={draft.items}
          onChange={(items) => onChange({ items })}
          placeholder="Step"
          min={2}
          addLabel="Add step"
        />
      )}

      {draft.type === "matching" && (
        <div className="space-y-2">
          <Label>Pairs *</Label>
          {draft.pairs.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={p.left}
                onChange={(e) =>
                  onChange({
                    pairs: draft.pairs.map((x, j) =>
                      j === i ? { ...x, left: e.target.value } : x,
                    ),
                  })
                }
                placeholder="Left"
              />
              <Input
                value={p.right}
                onChange={(e) =>
                  onChange({
                    pairs: draft.pairs.map((x, j) =>
                      j === i ? { ...x, right: e.target.value } : x,
                    ),
                  })
                }
                placeholder="Right"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={draft.pairs.length <= 2}
                onClick={() => onChange({ pairs: draft.pairs.filter((_, j) => j !== i) })}
                aria-label={`Remove pair ${i + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ pairs: [...draft.pairs, { left: "", right: "" }] })}
          >
            <Plus /> Add pair
          </Button>
        </div>
      )}

      {draft.type === "word-bank" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Correct word for each blank, in order *</Label>
            {slots === 0 && (
              <p className="text-xs text-warning">
                Add at least one {BLANK_TOKEN} to the question text first.
              </p>
            )}
            {draft.blanks.map((b, i) => (
              <Input
                key={i}
                value={b}
                onChange={(e) =>
                  onChange({ blanks: draft.blanks.map((x, j) => (j === i ? e.target.value : x)) })
                }
                placeholder={`Blank ${i + 1}`}
              />
            ))}
          </div>
          <StringList
            label="Distractor words (optional — shown alongside the answers)"
            values={draft.wordBank}
            onChange={(wordBank) => onChange({ wordBank })}
            placeholder="Distractor"
            addLabel="Add distractor"
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Concept</Label>
          <Input
            value={draft.concept}
            onChange={(e) => onChange({ concept: e.target.value })}
            placeholder="Active transport"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tags (comma separated)</Label>
          <Input
            value={draft.tags}
            onChange={(e) => onChange({ tags: e.target.value })}
            placeholder="unit-3, tricky"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Hint</Label>
          <Input
            value={draft.hint}
            onChange={(e) => onChange({ hint: e.target.value })}
            placeholder="A nudge if they get stuck."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Explanation</Label>
          <Textarea
            value={draft.explanation}
            onChange={(e) => onChange({ explanation: e.target.value })}
            className="min-h-10"
            placeholder="Why the answer is right."
          />
        </div>
      </div>
    </section>
  );
}

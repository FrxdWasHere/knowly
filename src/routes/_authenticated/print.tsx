import { createFileRoute } from "@tanstack/react-router";
import { Printer, Library, FileJson, CheckCircle2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { ExamPaper } from "@/components/print/exam-paper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ALL_DIFFICULTIES,
  ALL_TYPES,
  TYPE_LABELS,
  defaultExamOptions,
  selectQuestions,
  type ExamOptions,
} from "@/lib/exam-print";
import { validateDeckJson, validateQuestionsJson } from "@/lib/schema";
import type { Difficulty, Question, QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/_authenticated/print")({
  head: () => ({
    meta: [
      { title: "Printable Exam Builder — Knowly" },
      {
        name: "description",
        content:
          "Turn any Knowly deck or pasted JSON into a clean printable exam paper with an optional answer key, then print or save it as a PDF.",
      },
      { property: "og:title", content: "Printable Exam Builder — Knowly" },
      {
        property: "og:description",
        content: "Build a printable exam paper from any deck or JSON, with an optional answer key.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <PrintExamPage />
    </AppPage>
  ),
});

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function PrintExamPage() {
  const { state } = useKnowly();
  const decks = state.decks;

  const [source, setSource] = useState<"decks" | "json">("decks");
  const [deckIds, setDeckIds] = useState<string[]>(decks[0] ? [decks[0].id] : []);
  const [raw, setRaw] = useState("");
  const [jsonQuestions, setJsonQuestions] = useState<Question[] | null>(null);
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);

  const [types, setTypes] = useState<QuestionType[]>(ALL_TYPES);
  const [difficulties, setDifficulties] = useState<Difficulty[]>(ALL_DIFFICULTIES);
  const [count, setCount] = useState(20);
  const [shuffle, setShuffle] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [options, setOptions] = useState<ExamOptions>(() => ({
    ...defaultExamOptions(),
    studentName: state.settings.displayName,
    studentClass: [state.settings.gradeLevel, state.settings.school].filter(Boolean).join(" · "),
  }));

  const set = (patch: Partial<ExamOptions>) => setOptions((o) => ({ ...o, ...patch }));

  const pool = useMemo<Question[]>(() => {
    if (source === "json") return jsonQuestions ?? [];
    return decks.filter((d) => deckIds.includes(d.id)).flatMap((d) => d.questions);
  }, [source, jsonQuestions, decks, deckIds]);

  const questions = useMemo(
    () => selectQuestions(pool, { types, difficulties, count, shuffle }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, types, difficulties, count, shuffle, nonce],
  );

  const toggle = <T,>(list: T[], value: T, setter: (v: T[]) => void) =>
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const parseJson = () => {
    const asDeck = validateDeckJson(raw);
    if (asDeck.ok && asDeck.deck) {
      setJsonQuestions(asDeck.deck.questions);
      setJsonErrors([]);
      set({ title: asDeck.deck.title, subject: asDeck.deck.subject });
      toast.success(`${asDeck.deck.questions.length} questions loaded`);
      return;
    }
    const asPack = validateQuestionsJson(raw);
    if (asPack.ok && asPack.questions) {
      setJsonQuestions(asPack.questions);
      setJsonErrors([]);
      if (asPack.deckTitle) set({ title: asPack.deckTitle });
      toast.success(`${asPack.questions.length} questions loaded`);
      return;
    }
    setJsonQuestions(null);
    setJsonErrors(asDeck.errors.length ? asDeck.errors : asPack.errors);
  };

  const applyDeckTitle = (ids: string[]) => {
    const first = decks.find((d) => d.id === ids[0]);
    if (first) set({ title: `${first.title} — Exam`, subject: first.subject });
  };

  return (
    <div className="max-w-6xl">
      <div className="print-hide">
        <PageHeader
          title="Printable exam"
          description="Pick a deck or paste JSON, shape the paper, then print it or save it as a PDF."
          action={
            <Button onClick={() => window.print()} disabled={!questions.length}>
              <Printer /> Print / Save as PDF
            </Button>
          }
        />
      </div>

      <div className="print-hide grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={source === "decks" ? "default" : "outline"}
                onClick={() => setSource("decks")}
              >
                <Library /> My decks
              </Button>
              <Button
                size="sm"
                variant={source === "json" ? "default" : "outline"}
                onClick={() => setSource("json")}
              >
                <FileJson /> Paste JSON
              </Button>
            </div>

            {source === "decks" ? (
              <div className="mt-4 space-y-2">
                {decks.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No decks yet — import or generate one first, or paste JSON here.
                  </p>
                )}
                {decks.map((d) => {
                  const active = deckIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        const next = active ? deckIds.filter((x) => x !== d.id) : [...deckIds, d.id];
                        setDeckIds(next);
                        if (!active) applyDeckTitle(next);
                      }}
                      className={cn(
                        "press flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{d.title}</span>
                        <span className="text-[11px] text-muted-foreground">{d.subject}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {d.questions.length}q
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4">
                <Textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="Paste deck JSON or a questions array…"
                  className="min-h-40 font-mono text-xs"
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={parseJson} disabled={!raw.trim()}>
                    Load JSON
                  </Button>
                  {jsonQuestions && (
                    <span className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="size-3.5" /> {jsonQuestions.length} questions
                    </span>
                  )}
                </div>
                {jsonErrors.slice(0, 5).map((e) => (
                  <p
                    key={e}
                    className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive"
                  >
                    <XCircle className="mt-0.5 size-3.5 shrink-0" />
                    {e}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="panel space-y-4 p-5">
            <h2 className="text-sm font-semibold">What goes on the paper</h2>

            <div className="space-y-2">
              <Label htmlFor="question-count" className="text-xs">Questions</Label>
              <Input
                id="question-count"
                type="number"
                min={1}
                step={1}
                value={count}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setCount(1);
                    return;
                  }
                  const n = parseInt(raw, 10);
                  setCount(Math.max(1, n));
                }}
                className="max-w-[120px]"
              />
            </div>

            <div>
              <Label className="text-xs">Question types</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALL_TYPES.map((t) => (
                  <Chip key={t} active={types.includes(t)} onClick={() => toggle(types, t, setTypes)}>
                    {TYPE_LABELS[t]}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Difficulty</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALL_DIFFICULTIES.map((d) => (
                  <Chip
                    key={d}
                    active={difficulties.includes(d)}
                    onClick={() => toggle(difficulties, d, setDifficulties)}
                  >
                    {d}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Shuffle questions</Label>
              <div className="flex items-center gap-2">
                {shuffle && (
                  <Button size="sm" variant="ghost" onClick={() => setNonce((n) => n + 1)}>
                    Reshuffle
                  </Button>
                )}
                <Switch checked={shuffle} onCheckedChange={setShuffle} />
              </div>
            </div>
          </section>

          <section className="panel space-y-4 p-5">
            <h2 className="text-sm font-semibold">Header & layout</h2>

            <div className="space-y-2">
              <Label className="text-xs">Exam title</Label>
              <Input value={options.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Subject</Label>
                <Input value={options.subject} onChange={(e) => set({ subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date</Label>
                <Input
                  value={options.date}
                  placeholder="e.g. 14 Sep"
                  onChange={(e) => set({ date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Student name</Label>
                <Input
                  value={options.studentName}
                  placeholder="Leave blank for a line"
                  onChange={(e) => set({ studentName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Class</Label>
                <Input
                  value={options.studentClass}
                  placeholder="Leave blank for a line"
                  onChange={(e) => set({ studentClass: e.target.value })}
                />
              </div>
            </div>



            <div className="space-y-2">
              <Label className="text-xs">Instructions</Label>
              <Textarea
                value={options.instructions}
                onChange={(e) => set({ instructions: e.target.value })}
                className="min-h-20 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Points per question</Label>
                <Input
                  type="number"
                  min={0}
                  value={options.pointsPerQuestion}
                  onChange={(e) => set({ pointsPerQuestion: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Answer lines: {options.answerLines}</Label>
                <Slider
                  className="mt-3"
                  min={1}
                  max={8}
                  step={1}
                  value={[options.answerLines]}
                  onValueChange={([v]) => set({ answerLines: v ?? 1 })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Chip active={options.columns === 1} onClick={() => set({ columns: 1 })}>
                One column
              </Chip>
              <Chip active={options.columns === 2} onClick={() => set({ columns: 2 })}>
                Two columns
              </Chip>
              <Chip active={options.spacing === "compact"} onClick={() => set({ spacing: "compact" })}>
                Compact
              </Chip>
              <Chip active={options.spacing === "roomy"} onClick={() => set({ spacing: "roomy" })}>
                Roomy
              </Chip>
            </div>

            {(
              [
                ["showNameLines", "Name / class / score lines"],
                ["showInstructions", "Show instructions"],
                ["showPoints", "Show points & total marks"],
                ["includeAnswerKey", "Include answer key page"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs">{label}</Label>
                <Switch
                  checked={options[key]}
                  onCheckedChange={(v) => set({ [key]: v } as Partial<ExamOptions>)}
                />
              </div>
            ))}
          </section>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Preview · {questions.length} of {pool.length} available questions
          </p>
          <div className="overflow-hidden rounded-xl border border-border shadow-sm">
            {questions.length ? (
              <ExamPaper questions={questions} options={options} />
            ) : (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Choose a deck or load JSON to see the paper.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print-only clean copy */}
      {!!questions.length && (
        <div className="print-only hidden">
          <ExamPaper questions={questions} options={options} />
        </div>
      )}
    </div>
  );
}

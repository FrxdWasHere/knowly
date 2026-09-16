import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Eye,
  RotateCcw,
  SkipForward,
  StickyNote,
  X,
} from "lucide-react";
import { AppPage } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { checkAnswer, shuffleArray, TYPE_LABELS, formatDuration } from "@/lib/answers";
import { displayAnswer, isInteractive } from "@/lib/interactive";
import { InteractiveQuestion } from "@/components/questions/interactive-question";

import { xpForAnswer } from "@/lib/gamification";
import { gradeFromOutcome } from "@/lib/srs";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { AnswerRecord } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/study/$deckId")({
  head: () => ({
    meta: [
      { title: "Study Mode — Active Recall Session | Knowly" },
      {
        name: "description",
        content:
          "Work through flashcards, multiple choice, true/false, fill-in-the-blank and short answer questions with keyboard shortcuts, notes and bookmarks.",
      },
      { property: "og:title", content: "Study Mode — Knowly" },
      {
        property: "og:description",
        content: "A focused, keyboard-driven active recall session that works offline.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <StudySession />
    </AppPage>
  ),
});

function StudySession() {
  const { deckId } = Route.useParams();
  const { state, updateDeck, recordSession, reviewQuestion } = useKnowly();
  const navigate = useNavigate();
  const deck = state.decks.find((d) => d.id === deckId);
  const settings = state.settings;

  const questions = useMemo(() => {
    if (!deck) return [];
    return settings.shuffleStudy ? shuffleArray(deck.questions) : deck.questions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id, settings.shuffleStudy]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [input, setInput] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());
  const questionStart = useRef(Date.now());

  const question = questions[index];

  const finish = useCallback(
    (final: AnswerRecord[], finalXp: number) => {
      if (!deck) return;
      const conceptStats: Record<string, { correct: number; total: number }> = {};
      final.forEach((a) => {
        if (!a.concept || a.skipped) return;
        const prev = conceptStats[a.concept] ?? { correct: 0, total: 0 };
        conceptStats[a.concept] = {
          correct: prev.correct + (a.correct ? 1 : 0),
          total: prev.total + 1,
        };
      });
      recordSession({
        mode: "study",
        deckIds: [deck.id],
        deckTitles: [deck.title],
        answered: final.filter((a) => !a.skipped).length,
        correct: final.filter((a) => a.correct).length,
        skipped: final.filter((a) => a.skipped).length,
        durationMs: Date.now() - started.current,
        xpEarned: settings.xpEnabled ? finalXp : 0,
        bestCombo,
        masteredIds: {
          [deck.id]: final.filter((a) => a.correct).map((a) => a.questionId),
        },
        conceptStats,
      });
      setDone(true);
    },
    [bestCombo, deck, recordSession, settings.xpEnabled],
  );

  const submit = useCallback(
    (outcome: "correct" | "incorrect" | "skip", given?: string) => {
      if (!question || !deck) return;
      const record: AnswerRecord = {
        questionId: question.id,
        deckId: deck.id,
        type: question.type,
        difficulty: question.difficulty,
        concept: question.concept,
        correct: outcome === "correct",
        skipped: outcome === "skip",
        timeMs: Date.now() - questionStart.current,
        given,
      };
      const grade = gradeFromOutcome(outcome, record.timeMs);
      if (grade) reviewQuestion(deck.id, question.id, grade);
      const nextCombo = outcome === "correct" ? combo + 1 : 0;
      const gained = xpForAnswer(record, combo);
      const nextAnswers = [...answers, record];
      const nextXp = xp + gained;
      setAnswers(nextAnswers);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setXp(nextXp);
      setRevealed(false);
      setInput("");
      questionStart.current = Date.now();
      if (index + 1 >= questions.length) finish(nextAnswers, nextXp);
      else setIndex((i) => i + 1);
    },
    [answers, combo, deck, finish, index, question, questions.length, reviewQuestion, xp],
  );

  useEffect(() => {
    if (settings.autoReveal) setRevealed(true);
  }, [index, settings.autoReveal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === " " && !typing) {
        e.preventDefault();
        setRevealed((r) => !r);
      }
      if (typing) return;
      if (e.key === "1") submit("correct");
      if (e.key === "2") submit("incorrect");
      if (e.key === "s") submit("skip");
      if (e.key === "ArrowRight") setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, questions.length, submit]);

  if (!deck) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p>Deck not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/decks">Back to library</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    const correct = answers.filter((a) => a.correct).length;
    const answered = answers.filter((a) => !a.skipped).length;
    return (
      <div className="panel mx-auto max-w-xl p-10 text-center">
        <h1 className="font-display text-3xl font-bold">Session complete</h1>
        <p className="mt-2 text-sm text-muted-foreground">{deck.title}</p>
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: "Correct", value: `${correct}/${answered || 0}` },
            { label: "XP earned", value: `+${settings.xpEnabled ? xp : 0}` },
            { label: "Time", value: formatDuration(Date.now() - started.current) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-2/60 p-4">
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw /> Study again
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Return home
          </Button>
        </div>
      </div>
    );
  }

  const bookmarked = deck.bookmarks.includes(question.id);
  const progress = ((index + (revealed ? 0.5 : 0)) / questions.length) * 100;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (
              settings.confirmBeforeExit &&
              answers.length > 0 &&
              !window.confirm("Leave this session? Your progress so far won't be saved.")
            )
              return;
            navigate({ to: "/decks/$deckId", params: { deckId: deck.id } });
          }}
        >
          <ArrowLeft /> {deck.title}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {index + 1} / {questions.length}
          </span>
          {settings.xpEnabled && <span className="text-primary">+{xp} XP</span>}
          {combo > 1 && <span className="text-primary">🔥 {combo}x</span>}
        </div>
      </div>

      {settings.showProgressBars && (
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <article className="panel p-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline">{TYPE_LABELS[question.type]}</Badge>
          <Badge variant="outline" className="capitalize">
            {question.difficulty}
          </Badge>
          {question.concept && <Badge variant="secondary">{question.concept}</Badge>}
          <button
            className="ml-auto"
            aria-label="Bookmark question"
            onClick={() =>
              updateDeck(deck.id, {
                bookmarks: bookmarked
                  ? deck.bookmarks.filter((b) => b !== question.id)
                  : [...deck.bookmarks, question.id],
              })
            }
          >
            <Bookmark className={cn("size-4", bookmarked && "fill-primary text-primary")} />
          </button>
        </div>

        <h1 className="mt-6 text-2xl font-semibold leading-snug">{question.question}</h1>

        {question.hint && settings.showHints && !revealed && (
          <p className="mt-3 text-xs text-muted-foreground">Hint: {question.hint}</p>
        )}

        {question.type === "multiple-choice" && question.options && (
          <ul className="mt-6 grid gap-2">
            {question.options.map((o) => (
              <li
                key={o}
                className={cn(
                  "rounded-lg border border-border px-4 py-3 text-sm",
                  revealed && o === question.answer && "border-success bg-success/10 text-success",
                )}
              >
                {o}
              </li>
            ))}
          </ul>
        )}

        {(question.type === "fill-blank" || question.type === "short-answer") && (
          <div className="mt-6 space-y-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer…"
              onKeyDown={(e) => {
                if (e.key === "Enter") setRevealed(true);
              }}
            />
            {revealed && input && (
              <p
                className={cn(
                  "text-xs",
                  checkAnswer(question, input) ? "text-success" : "text-destructive",
                )}
              >
                {checkAnswer(question, input) ? "Close enough — counted as correct." : "Doesn't match the expected answer."}
              </p>
            )}
          </div>
        )}

        {isInteractive(question.type) && (
          <InteractiveQuestion
            question={question}
            value={input}
            onChange={setInput}
            disabled={revealed}
            revealed={revealed}
          />
        )}

        {revealed ? (
          <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-5">
            <p className="text-xs uppercase tracking-widest text-success">Answer</p>
            <p className="mt-2 text-lg font-medium">{displayAnswer(question)}</p>

            {question.explanation && settings.showExplanations && (
              <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
            )}
          </div>
        ) : (
          <Button className="mt-6" variant="secondary" onClick={() => setRevealed(true)}>
            <Eye /> Reveal answer <span className="ml-1 text-[10px] opacity-60">Space</span>
          </Button>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={() => submit("correct")} className="bg-success text-success-foreground hover:bg-success/90">
            <Check /> I knew it <span className="ml-1 text-[10px] opacity-70">1</span>
          </Button>
          <Button variant="destructive" onClick={() => submit("incorrect")}>
            <X /> Missed it <span className="ml-1 text-[10px] opacity-70">2</span>
          </Button>
          <Button variant="outline" onClick={() => submit("skip")}>
            <SkipForward /> Skip <span className="ml-1 text-[10px] opacity-70">S</span>
          </Button>
          <Button variant="ghost" onClick={() => setNoteOpen((n) => !n)}>
            <StickyNote /> Note
          </Button>
          <Button variant="ghost" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
            Review later <ArrowRight />
          </Button>
        </div>

        {noteOpen && (
          <Textarea
            className="mt-4"
            placeholder="Write a personal note for this question…"
            value={deck.notes[question.id] ?? ""}
            onChange={(e) =>
              updateDeck(deck.id, { notes: { ...deck.notes, [question.id]: e.target.value } })
            }
          />
        )}
      </article>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Shortcuts: Space reveal · 1 correct · 2 missed · S skip · ← → navigate
      </p>
    </div>
  );
}
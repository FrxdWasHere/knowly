import {
  EXAM_FONTS,
  LETTERS,
  EXAM_THEMES,
  printableAnswer,
  type ExamOptions,
  type QuestionEdit,
} from "@/lib/exam-print";
import { X } from "lucide-react";
import type { Question } from "@/lib/types";
import { MathText } from "@/components/math/math-text";
import { cn } from "@/lib/utils";

function Lines({ count }: { count: number }) {
  return (
    <div className="mt-2 space-y-4">
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div key={i} className="border-b border-foreground/40 print:border-black/40" />
      ))}
    </div>
  );
}

function Blank({ width = "w-24" }: { width?: string }) {
  return (
    <span
      className={cn(
        "inline-block border-b border-foreground/60 align-baseline print:border-black/60",
        width,
      )}
    />
  );
}

/** Text that can be typed over directly on the paper when editing is on. */
function Editable({
  value,
  enabled,
  onCommit,
  className,
  placeholder,
  math,
}: {
  value: string;
  enabled: boolean;
  onCommit?: (v: string) => void;
  className?: string;
  placeholder?: string;
  /** typeset LaTeX ($…$) and $$…$$ when not editing */
  math?: boolean;
}) {
  if (!enabled || !onCommit)
    return math ? (
      <MathText text={value} className={className} />
    ) : (
      <span className={className}>{value}</span>
    );
  return (
    <span
      key={value}
      role="textbox"
      aria-label={placeholder ?? "Edit text"}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      className={cn(
        "inline-block min-w-[2ch] rounded-sm px-0.5 outline-none ring-1 ring-primary/30 hover:ring-primary/60 focus:bg-primary/5 focus:ring-2 focus:ring-primary print:ring-0",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next !== value) onCommit(next);
      }}
    >
      {value}
    </span>
  );
}

function letter(i: number, options: ExamOptions) {
  const l = LETTERS[i] ?? String(i + 1);
  return options.optionCase === "lower" ? l.toLowerCase() : l;
}

function numberLabel(i: number, options: ExamOptions) {
  if (options.numberStyle === "q") return `Q${i + 1}.`;
  if (options.numberStyle === "paren") return `(${i + 1})`;
  return `${i + 1}.`;
}

function QuestionBody({
  q,
  options,
  editing,
  onEditOption,
}: {
  q: Question;
  options: ExamOptions;
  editing: boolean;
  onEditOption?: (index: number, value: string) => void;
}) {
  switch (q.type) {
    case "multiple-choice":
      return (
        <ol className="mt-2 space-y-1.5">
          {(q.options ?? []).map((opt, i) => (
            <li key={`${opt}-${i}`} className="flex gap-2">
              <span className="font-semibold">{letter(i, options)}.</span>
              <Editable
                value={opt}
                enabled={editing}
                onCommit={onEditOption ? (v) => onEditOption(i, v) : undefined}
                placeholder={`Option ${letter(i, options)}`}
                math
              />
            </li>
          ))}
        </ol>
      );
    case "true-false":
      return (
        <p className="mt-2 tracking-wide">
          <span className="mr-6">◯ True</span>
          <span>◯ False</span>
        </p>
      );
    case "ordering":
      return (
        <ol className="mt-2 space-y-1.5">
          {(q.items ?? []).map((item, i) => (
            <li key={`${item}-${i}`} className="flex gap-2">
              <Blank width="w-8" />
              <span>
                <MathText text={item} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "matching": {
      const pairs = q.pairs ?? [];
      const rights = pairs.map((p) => p.right);
      return (
        <div className="mt-2 grid grid-cols-1 gap-6 print:grid-cols-2">
          <ol className="space-y-1.5">
            {pairs.map((p, i) => (
              <li key={`${p.left}-${i}`} className="flex gap-2">
                <Blank width="w-8" />
                <span>
                  {i + 1}. <MathText text={p.left} />
                </span>
              </li>
            ))}
          </ol>
          <ol className="space-y-1.5">
            {rights.map((r, i) => (
              <li key={`${r}-${i}`}>
                <span className="font-semibold">{letter(i, options)}.</span> <MathText text={r} />
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "word-bank":
      return (
        <div className="mt-2">
          {!!q.wordBank?.length && (
            <p className="border border-foreground/50 px-3 py-2 text-[11px] leading-relaxed print:border-black/50">
              <span className="font-semibold">Word bank: </span>
              {q.wordBank.map((w, i) => (
                <span key={`${w}-${i}`}>
                  {i > 0 && " · "}
                  <MathText text={w} />
                </span>
              ))}
            </p>
          )}
          <Lines count={Math.max(1, q.blanks?.length ?? 1)} />
        </div>
      );
    case "fill-blank":
    case "short-answer":
    case "flashcard":
    default:
      return <Lines count={options.answerLines} />;
  }
}

export function ExamPaper({
  questions,
  options,
  editing = false,
  onChange,
  onEditQuestion,
}: {
  questions: Question[];
  options: ExamOptions;
  /** show type-over editing on the paper (preview only) */
  editing?: boolean;
  onChange?: (patch: Partial<ExamOptions>) => void;
  onEditQuestion?: (id: string, edit: QuestionEdit) => void;
}) {
  const totalMarks = questions.length * Math.max(0, options.pointsPerQuestion);
  const gap = options.spacing === "compact" ? "space-y-4" : "space-y-7";
  const font = EXAM_FONTS.find((f) => f.id === options.fontFamily) ?? EXAM_FONTS[0]!;
  const size =
    options.fontSize === "small"
      ? "text-[12px]"
      : options.fontSize === "large"
        ? "text-[15px]"
        : "text-[13px]";
  const centered = options.headerAlign === "center";
  const theme = EXAM_THEMES.find((item) => item.id === options.theme) ?? EXAM_THEMES[0]!;
  const themed = options.theme !== "classic";
  const themeStyle = {
    fontFamily: font.stack,
    "--exam-accent": theme.accent,
    "--exam-soft": theme.soft,
    "--exam-border": theme.border,
  } as React.CSSProperties;
  const commit = (key: keyof ExamOptions) =>
    onChange ? (v: string) => onChange({ [key]: v } as Partial<ExamOptions>) : undefined;

  return (
    <div
      className={cn(
        "exam-paper bg-card p-8 leading-relaxed text-card-foreground md:p-10 print:bg-white print:text-black",
        `exam-theme-${options.theme ?? "classic"}`,
        themed && "exam-paper-themed",
        size,
      )}
      style={themeStyle}
    >
      {options.headerText?.trim() && (
        <div
          className={cn(
            "exam-masthead mb-5 flex items-center justify-between gap-3 border-b-2 pb-2 text-[0.68em] font-bold uppercase tracking-[0.2em]",
            themed
              ? "border-[var(--exam-accent)] text-[var(--exam-accent)]"
              : "border-slate-300 text-slate-500",
          )}
        >
          <span>{options.headerText}</span>
          <span className="text-right">{options.subject || theme.label}</span>
        </div>
      )}
      <div
        className={cn(
          "exam-heading border-b-2 pb-4",
          themed ? "border-[var(--exam-accent)]" : "border-slate-300",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-end justify-between gap-3",
            centered && "flex-col items-center text-center",
          )}
        >
          <div>
            <h2 className="text-[1.55em] font-bold tracking-tight">
              <Editable
                value={options.title || "Practice Exam"}
                enabled={editing}
                onCommit={commit("title")}
                placeholder="Exam title"
              />
            </h2>
            {(options.subject || editing) && (
              <p className="mt-1 text-[0.85em] uppercase tracking-wider">
                <Editable
                  value={options.subject}
                  enabled={editing}
                  onCommit={commit("subject")}
                  placeholder="Subject"
                />
              </p>
            )}
          </div>
          <div className={cn("text-[0.85em]", centered ? "text-center" : "text-right")}>
            {options.date && <p>Date: {options.date}</p>}
            {options.showPoints && (
              <p
                className={cn(
                  "font-semibold",
                  themed ? "text-[var(--exam-accent)]" : "text-slate-700",
                )}
              >
                Total: ____ / {totalMarks} marks
              </p>
            )}
            <p>{questions.length} questions</p>
          </div>
        </div>

        {options.showNameLines && (
          <div className="mt-4 grid grid-cols-1 gap-5 text-[0.85em] print:grid-cols-3">
            <p>
              Name:{" "}
              {options.studentName ? (
                <span className="font-medium">{options.studentName}</span>
              ) : (
                <Blank width="w-full" />
              )}
            </p>
            <p>
              Class:{" "}
              {options.studentClass ? (
                <span className="font-medium">{options.studentClass}</span>
              ) : (
                <Blank width="w-full" />
              )}
            </p>
            <p>
              Score: <Blank width="w-full" />
            </p>
          </div>
        )}
      </div>

      {options.showInstructions && (options.instructions.trim() || editing) && (
        <p
          className={cn(
            "exam-instructions mt-4 border-l-2 pl-3 text-[0.85em] italic",
            themed
              ? "border-[var(--exam-accent)] bg-[var(--exam-soft)] py-2 pr-3"
              : "border-foreground/70 print:border-black/70",
          )}
        >
          <Editable
            value={options.instructions}
            enabled={editing}
            onCommit={commit("instructions")}
            placeholder="Instructions"
          />
        </p>
      )}

      <ol
        className={cn(
          "mt-6",
          gap,
          options.columns === 2 && "md:columns-2 md:gap-10 md:[&>li]:mb-6",
        )}
      >
        {questions.map((q, i) => (
          <li
            key={q.id}
            className={cn(
              "exam-question group relative break-inside-avoid",
              themed &&
                "rounded-lg border border-[var(--exam-border)] bg-[var(--exam-soft)]/40 p-3",
            )}
          >
            <div className="flex gap-2">
              <span
                className={cn(
                  "exam-question-number shrink-0 font-bold",
                  themed && "text-[var(--exam-accent)]",
                )}
              >
                {numberLabel(i, options)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="exam-question-prompt font-medium">
                  <Editable
                    value={q.question}
                    enabled={editing}
                    onCommit={
                      onEditQuestion ? (v) => onEditQuestion(q.id, { question: v }) : undefined
                    }
                    placeholder="Question"
                    math
                  />
                  {options.showPoints && (
                    <span className="ml-2 text-[0.85em] font-normal">
                      [{options.pointsPerQuestion}]
                    </span>
                  )}
                </p>
                <QuestionBody
                  q={q}
                  options={options}
                  editing={editing}
                  onEditOption={
                    onEditQuestion
                      ? (index, value) => onEditQuestion(q.id, { options: { [index]: value } })
                      : undefined
                  }
                />
              </div>
              {editing && onEditQuestion && (
                <button
                  type="button"
                  aria-label={`Remove question ${i + 1}`}
                  title="Remove from this paper"
                  onClick={() => onEditQuestion(q.id, { removed: true })}
                  className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive print:hidden"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {options.footerText?.trim() && (
        <footer className="exam-footer mt-10 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-[0.72em] text-slate-500">
          <span>{options.footerText}</span>
          <span>{options.title || "Practice Exam"}</span>
        </footer>
      )}

      {options.includeAnswerKey && (
        <section
          className={cn(
            "exam-answer-key mt-10 border-t-2 pt-5",
            themed ? "border-[var(--exam-accent)]" : "border-foreground print:border-black",
          )}
        >
          <h3 className="text-[1.2em] font-bold">
            Answer key — {options.title || "Practice Exam"}
          </h3>
          <ol className="mt-3 space-y-2 text-[0.85em]">
            {questions.map((q, i) => (
              <li key={q.id} className="break-inside-avoid">
                <span className="font-bold">{numberLabel(i, options)}</span>{" "}
                <MathText text={printableAnswer(q)} />
                {q.explanation && (
                  <span className="italic">
                    {" — "}
                    <MathText text={q.explanation} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

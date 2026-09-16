import { LETTERS, printableAnswer, type ExamOptions } from "@/lib/exam-print";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

function Lines({ count }: { count: number }) {
  return (
    <div className="mt-2 space-y-4">
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div key={i} className="border-b border-black/40" />
      ))}
    </div>
  );
}

function Blank({ width = "w-24" }: { width?: string }) {
  return <span className={cn("inline-block border-b border-black/60 align-baseline", width)} />;
}

function QuestionBody({ q, options }: { q: Question; options: ExamOptions }) {
  switch (q.type) {
    case "multiple-choice":
      return (
        <ol className="mt-2 space-y-1.5">
          {(q.options ?? []).map((opt, i) => (
            <li key={`${opt}-${i}`} className="flex gap-2">
              <span className="font-semibold">{LETTERS[i]}.</span>
              <span>{opt}</span>
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
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "matching": {
      const pairs = q.pairs ?? [];
      const rights = pairs.map((p) => p.right);
      return (
        <div className="mt-2 grid grid-cols-2 gap-6">
          <ol className="space-y-1.5">
            {pairs.map((p, i) => (
              <li key={`${p.left}-${i}`} className="flex gap-2">
                <Blank width="w-8" />
                <span>
                  {i + 1}. {p.left}
                </span>
              </li>
            ))}
          </ol>
          <ol className="space-y-1.5">
            {rights.map((r, i) => (
              <li key={`${r}-${i}`}>
                <span className="font-semibold">{LETTERS[i]}.</span> {r}
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
            <p className="border border-black/50 px-3 py-2 text-[11px] leading-relaxed">
              <span className="font-semibold">Word bank: </span>
              {q.wordBank.join(" · ")}
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
}: {
  questions: Question[];
  options: ExamOptions;
}) {
  const totalMarks = questions.length * Math.max(0, options.pointsPerQuestion);
  const gap = options.spacing === "compact" ? "space-y-4" : "space-y-7";

  return (
    <div className="exam-paper bg-white p-8 text-[13px] leading-relaxed text-black md:p-10">
      <div className="border-b-2 border-black pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{options.title || "Practice Exam"}</h2>
            {options.subject && <p className="mt-1 text-xs uppercase tracking-wider">{options.subject}</p>}
          </div>
          <div className="text-right text-xs">
            {options.date && <p>Date: {options.date}</p>}
            {options.showPoints && (
              <p className="font-semibold">
                Total: ____ / {totalMarks} marks
              </p>
            )}
            <p>{questions.length} questions</p>
          </div>
        </div>

        {options.showNameLines && (
          <div className="mt-4 grid grid-cols-3 gap-5 text-xs">
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

      {options.showInstructions && options.instructions.trim() && (
        <p className="mt-4 border-l-2 border-black/70 pl-3 text-xs italic">{options.instructions}</p>
      )}

      <ol
        className={cn(
          "mt-6",
          gap,
          options.columns === 2 && "md:columns-2 md:gap-10 md:[&>li]:mb-6",
        )}
      >
        {questions.map((q, i) => (
          <li key={q.id} className="exam-question break-inside-avoid">
            <div className="flex gap-2">
              <span className="font-bold">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {q.question}
                  {options.showPoints && (
                    <span className="ml-2 text-[11px] font-normal">
                      [{options.pointsPerQuestion}]
                    </span>
                  )}
                </p>
                <QuestionBody q={q} options={options} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      {options.includeAnswerKey && (
        <section className="exam-answer-key mt-10 border-t-2 border-black pt-5">
          <h3 className="text-base font-bold">Answer key — {options.title || "Practice Exam"}</h3>
          <ol className="mt-3 space-y-2 text-xs">
            {questions.map((q, i) => (
              <li key={q.id} className="break-inside-avoid">
                <span className="font-bold">{i + 1}.</span> {printableAnswer(q)}
                {q.explanation && <span className="italic"> — {q.explanation}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

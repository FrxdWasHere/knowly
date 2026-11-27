import { Check, X } from "lucide-react";
import { MathText } from "@/components/math/math-text";
import { questionOptionExplanation } from "@/lib/answers";
import type { Question } from "@/lib/types";

export function QuestionRationales({ question }: { question: Question }) {
  const choices =
    question.type === "multiple-choice" || question.type === "multiple-select"
      ? question.options
      : question.type === "true-false"
        ? ["true", "false"]
        : undefined;

  if (choices) {
    const hasExplanations =
      Boolean(question.explanation) ||
      Boolean(question.incorrectExplanation) ||
      Boolean(question.tutor?.whyCorrect) ||
      Boolean(question.tutor?.whyWrong?.length);
    if (!hasExplanations) return null;

    return (
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Why each option
        </p>
        <ul className="mt-2 grid gap-2">
          {choices.map((option) => {
            const correct =
              question.type === "multiple-select"
                ? (question.correctOptions?.some(
                    (answer) => answer.trim().toLowerCase() === option.trim().toLowerCase(),
                  ) ?? false)
                : option.trim().toLowerCase() === question.answer.trim().toLowerCase();
            const explanation = questionOptionExplanation(question, option);
            return (
              <li key={option} className="flex gap-2 text-sm">
                {correct ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className={correct ? "font-medium text-success" : "font-medium"}>
                    <MathText text={option} />
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      {correct ? "Correct" : "Incorrect"}
                    </span>
                  </p>
                  {explanation && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <MathText text={explanation} />
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (!question.explanation && !question.incorrectExplanation) return null;

  return (
    <div className="mt-3 space-y-3">
      {question.explanation && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why this answer is correct
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <MathText text={question.explanation} />
          </p>
        </div>
      )}
      {question.incorrectExplanation && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Common mistakes
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <MathText text={question.incorrectExplanation} />
          </p>
        </div>
      )}
    </div>
  );
}

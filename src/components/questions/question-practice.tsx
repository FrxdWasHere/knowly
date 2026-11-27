import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import {
  InteractiveQuestion,
  isInteractiveComplete,
} from "@/components/questions/interactive-question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MathText } from "@/components/math/math-text";
import { checkAnswer } from "@/lib/answers";
import { displayAnswer, isInteractive } from "@/lib/interactive";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/types";

export function QuestionPractice({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered?: (correct: boolean) => void;
}) {
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  const submit = (answer = response) => {
    if (result !== null || !answer.trim()) return;
    const correct = checkAnswer(question, answer);
    setResponse(answer);
    setResult(correct);
    onAnswered?.(correct);
  };
  const retry = () => {
    setResponse("");
    setResult(null);
  };
  const answerReady = isInteractive(question.type)
    ? isInteractiveComplete(question, response)
    : Boolean(response.trim());

  return (
    <div className="space-y-3">
      {question.type === "multiple-choice" && question.options?.length ? (
        <div className="grid gap-2">
          {question.options.map((option, index) => (
            <button
              key={`${index}-${option}`}
              type="button"
              disabled={result !== null}
              onClick={() => submit(option)}
              className={cn(
                "w-full rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/60",
                response === option && result === null && "border-primary bg-primary/10",
                result !== null &&
                  option === question.answer &&
                  "border-success bg-success/10 text-success",
                result === false &&
                  response === option &&
                  "border-destructive bg-destructive/10 text-destructive",
              )}
            >
              <span className="mr-2 text-muted-foreground">{String.fromCharCode(65 + index)}.</span>
              <MathText text={option} />
            </button>
          ))}
        </div>
      ) : question.type === "true-false" ? (
        <div className="grid grid-cols-2 gap-2">
          {["true", "false"].map((option) => (
            <button
              key={option}
              type="button"
              disabled={result !== null}
              onClick={() => submit(option)}
              className={cn(
                "rounded-lg border border-border px-3 py-3 text-sm font-medium capitalize transition-colors hover:border-primary/60",
                result !== null &&
                  option === question.answer.toLowerCase() &&
                  "border-success bg-success/10 text-success",
                result === false &&
                  response === option &&
                  "border-destructive bg-destructive/10 text-destructive",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : isInteractive(question.type) ? (
        <InteractiveQuestion
          question={question}
          value={response}
          onChange={setResponse}
          disabled={result !== null}
          revealed={result !== null}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Input
            value={response}
            disabled={result !== null}
            onChange={(event) => setResponse(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Type your answer…"
            aria-label="Your answer"
          />
          {result === null && (
            <Button disabled={!answerReady} onClick={() => submit()}>
              Check answer
            </Button>
          )}
        </div>
      )}

      {isInteractive(question.type) && result === null && (
        <Button disabled={!answerReady} onClick={() => submit()}>
          Check answer
        </Button>
      )}

      {result !== null && (
        <div
          role="status"
          className={cn(
            "space-y-2 rounded-lg border p-3 text-sm",
            result ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
          )}
        >
          <p
            className={cn(
              "flex items-center gap-2 font-semibold",
              result ? "text-success" : "text-destructive",
            )}
          >
            {result ? <Check className="size-4" /> : <X className="size-4" />}
            {result ? "Correct!" : "Not quite."}
          </p>
          {!result && (
            <p className="text-muted-foreground">
              Correct answer: <MathText text={displayAnswer(question)} />
            </p>
          )}
          {question.explanation && (
            <p className="border-t border-border pt-2 text-muted-foreground">
              {question.explanation}
            </p>
          )}
          {question.incorrectExplanation && !result && (
            <p className="text-muted-foreground">Common mistake: {question.incorrectExplanation}</p>
          )}
          {question.tutor?.simple && (
            <p className="text-muted-foreground">In simple terms: {question.tutor.simple}</p>
          )}
          {!result && (
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              <RotateCcw className="size-4" /> Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

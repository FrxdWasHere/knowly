import { GraduationCap, X } from "lucide-react";
import { MathText } from "@/components/math/math-text";
import { QuestionRationales } from "@/components/questions/question-rationales";
import type { Question } from "@/lib/types";

export function QuestionTutorPanel({
  question,
  onClose,
}: {
  question: Question;
  onClose: () => void;
}) {
  const tutor = question.tutor;

  return (
    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
          <GraduationCap className="size-3.5" /> Tutor
        </p>
        <button
          onClick={onClose}
          aria-label="Close tutor notes"
          className="grid min-h-[28px] min-w-[28px] place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {!tutor && !question.explanation && !question.incorrectExplanation && (
        <p className="mt-3 text-sm text-muted-foreground">
          This card was written without tutor notes. Add a few in Deck tools and they will appear
          here while you study.
        </p>
      )}

      {tutor?.simple && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            In plain words
          </p>
          <p className="mt-1 text-sm">
            <MathText text={tutor.simple} />
          </p>
        </div>
      )}

      {tutor?.mnemonic && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remember it</p>
          <p className="mt-1 text-sm font-medium text-primary">
            <MathText text={tutor.mnemonic} />
          </p>
        </div>
      )}

      {tutor?.example && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Example</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <MathText text={tutor.example} />
          </p>
        </div>
      )}

      <QuestionRationales question={question} />
    </div>
  );
}

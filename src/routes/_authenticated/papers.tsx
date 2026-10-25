import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, ClipboardList, FileText, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabelPickerDialog, LabelChips } from "@/components/binder/label-picker";
import { averagePercentage, bestSitting, lastSitting } from "@/lib/papers";
import type { PaperRecord, PaperSitting } from "@/lib/papers";
import { useKnowly } from "@/store/knowly";
import { createId } from "@/lib/id";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/papers")({
  head: () => ({ meta: [{ title: "Paper Shelf — Past Exams & Sittings | Knowly" }] }),
  component: () => (
    <AppPage>
      <PaperShelfPage />
    </AppPage>
  ),
});

function PaperShelfPage() {
  const { state, updatePaper, deletePaper, addPaperSitting } = useKnowly();
  const [sittingFor, setSittingFor] = useState<PaperRecord | null>(null);
  const [deleteFor, setDeleteFor] = useState<PaperRecord | null>(null);
  const [labelFor, setLabelFor] = useState<PaperRecord | null>(null);

  const papers = useMemo(
    () => [...state.papers].sort((a, b) => b.createdAt - a.createdAt),
    [state.papers],
  );
  const average = averagePercentage(papers);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Paper Shelf"
        description="Your printed exam papers, kept for retakes — reprint any of them and log every attempt's score."
        action={
          <Button asChild>
            <Link to="/print">
              <Printer /> Build a new paper
            </Link>
          </Button>
        }
      />

      {papers.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm">
          <Award className="size-4 text-primary" />
          <span>
            {papers.length} {papers.length === 1 ? "paper" : "papers"} · {average}% average across
            every logged sitting
          </span>
        </div>
      )}

      {papers.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-semibold">The shelf is empty</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Build a printable exam from any deck, then hit “Save to paper shelf”. Each paper keeps
            its own score history so you can watch your marks climb across attempts.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/print">
              <Printer /> Build your first paper
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              labels={state.labels}
              onLog={() => setSittingFor(paper)}
              onDelete={() => setDeleteFor(paper)}
              onLabels={() => setLabelFor(paper)}
              updatePaper={updatePaper}
            />
          ))}
        </div>
      )}

      {sittingFor && (
        <SittingDialog
          paper={sittingFor}
          onClose={() => setSittingFor(null)}
          onSubmit={(sitting) => {
            addPaperSitting(sittingFor.id, sitting);
            toast.success("Sitting logged", {
              description: `${sitting.score}/${sitting.total} — ${sitting.percentage}%`,
            });
            setSittingFor(null);
          }}
        />
      )}

      <Dialog open={deleteFor !== null} onOpenChange={(open) => !open && setDeleteFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Take this paper off the shelf?</DialogTitle>
            <DialogDescription>
              {deleteFor?.title} and its {deleteFor?.sittings.length ?? 0} logged
              {deleteFor?.sittings.length === 1 ? " sitting" : " sittings"} will be removed. Your
              decks are untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFor(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteFor) {
                  deletePaper(deleteFor.id);
                  toast.success(`Removed “${deleteFor.title}”`);
                }
                setDeleteFor(null);
              }}
            >
              <Trash2 /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LabelPickerDialog
        open={labelFor !== null}
        onOpenChange={(open) => {
          if (!open) setLabelFor(null);
        }}
        labels={state.labels}
        labelIds={labelFor?.labelIds ?? []}
        onChange={(labelIds) => {
          if (labelFor) {
            updatePaper(labelFor.id, { labelIds });
            setLabelFor({ ...labelFor, labelIds });
          }
        }}
        title="Labels on this paper"
      />
    </div>
  );
}

function PaperCard({
  paper,
  labels,
  onLog,
  onDelete,
  onLabels,
  updatePaper,
}: {
  paper: PaperRecord;
  labels: ReturnType<typeof useKnowly>["state"]["labels"];
  onLog: () => void;
  onDelete: () => void;
  onLabels: () => void;
  updatePaper: (id: string, patch: Partial<PaperRecord>) => void;
}) {
  const [showSittings, setShowSittings] = useState(false);
  const best = bestSitting(paper);
  const last = lastSitting(paper);

  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
            <FileText className="size-4 shrink-0 text-primary" />
            {paper.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {paper.questions.length} questions · saved{" "}
            {new Date(paper.createdAt).toLocaleDateString()}
            {paper.options.subject ? ` · ${paper.options.subject}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <LabelChips labels={labels} labelIds={paper.labelIds} />
            <button
              type="button"
              onClick={onLabels}
              className="text-[11px] font-medium text-muted-foreground hover:text-primary"
            >
              labels
            </button>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm">
            <Link to="/print" search={{ paper: paper.id }}>
              <Printer /> Reprint
            </Link>
          </Button>
          <Button size="sm" variant="secondary" onClick={onLog}>
            <Pencil /> Log a sitting
          </Button>
          <Button size="sm" variant="ghost" aria-label="Remove paper" onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Stat label="Attempts" value={String(paper.sittings.length)} />
        <Stat
          label="Most recent"
          value={last ? `${last.score}/${last.total} (${last.percentage}%)` : "not sat yet"}
        />
        <Stat
          label="Best"
          value={best ? `${best.score}/${best.total} (${best.percentage}%)` : "—"}
        />
      </div>

      {paper.sittings.length > 0 && (
        <button
          type="button"
          onClick={() => setShowSittings((v) => !v)}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {showSittings ? "Hide" : "Show"} sitting history
        </button>
      )}
      {showSittings && (
        <ul className="mt-2 grid gap-1.5">
          {[...paper.sittings]
            .sort((a, b) => b.takenAt - a.takenAt)
            .map((sitting) => (
              <li
                key={sitting.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs"
              >
                <span className="font-medium">
                  {new Date(sitting.takenAt).toLocaleDateString()}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    sitting.percentage >= 70
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      : sitting.percentage >= 40
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                  )}
                >
                  {sitting.percentage}%
                </span>
                <span className="text-muted-foreground">
                  {sitting.score}/{sitting.total}
                </span>
                {sitting.minutes != null && <span>{sitting.minutes} min</span>}
                {sitting.notes && (
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    “{sitting.notes}”
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remove this sitting"
                  onClick={() =>
                    updatePaper(paper.id, {
                      sittings: paper.sittings.filter((x) => x.id !== sitting.id),
                    })
                  }
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold">{value}</p>
    </div>
  );
}

function SittingDialog({
  paper,
  onClose,
  onSubmit,
}: {
  paper: PaperRecord;
  onClose: () => void;
  onSubmit: (sitting: PaperSitting) => void;
}) {
  const [score, setScore] = useState("");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");

  const total = paper.questions.length;
  const rawScore = Number(score) || 0;
  const percentage = total ? Math.round((Math.min(rawScore, total) / total) * 100) : 0;

  const submit = () => {
    if (score === "" || Number.isNaN(rawScore) || rawScore < 0) {
      toast.error("Enter the number of questions you got right");
      return;
    }
    onSubmit({
      id: createId(),
      takenAt: Date.now(),
      score: Math.min(rawScore, total),
      total,
      percentage,
      minutes: minutes ? Number(minutes) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log a sitting</DialogTitle>
          <DialogDescription>
            Mark your printed paper against the answer key, then note the score here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <UILabel htmlFor="sitting-score">Correct out of {total}</UILabel>
              <Input
                id="sitting-score"
                type="number"
                min={0}
                max={total}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 14"
              />
            </div>
            <div className="space-y-2">
              <UILabel htmlFor="sitting-minutes">Time taken (min)</UILabel>
              <Input
                id="sitting-minutes"
                type="number"
                min={0}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="45"
              />
            </div>
          </div>
          {score !== "" && (
            <Badge variant="outline" className="justify-center py-2 text-sm">
              {percentage}% —{" "}
              {percentage >= 70 ? "strong" : percentage >= 40 ? "getting there" : "needs work"}
            </Badge>
          )}
          <div className="space-y-2">
            <UILabel htmlFor="sitting-notes">Notes (optional)</UILabel>
            <Textarea
              id="sitting-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What tripped you up? Which topics to revise?"
              className="min-h-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save sitting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabelColorRow } from "@/components/binder/label-picker";
import { LABEL_COLORS, type BinderLabel, type BinderLabelColor } from "@/lib/labels";
import { useKnowly } from "@/store/knowly";
import { createId } from "@/lib/id";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/labels")({
  head: () => ({ meta: [{ title: "Binder Labels — Colour-Code Your Library | Knowly" }] }),
  component: () => (
    <AppPage>
      <LabelsPage />
    </AppPage>
  ),
});

const emptyDraft = (): {
  id: string | null;
  name: string;
  emoji: string;
  color: BinderLabelColor;
} => ({
  id: null,
  name: "",
  emoji: "",
  color: "blue",
});

function LabelsPage() {
  const { state, upsertLabel, deleteLabel } = useKnowly();
  const [draft, setDraft] = useState<ReturnType<typeof emptyDraft> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BinderLabel | null>(null);

  const counts = (id: string) => {
    const decks = state.decks.filter((d) => (d.labelIds ?? []).includes(id)).length;
    const courses = state.courses.filter((c) => (c.labelIds ?? []).includes(id)).length;
    const papers = state.papers.filter((p) => (p.labelIds ?? []).includes(id)).length;
    return decks + courses + papers;
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Give your label a name");
      return;
    }
    upsertLabel({
      id: draft.id ?? createId(),
      name: draft.name.trim(),
      emoji: draft.emoji.trim() || undefined,
      color: draft.color,
    });
    toast.success(draft.id ? "Label updated" : "Label added");
    setDraft(null);
  };

  const remove = () => {
    if (confirmDelete) {
      deleteLabel(confirmDelete.id);
      toast.success(`Removed “${confirmDelete.name}”`);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Binder Labels"
        description="Colour-code your library like sticky tabs in a binder — group decks, courses and papers your way."
        action={
          <Button onClick={() => setDraft(emptyDraft())}>
            <Plus /> New label
          </Button>
        }
      />

      {state.labels.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <Tag className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-semibold">No labels yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Make a few — like “Term 1”, “Exam board”, or “Needs practice” — then stick them on any
            deck or course and filter your library by them.
          </p>
          <Button className="mt-6" onClick={() => setDraft(emptyDraft())}>
            <Plus /> Create a label
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {state.labels.map((label) => {
            const count = counts(label.id);
            return (
              <div
                key={label.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3"
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl text-base",
                    LABEL_COLORS.includes(label.color) && "bg-surface-2",
                  )}
                  style={{ background: labelChipBg(label.color) }}
                >
                  {label.emoji || "🏷️"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{label.name}</p>
                  <p className="text-xs text-muted-foreground">
                    stuck on {count} {count === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${label.name}`}
                    onClick={() =>
                      setDraft({
                        id: label.id,
                        name: label.name,
                        emoji: label.emoji ?? "",
                        color: label.color,
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${label.name}`}
                    onClick={() => setConfirmDelete(label)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="mt-2 text-xs text-muted-foreground">
            Removing a label unsticks it from everything — your decks, courses and papers stay put.
          </p>
        </div>
      )}

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit label" : "New label"}</DialogTitle>
            <DialogDescription>
              A short name, an optional icon and a colour — that's all a label needs.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="grid grid-cols-[72px_1fr] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="label-emoji">Icon</Label>
                  <Input
                    id="label-emoji"
                    value={draft.emoji}
                    onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                    maxLength={2}
                    placeholder="🏷️"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label-name">Name</Label>
                  <Input
                    id="label-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Term 1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Colour</Label>
                <LabelColorRow
                  value={draft.color}
                  onChange={(color) => setDraft({ ...draft, color: color as BinderLabelColor })}
                />
              </div>
              <div>
                <Badge variant="outline" className="px-2 py-1">
                  {draft.emoji} {draft.name || "Preview"}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>{draft?.id ? "Save changes" : "Create label"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this label?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.name} comes off every deck, course and paper it's stuck on. The items
              themselves stay.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={remove}>
              <Trash2 /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function labelChipBg(color: string): string {
  const map: Record<string, string> = {
    blue: "color-mix(in srgb, #3b82f6 16%, transparent)",
    green: "color-mix(in srgb, #10b981 16%, transparent)",
    amber: "color-mix(in srgb, #f59e0b 16%, transparent)",
    rose: "color-mix(in srgb, #f43f5e 16%, transparent)",
    violet: "color-mix(in srgb, #8b5cf6 16%, transparent)",
    cyan: "color-mix(in srgb, #06b6d4 16%, transparent)",
  };
  return map[color] ?? "transparent";
}

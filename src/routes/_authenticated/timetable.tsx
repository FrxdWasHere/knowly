import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarPlus, CalendarX2, Clock3, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAY_NAMES,
  currentSlot,
  mondayIndex,
  prettyTime,
  slotMinutes,
  slotsForDay,
  sortSlots,
  toMinutes,
  totalHours,
} from "@/lib/timetable";
import { useKnowly } from "@/store/knowly";
import type { TimetableSlot } from "@/lib/timetable";
import { cn } from "@/lib/utils";
import { createId } from "@/lib/id";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({ meta: [{ title: "Timetable — Your Week At A Glance | Knowly" }] }),
  component: () => (
    <AppPage>
      <TimetablePage />
    </AppPage>
  ),
});

const emptyDraft = () => ({
  id: "",
  day: 0,
  start: "09:00",
  end: "10:00",
  title: "",
  subject: "",
  room: "",
  teacher: "",
  deckId: "",
  courseId: "",
});

function TimetablePage() {
  const { state, upsertSlot, deleteSlot } = useKnowly();
  const [draft, setDraft] = useState<ReturnType<typeof emptyDraft> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimetableSlot | null>(null);

  const slots = useMemo(() => sortSlots(state.timetable), [state.timetable]);
  const weekDay = mondayIndex(new Date());
  const now = new Date();
  const comingUp = useMemo(
    () =>
      currentSlot(state.timetable, {
        day: weekDay,
        minutes: now.getHours() * 60 + now.getMinutes(),
      }),
    [state.timetable, weekDay],
  );

  const openNew = () => setDraft(emptyDraft());
  const openEdit = (slot: TimetableSlot) =>
    setDraft({
      id: slot.id,
      day: slot.day,
      start: slot.start,
      end: slot.end,
      title: slot.title,
      subject: slot.subject ?? "",
      room: slot.room ?? "",
      teacher: slot.teacher ?? "",
      deckId: slot.deckId ?? "",
      courseId: slot.courseId ?? "",
    });

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Give your class a name");
      return;
    }
    if (draft.start === draft.end || toMinutes(draft.end) <= toMinutes(draft.start)) {
      toast.error("The finish time must be after the start time");
      return;
    }
    upsertSlot({
      id: draft.id || createId(),
      day: draft.day,
      start: draft.start,
      end: draft.end,
      title: draft.title.trim(),
      subject: draft.subject.trim() || undefined,
      room: draft.room.trim() || undefined,
      teacher: draft.teacher.trim() || undefined,
      deckId: draft.deckId || undefined,
      courseId: draft.courseId || undefined,
      color: state.decks.find((d) => d.id === draft.deckId)?.color,
    });
    setDraft(null);
  };

  const remove = () => {
    if (confirmDelete) {
      deleteSlot(confirmDelete.id);
      toast.success(`Removed “${confirmDelete.title}”`);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Timetable"
        description="Your week of classes — what's on, when, and what to revise for it."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="self-center px-3 py-1.5 text-xs">
              <Clock3 className="mr-1 size-3.5" />
              {totalHours(slots)} hrs / week
            </Badge>
            <Button onClick={openNew}>
              <CalendarPlus /> Add a class
            </Button>
          </div>
        }
      />

      {comingUp && slots.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm">
          <GraduationCap className="size-4 text-primary" />
          {comingUp.kind === "now" ? (
            <span>
              <strong>Happening now:</strong> {comingUp.slot.title}
              {comingUp.slot.room ? ` · ${comingUp.slot.room}` : ""} — until{" "}
              {prettyTime(comingUp.slot.end)}
            </span>
          ) : (
            <span>
              <strong>Next up:</strong> {comingUp.slot.title} — {DAY_NAMES[comingUp.slot.day]}{" "}
              {prettyTime(comingUp.slot.start)}
            </span>
          )}
        </div>
      )}

      {slots.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <CalendarX2 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-semibold">Your week is blank</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Add the classes you actually sit each week. Knowly keeps the weekly rhythm in one place,
            so you always know what today brings and which cards to revise before it.
          </p>
          <Button className="mt-6" onClick={openNew}>
            <CalendarPlus /> Add your first class
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          {DAY_NAMES.map((name, day) => (
            <DayColumn
              key={name}
              name={name}
              day={day}
              today={day === weekDay}
              slots={slotsForDay(slots, day)}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              comingUpTitle={comingUp?.slot.id}
              onAdd={() =>
                setDraft({ ...emptyDraft(), day, start: now.getHours() < 17 ? "09:00" : "19:00" })
              }
            />
          ))}
        </div>
      )}

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit class" : "Add a class"}</DialogTitle>
            <DialogDescription>
              Note the weekly rhythm — when it starts and finishes is enough.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot-title">Class name</Label>
                <Input
                  id="slot-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Maths, Chemistry, Band practice"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="slot-start">Starts</Label>
                  <Input
                    id="slot-start"
                    type="time"
                    value={draft.start}
                    onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slot-end">Ends</Label>
                  <Input
                    id="slot-end"
                    type="time"
                    value={draft.end}
                    onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select
                    value={String(draft.day)}
                    onValueChange={(v) => setDraft({ ...draft, day: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((n, i) => (
                        <SelectItem key={n} value={String(i)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slot-room">Room (optional)</Label>
                  <Input
                    id="slot-room"
                    value={draft.room}
                    onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                    placeholder="B12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="slot-subject">Subject (optional)</Label>
                  <Input
                    id="slot-subject"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    placeholder="Mathematics"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slot-teacher">Teacher (optional)</Label>
                  <Input
                    id="slot-teacher"
                    value={draft.teacher}
                    onChange={(e) => setDraft({ ...draft, teacher: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Revise with a deck</Label>
                  <Select
                    value={draft.deckId}
                    onValueChange={(v) => setDraft({ ...draft, deckId: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No deck" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No deck</SelectItem>
                      {state.decks.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Or with a course</Label>
                  <Select
                    value={draft.courseId}
                    onValueChange={(v) => setDraft({ ...draft, courseId: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No course</SelectItem>
                      {state.courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.emoji ? `${c.emoji} ` : ""}
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>{draft?.id ? "Save changes" : "Add class"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this class?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.title} — {DAY_NAMES[confirmDelete?.day ?? 0]}{" "}
              {prettyTime(confirmDelete?.start ?? "00:00")} to{" "}
              {prettyTime(confirmDelete?.end ?? "00:00")}. Your cards and notes are untouched.
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

function DayColumn({
  name,
  day,
  today,
  slots,
  onEdit,
  onDelete,
  comingUpTitle,
  onAdd,
}: {
  name: string;
  day: number;
  today: boolean;
  slots: TimetableSlot[];
  onEdit: (slot: TimetableSlot) => void;
  onDelete: (slot: TimetableSlot) => void;
  comingUpTitle?: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface/60">
      <div
        className={cn(
          "flex items-center justify-between rounded-t-2xl px-3 py-2.5",
          today ? "bg-primary/10" : "bg-surface-2/40",
        )}
      >
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            today ? "text-primary" : "text-muted-foreground",
          )}
        >
          {name}
          {today && (
            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px]">
              today
            </span>
          )}
        </span>
        <button
          type="button"
          aria-label={`Add a class on ${name}`}
          onClick={onAdd}
          className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <CalendarPlus className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {slots.length === 0 ? (
          <p className="px-1.5 py-3 text-center text-[11px] text-muted-foreground">—</p>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onEdit={onEdit}
              onDelete={onDelete}
              highlighted={slot.id === comingUpTitle}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  onEdit,
  onDelete,
  highlighted,
}: {
  slot: TimetableSlot;
  onEdit: (slot: TimetableSlot) => void;
  onDelete: (slot: TimetableSlot) => void;
  highlighted?: boolean;
}) {
  const { state } = useKnowly();
  const deck = slot.deckId ? state.decks.find((d) => d.id === slot.deckId) : undefined;
  const course = slot.courseId ? state.courses.find((c) => c.id === slot.courseId) : undefined;
  return (
    <div
      className={cn(
        "group rounded-xl border p-2.5 text-xs transition-colors",
        highlighted
          ? "border-primary/50 bg-primary/10"
          : "border-border bg-surface-2/50 hover:border-primary/40",
      )}
      style={{ borderLeft: `3px solid ${deck?.color ?? "var(--primary)"}` }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">{slot.title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {prettyTime(slot.start)} – {prettyTime(slot.end)} · {slotMinutes(slot)}m
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            type="button"
            aria-label={`Edit ${slot.title}`}
            onClick={() => onEdit(slot)}
            className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${slot.title}`}
            onClick={() => onDelete(slot)}
            className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      {(slot.room || slot.teacher) && (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {slot.room}
          {slot.room && slot.teacher ? " · " : ""}
          {slot.teacher}
        </p>
      )}
      {(deck || course) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {deck && (
            <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
              {deck.title}
            </Badge>
          )}
          {course && (
            <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
              {course.emoji ? `${course.emoji} ` : ""}
              {course.title}
            </Badge>
          )}
        </div>
      )}
      {deck && (
        <Link
          to="/review"
          search={{ deck: deck.id }}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
        >
          Revise this deck
        </Link>
      )}
    </div>
  );
}

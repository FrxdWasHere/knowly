import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shuffleArray } from "@/lib/answers";
import {
  ITEM_SEP,
  PAIR_SEP,
  serializeMatching,
  serializeOrdering,
  serializeWordBank,
  splitBlanks,
  wordBankPool,
} from "@/lib/interactive";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/types";

export interface InteractiveProps {
  question: Question;
  /** Serialised response, kept in the parent so it can be submitted as `given`. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** When true the correct answer is highlighted. */
  revealed?: boolean;
}

const eq = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

/* ------------------------------------------------------------------ */
/* Ordering                                                            */
/* ------------------------------------------------------------------ */

/** Pointer distance (px) before a press turns into a drag. */
const DRAG_THRESHOLD_PX = 5;

function OrderingQuestion({ question, value, onChange, disabled, revealed }: InteractiveProps) {
  const correct = useMemo(() => question.items ?? [], [question.items]);
  const [order, setOrder] = useState<string[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const drag = useRef<{ index: number; pointerId: number; startY: number; active: boolean } | null>(
    null,
  );
  const overRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    let next = shuffleArray(correct);
    if (correct.length > 1 && next.every((v, i) => v === correct[i])) next = [...next].reverse();
    setOrder(next);
    onChange(serializeOrdering(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // Keep in sync if the parent clears the response (e.g. next question).
  useEffect(() => {
    if (!value && order.length) onChange(serializeOrdering(order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const move = useCallback(
    (from: number, to: number) => {
      if (disabled || from === to || to < 0 || to >= order.length) return;
      const next = [...order];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setOrder(next);
      onChange(serializeOrdering(next));
      setAnnouncement(`${item} moved to position ${to + 1} of ${next.length}.`);
    },
    [disabled, onChange, order],
  );

  /** Insertion slot for a pointer Y position, based on the midpoints of each row. */
  const slotFromPoint = (clientY: number) => {
    for (let i = 0; i < order.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return order.length - 1;
  };

  const onPointerDown = (index: number) => (e: React.PointerEvent<HTMLLIElement>) => {
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Let the arrow buttons (and any other control) keep their normal behaviour.
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { index, pointerId: e.pointerId, startY: e.clientY, active: false };
  };

  const onPointerMove = (index: number) => (e: React.PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d || d.index !== index || d.pointerId !== e.pointerId) return;
    if (!d.active) {
      if (Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
      d.active = true;
      setDraggingIndex(index);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
    const slot = slotFromPoint(e.clientY);
    if (overRef.current !== slot) {
      overRef.current = slot;
      setOverIndex(slot);
    }
  };

  const endDrag = (index: number) => (e: React.PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d || d.index !== index || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (d.active) move(index, overRef.current ?? slotFromPoint(e.clientY));
    overRef.current = null;
    setDraggingIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="mt-6 space-y-2">
      <p className="text-xs text-muted-foreground">
        Drag the rows — or use the arrows — to put these in the correct order.
      </p>
      <ul className="grid gap-2" aria-label="Items to order">
        {order.map((item, i) => {
          const rightSpot = revealed && correct[i] === item;
          const isDragging = draggingIndex === i;
          const isDropTarget = draggingIndex !== null && !isDragging && overIndex === i;
          return (
            <li
              key={`${i}-${item}`}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove(i)}
              onPointerUp={endDrag(i)}
              onPointerCancel={endDrag(i)}
              className={cn(
                // touch-pan-y: vertical page scroll always wins on touch; the arrow
                // buttons (and mouse drag) remain the reorder path.
                "flex touch-pan-y select-none items-center gap-3 rounded-lg border border-border bg-surface-2/60 px-3 py-2.5 text-sm",
                !disabled && "cursor-grab active:cursor-grabbing hover:border-primary/60",
                isDragging && "cursor-grabbing border-primary bg-primary/10 opacity-70 shadow-lg",
                isDropTarget && "border-dashed border-primary/70",
                revealed &&
                  (rightSpot
                    ? "border-success bg-success/10"
                    : "border-destructive/60 bg-destructive/10"),
              )}
            >
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="flex-1">{item}</span>
              <span className="flex shrink-0 flex-col">
                <button
                  type="button"
                  aria-label={`Move “${item}” up`}
                  disabled={disabled || i === 0}
                  onClick={() => move(i, i - 1)}
                  className="grid min-h-[40px] min-w-[40px] place-items-center text-muted-foreground disabled:opacity-30 hover:text-primary"
                >
                  <ChevronUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move “${item}” down`}
                  disabled={disabled || i === order.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="grid min-h-[40px] min-w-[40px] place-items-center text-muted-foreground disabled:opacity-30 hover:text-primary"
                >
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {!disabled && (
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <RotateCcw aria-hidden /> Reshuffle
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

function MatchingQuestion({ question, value, onChange, disabled, revealed }: InteractiveProps) {
  const pairs = useMemo(() => question.pairs ?? [], [question.pairs]);
  const [bank, setBank] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const assigned = useMemo(() => {
    const map = new Map<string, string>();
    value
      .split(ITEM_SEP)
      .map((chunk) => chunk.split(PAIR_SEP))
      .forEach((parts) => {
        if (parts.length === 2) map.set(parts[0], parts[1]);
      });
    return map;
  }, [value]);

  useEffect(() => {
    setBank(shuffleArray(pairs.map((p) => p.right)));
    setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const emit = (map: Map<string, string>) =>
    onChange(
      serializeMatching(
        pairs
          .filter((p) => map.has(p.left))
          .map((p) => ({ left: p.left, right: map.get(p.left)! })),
      ),
    );

  const place = (left: string) => {
    if (disabled) return;
    const map = new Map(assigned);
    if (map.has(left) && !picked) {
      map.delete(left);
      emit(map);
      return;
    }
    if (!picked) return;
    // A right value can only be used once.
    for (const [k, v] of map) if (v === picked) map.delete(k);
    map.set(left, picked);
    setPicked(null);
    emit(map);
  };

  const used = new Set(assigned.values());

  return (
    <div className="mt-6 space-y-4">
      <p className="text-xs text-muted-foreground">
        Pick an answer from the bank, then tap the item it belongs to. Tap a filled row to clear it.
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Available answers">
        {bank.map((r) => (
          <button
            key={r}
            type="button"
            disabled={disabled || used.has(r)}
            aria-pressed={picked === r}
            onClick={() => setPicked((p) => (p === r ? null : r))}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs transition-colors",
              used.has(r) && "opacity-30",
              picked === r && "border-primary bg-primary/15 text-primary",
              !disabled && !used.has(r) && "hover:border-primary/60",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <p role="status" className="sr-only">
        {picked ? `Selected “${picked}”. Now choose where it belongs.` : ""}
      </p>

      <ul className="grid gap-2" aria-label="Pairs to match">
        {pairs.map((p) => {
          const chosen = assigned.get(p.left);
          const isRight = chosen !== undefined && eq(chosen, p.right);
          return (
            <li key={p.left}>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${p.left}: ${chosen ?? "no answer yet"}`}
                onClick={() => place(p.left)}
                className={cn(
                  "grid w-full grid-cols-1 items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-4 py-3 text-left text-sm sm:grid-cols-2",
                  !disabled && "hover:border-primary/60",
                  revealed &&
                    (isRight
                      ? "border-success bg-success/10"
                      : "border-destructive/60 bg-destructive/10"),
                )}
              >
                <span className="font-medium">{p.left}</span>
                <span
                  className={cn(
                    "rounded-md border border-dashed border-border px-3 py-1.5 text-xs",
                    chosen
                      ? "border-solid border-primary/50 text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {chosen ?? "Tap to place an answer"}
                </span>
              </button>
              {revealed && !isRight && (
                <p className="mt-1 text-[11px] text-success">Correct: {p.right}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Word bank                                                           */
/* ------------------------------------------------------------------ */

function WordBankQuestion({ question, value, onChange, disabled, revealed }: InteractiveProps) {
  const blanks = useMemo(() => question.blanks ?? [], [question.blanks]);
  const segments = useMemo(() => splitBlanks(question.question), [question.question]);
  const [pool, setPool] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const filled = useMemo(() => {
    const parts = value ? value.split(ITEM_SEP) : [];
    return blanks.map((_, i) => parts[i] ?? "");
  }, [blanks, value]);

  useEffect(() => {
    setPool(shuffleArray(wordBankPool(question)));
    setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const emit = (next: string[]) => onChange(serializeWordBank(next));

  const setSlot = (i: number) => {
    if (disabled) return;
    const next = [...filled];
    if (next[i] && !picked) {
      next[i] = "";
      emit(next);
      return;
    }
    if (!picked) return;
    next[i] = picked;
    setPicked(null);
    emit(next);
  };

  const usedCounts = filled.reduce<Record<string, number>>((acc, w) => {
    if (w) acc[w] = (acc[w] ?? 0) + 1;
    return acc;
  }, {});
  const available = (w: string) => pool.filter((x) => x === w).length > (usedCounts[w] ?? 0);

  return (
    <div className="mt-6 space-y-4">
      <p className="text-xs text-muted-foreground">
        Choose a word, then tap a blank. Tap a filled blank to send the word back.
      </p>

      <p className="rounded-xl border border-border bg-surface-2/50 p-4 text-base leading-loose">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < segments.length - 1 && (
              <button
                type="button"
                disabled={disabled}
                aria-label={filled[i] ? `Blank ${i + 1}: ${filled[i]}` : `Blank ${i + 1}, empty`}
                onClick={() => setSlot(i)}
                className={cn(
                  "mx-1 inline-block min-w-24 max-w-full break-words rounded-md border-b-2 border-dashed border-border px-2 py-0.5 text-sm",
                  filled[i]
                    ? "border-solid border-primary/60 text-foreground"
                    : "text-muted-foreground",
                  !disabled && "hover:border-primary",
                  revealed &&
                    (eq(filled[i] ?? "", blanks[i] ?? "")
                      ? "border-success bg-success/10 text-success"
                      : "border-destructive bg-destructive/10 text-destructive"),
                )}
              >
                {filled[i] || `blank ${i + 1}`}
              </button>
            )}
          </span>
        ))}
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Word bank">
        {pool.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={disabled || !available(w)}
            aria-pressed={picked === w}
            onClick={() => setPicked((p) => (p === w ? null : w))}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs transition-colors",
              !available(w) && "opacity-30",
              picked === w && "border-primary bg-primary/15 text-primary",
              !disabled && available(w) && "hover:border-primary/60",
            )}
          >
            {w}
          </button>
        ))}
      </div>

      <p role="status" className="sr-only">
        {picked ? `Selected “${picked}”. Now choose a blank.` : ""}
      </p>

      {revealed && <p className="text-[11px] text-success">Correct words: {blanks.join(", ")}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Renders the matching / ordering / word-bank interaction for a question. */
export function InteractiveQuestion(props: InteractiveProps) {
  switch (props.question.type) {
    case "ordering":
      return <OrderingQuestion {...props} />;
    case "matching":
      return <MatchingQuestion {...props} />;
    case "word-bank":
      return <WordBankQuestion {...props} />;
    default:
      return null;
  }
}

/** True when the learner has supplied enough input to submit. */
export function isInteractiveComplete(question: Question, value: string): boolean {
  if (!value.trim()) return false;
  if (question.type === "matching")
    return value.split(ITEM_SEP).length === (question.pairs?.length ?? 0);
  if (question.type === "word-bank") {
    const parts = value.split(ITEM_SEP);
    return (
      parts.length === (question.blanks?.length ?? 0) && parts.every((p) => p.trim().length > 0)
    );
  }
  return true;
}

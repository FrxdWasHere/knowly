import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LABEL_COLORS, LABEL_STYLES, labelById, type BinderLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Small coloured chips showing the labels stuck on an item. */
export function LabelChips({
  labels,
  labelIds,
  className,
}: {
  labels: BinderLabel[];
  labelIds?: string[];
  className?: string;
}) {
  if (!labelIds?.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {labelIds.map((id) => {
        const label = labelById(labels, id);
        if (!label) return null;
        return (
          <Badge
            key={id}
            variant="outline"
            className={cn("px-1.5 py-0 text-[10px]", LABEL_STYLES[label.color].chip)}
          >
            {label.emoji} {label.name}
          </Badge>
        );
      })}
    </span>
  );
}

/**
 * The label picker dialog: tick labels on and off, see what each colour is,
 * and jump to the manager to create new ones.
 */
export function LabelPickerDialog({
  open,
  onOpenChange,
  labels,
  labelIds,
  onChange,
  title = "Binder labels",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: BinderLabel[];
  labelIds: string[];
  onChange: (labelIds: string[]) => void;
  title?: string;
}) {
  const toggle = (id: string) =>
    onChange(labelIds.includes(id) ? labelIds.filter((x) => x !== id) : [...labelIds, id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Stick colour-coded labels on this item to find it fast in the library.
          </DialogDescription>
        </DialogHeader>
        {labels.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2/60 p-4 text-sm text-muted-foreground">
            No labels yet. Make your first label in the label manager.
          </p>
        ) : (
          <div className="grid gap-2">
            {labels.map((label) => {
              const on = labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    on
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn("size-3 shrink-0 rounded-full", LABEL_STYLES[label.color].dot)}
                  />
                  <span>
                    {label.emoji ? `${label.emoji} ` : ""}
                    {label.name}
                  </span>
                  {!on && (
                    <span className="ml-auto text-[10px] text-muted-foreground">tap to stick</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/labels">
              <Tag className="size-3.5" /> Manage labels
            </Link>
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Row of colour options used by the label manager. */
export function LabelColorRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Label colour">
      {LABEL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            "size-7 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition-transform hover:scale-110",
            value === color ? "ring-primary" : "ring-transparent",
          )}
        >
          <span className={cn("mx-auto block size-4 rounded-full", LABEL_STYLES[color].dot)} />
        </button>
      ))}
    </div>
  );
}

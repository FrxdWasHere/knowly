import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import { useKnowly } from "@/store/knowly";

export interface PaletteTarget {
  to: string;
  label: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  targets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: PaletteTarget[];
}) {
  const navigate = useNavigate();
  const { state, updateSettings } = useKnowly();

  const decks = useMemo(() => state.decks.slice(0, 40), [state.decks]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to: to as never });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <CommandInput placeholder="Jump to a page, deck or action…" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        <CommandGroup heading="Pages">
          {targets.map((t) => (
            <CommandItem key={t.to} value={`page ${t.label}`} onSelect={() => go(t.to)}>
              {t.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {decks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Decks">
              {decks.map((deck) => (
                <CommandItem
                  key={deck.id}
                  value={`deck ${deck.title} ${deck.subject}`}
                  onSelect={() => go(`/decks/${deck.id}`)}
                >
                  {deck.title}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {deck.questions.length} cards
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="action start daily review" onSelect={() => go("/review")}>
            Start daily review
          </CommandItem>
          <CommandItem value="action cram mode blitz" onSelect={() => go("/cram")}>
            Start a cram blitz
          </CommandItem>
          <CommandItem value="action drill weak spots" onSelect={() => go("/weak-spots")}>
            Drill weak spots
          </CommandItem>
          <CommandItem value="action new journal entry" onSelect={() => go("/journal")}>
            Open study journal
          </CommandItem>
          <CommandItem
            value="action toggle sidebar collapse"
            onSelect={() => {
              updateSettings({ sidebarCollapsed: !state.settings.sidebarCollapsed });
              onOpenChange(false);
            }}
          >
            {state.settings.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </CommandItem>
          <CommandItem
            value="action switch theme dark light"
            onSelect={() => {
              updateSettings({ theme: state.settings.theme === "dark" ? "light" : "dark" });
              onOpenChange(false);
            }}
          >
            Switch to {state.settings.theme === "dark" ? "light" : "dark"} theme
          </CommandItem>
          <CommandItem value="action keyboard shortcuts help" onSelect={() => go("/shortcuts")}>
            Keyboard shortcuts
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}

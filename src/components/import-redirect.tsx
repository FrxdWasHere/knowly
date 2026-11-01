import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpenCheck, Download, Layers, NotebookText, Puzzle } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import type { ImportKind } from "@/lib/import-detect";
import { openImportPanel } from "@/lib/import-panel";

const FORMATS = [
  { icon: Layers, label: "Decks", note: "A full question bank, or a batch of extra questions" },
  { icon: BookOpenCheck, label: "Courses", note: "Modules, lessons, quizzes and a final exam" },
  { icon: Puzzle, label: "Modules", note: "One focused lesson with blocks and checkpoints" },
  { icon: NotebookText, label: "Notebooks", note: "Pages of notes, exported from Knowly" },
  { icon: Download, label: "Backups", note: "Your whole library, restored in one go" },
];

/**
 * Old import URLs still work: they open the single import side panel instead of
 * a dedicated page, so the user keeps their place in the app.
 */
export function ImportRedirect({ kind, deckId }: { kind?: ImportKind; deckId?: string }) {
  useEffect(() => {
    openImportPanel({ kind, deckId });
  }, [kind, deckId]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Import"
        description="Everything Knowly can read now lives in one side panel. Open it from the sidebar, or from here."
        action={
          <Button onClick={() => openImportPanel({ kind, deckId })}>
            <Download className="size-4" /> Open the importer
          </Button>
        }
      />

      <div className="panel p-5">
        <p className="text-sm font-semibold">One panel, every Knowly file</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Drop a file and Knowly works out what it is — no need to pick the right page first.
        </p>
        <ul className="mt-4 space-y-2">
          {FORMATS.map((format) => (
            <li
              key={format.label}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-3"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                <format.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{format.label}</span>
                <span className="block text-xs text-muted-foreground">{format.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Looking for the file format?{" "}
          <Link to="/format" className="text-primary underline underline-offset-2">
            Deck file format
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

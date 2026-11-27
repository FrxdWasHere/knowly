import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Download, Upload, RotateCcw, Trash2 } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { DEFAULT_STATE } from "@/lib/defaults";
import { createId } from "@/lib/id";
import { loadRestorePoints, saveRestorePoints, type RestorePoint } from "@/lib/cloud-local-content";
import type { AppState } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/snapshots")({
  head: () => ({
    meta: [
      { title: "Snapshots & Backup — Protect Your Library | Knowly" },
      {
        name: "description",
        content:
          "Save point-in-time snapshots of your library and restore any of them in one click. Snapshots sync to your account when signed in.",
      },
      { property: "og:title", content: "Snapshots & Backup — Knowly" },
      {
        property: "og:description",
        content: "One-click snapshots, restore and downloadable backups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <SnapshotsPage />
    </AppPage>
  ),
});

function fmt(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SnapshotsPage() {
  const { state, setState } = useKnowly();
  const [snapshots, setSnapshots] = useState<RestorePoint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSnapshots(loadRestorePoints());
    setLoaded(true);
  }, []);

  const cardCount = useMemo(
    () => state.decks.reduce((n, d) => n + d.questions.length, 0),
    [state.decks],
  );

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3000);
  };

  const take = () => {
    const snap: RestorePoint = {
      id: createId("snap"),
      label: `${state.decks.length} decks · ${cardCount} cards`,
      createdAt: Date.now(),
      deckCount: state.decks.length,
      cardCount,
      data: state,
    };
    const list = [snap, ...loadRestorePoints()].slice(0, 20);
    saveRestorePoints(list);
    setSnapshots(list);
    flash("Restore point saved.");
  };

  const restore = (snap: RestorePoint) => {
    setState(() => snap.data);
    flash("Library restored.");
  };

  const remove = (id: string) => {
    const list = loadRestorePoints().filter((s) => s.id !== id);
    saveRestorePoints(list);
    setSnapshots(list);
  };

  const download = (snap: RestorePoint) => {
    const blob = new Blob([JSON.stringify(snap.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowly-backup-${new Date(snap.createdAt).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppState;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.decks)) {
        flash("That file does not look like a Knowly backup.");
        return;
      }
      const snap: RestorePoint = {
        id: createId("snap"),
        label: `Imported · ${parsed.decks.length} decks`,
        createdAt: Date.now(),
        deckCount: parsed.decks.length,
        cardCount: parsed.decks.reduce((n, d) => n + d.questions.length, 0),
        data: { ...DEFAULT_STATE, ...parsed },
      };
      const list = [snap, ...loadRestorePoints()].slice(0, 20);
      saveRestorePoints(list);
      setSnapshots(list);
      flash("Backup loaded.");
    } catch {
      flash("That file could not be read.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Snapshots & Backup"
        description="Save a restore point before big changes, or download a backup file. Restore points sync to your account when signed in."
        action={
          <div className="flex gap-2">
            <label>
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                  e.target.value = "";
                }}
              />
              <span className="press inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:border-primary/50">
                <Upload className="size-4" /> Import backup
              </span>
            </label>
            <Button onClick={take}>
              <Camera className="mr-2 size-4" /> Take snapshot
            </Button>
          </div>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="font-display text-2xl font-bold">{state.decks.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Decks right now</p>
        </div>
        <div className="panel p-5">
          <p className="font-display text-2xl font-bold">{cardCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Cards right now</p>
        </div>
        <div className="panel p-5">
          <p className="font-display text-2xl font-bold">{snapshots.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Saved snapshots</p>
        </div>
      </section>

      {notice && (
        <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          {notice}
        </div>
      )}

      <div className="grid gap-3">
        {!loaded ? null : snapshots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Camera className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No snapshots yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Take one before importing, merging or deleting anything — restoring takes one click.
            </p>
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5"
            >
              <div>
                <p className="font-medium">{fmt(snap.createdAt)}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[11px]">
                    {snap.deckCount} decks
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">
                    {snap.cardCount} cards
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => download(snap)}>
                  <Download className="mr-1.5 size-3.5" /> Download
                </Button>
                <Button size="sm" onClick={() => restore(snap)}>
                  <RotateCcw className="mr-1.5 size-3.5" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(snap.id)}
                  aria-label="Delete snapshot"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, X, FileJson } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Module } from "@/lib/types";
import { createId } from "@/lib/id";

export const Route = createFileRoute("/_authenticated/modules/import")({
  head: () => ({ meta: [{ title: "Import a Module — Knowly" }] }),
  component: () => (
    <AppPage>
      <ImportModulePage />
    </AppPage>
  ),
});

function ImportModulePage() {
  const { addModule } = useKnowly();
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = (() => {
    if (!raw.trim()) return null;
    try {
      const v = JSON.parse(raw);
      if (!v || typeof v !== "object") return { error: "Not a JSON object" };
      if (typeof v.title !== "string" || !v.title.trim()) return { error: "Missing 'title'" };
      return { ok: true as const, value: v };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  })();

  const readFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => setRaw(String(r.result));
    r.readAsText(file);
  };

  const doImport = () => {
    if (!parsed || "error" in parsed) return;
    const v = parsed.value as Partial<Module>;
    const now = Date.now();
    const mod: Module = {
      id: v.id && typeof v.id === "string" ? v.id : createId(),
      title: String(v.title).trim(),
      subject: typeof v.subject === "string" ? v.subject : "General",
      color: typeof v.color === "string" ? v.color : "#6d8cff",
      emoji: typeof v.emoji === "string" ? v.emoji : "📘",
      tags: Array.isArray(v.tags) ? v.tags.filter((x): x is string => typeof x === "string") : [],
      isSTEM: Boolean(v.isSTEM),
      needsEquations: Boolean(v.needsEquations),
      needsGraphs: Boolean(v.needsGraphs),
      objectives: Array.isArray(v.objectives)
        ? v.objectives.filter((x): x is string => typeof x === "string")
        : [],
      blocks: Array.isArray(v.blocks)
        ? (v.blocks as Module["blocks"])
        : [{ id: `b_${now}`, type: "markdown", markdown: "" }],
      questions: Array.isArray(v.questions) ? v.questions : [],
      linkedDeckIds: Array.isArray(v.linkedDeckIds)
        ? v.linkedDeckIds.filter((x): x is string => typeof x === "string")
        : [],
      estimatedMinutes: typeof v.estimatedMinutes === "number" ? v.estimatedMinutes : 15,
      difficulty: (v.difficulty === 1 || v.difficulty === 2 || v.difficulty === 3
        ? v.difficulty
        : 2) as 1 | 2 | 3,
      notebookId: typeof v.notebookId === "string" ? v.notebookId : undefined,
      createdAt: now,
      updatedAt: now,
    };
    addModule(mod);
    toast.success("Module imported");
    navigate({ to: "/modules/$moduleId", params: { moduleId: mod.id } } as never);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Import a module"
        description="Paste or upload a module JSON file (the kind your AI produces). Knowly validates it and adds it to your library."
      />
      <div
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) readFile(f);
        }}
      >
        <UploadCloud className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Drag & drop a .json file, or</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => fileRef.current?.click()}
        >
          <FileJson className="size-4" /> Choose file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='{ "title": "Photosynthesis in 10 minutes", "subject": "Biology", "blocks": [...] }'
        className="min-h-48 font-mono text-xs"
      />

      {parsed && "error" in parsed && raw.trim() && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="size-4" /> {parsed.error}
        </div>
      )}
      {parsed && "ok" in parsed && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-4" /> Looks valid — ready to import
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={doImport} disabled={!parsed || "error" in parsed}>
          Import module
        </Button>
        <Button variant="ghost" onClick={() => setRaw("")}>
          Clear
        </Button>
      </div>
    </div>
  );
}

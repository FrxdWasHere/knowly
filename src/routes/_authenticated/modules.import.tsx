import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Puzzle,
  UploadCloud,
  Wand2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_MODULE_JSON, validateModuleJson } from "@/lib/module-schema";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/_authenticated/modules/import")({
  head: () => ({
    meta: [
      { title: "Import a Module — Add an AI-Made Module | Knowly" },
      {
        name: "description",
        content:
          "Paste or upload AI-generated module JSON. Knowly validates the blocks, blurbs and checkpoint questions before adding it to your module library.",
      },
    ],
  }),
  component: ModuleImportPage,
});

function ModuleImportPage() {
  const { addModule } = useKnowly();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [dragging, setDragging] = useState(false);

  const result = useMemo(() => (raw.trim() ? validateModuleJson(raw) : null), [raw]);
  const module = result?.module;
  const blockCount = module?.blocks.length ?? 0;
  const blurbCount = module?.blocks.filter((block) => block.type === "callout").length ?? 0;
  const questionCount = module?.questions.length ?? 0;

  const loadFile = async (file: File) => {
    setRaw(await file.text());
    toast.success(`Loaded ${file.name}`);
  };

  const doImport = () => {
    if (!module) return;
    addModule(module);
    toast.success(`Imported ${module.title}`, {
      description: `${blockCount} blocks · ${blurbCount} blurbs · ${questionCount} checkpoints`,
    });
    navigate({ to: "/modules/$moduleId", params: { moduleId: module.id } });
  };

  return (
    <AppPage>
      <PageHeader
        title="Import a module"
        description="Paste the module your AI made with Module Prompter, or upload the file. Nothing is added until every block and checkpoint question checks out."
        action={
          <>
            <Button asChild variant="outline">
              <Link to="/modules/prompter">
                <Wand2 className="size-4" /> Module Prompter
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setRaw(SAMPLE_MODULE_JSON)}>
              Load sample
            </Button>
            <Button onClick={doImport} disabled={!module}>
              <CheckCircle2 className="size-4" /> Import module
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileJson className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Module from Module Prompter</h2>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void loadFile(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="size-4" /> Upload
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRaw("")} disabled={!raw}>
                Clear
              </Button>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void loadFile(file);
            }}
            className={dragging ? "rounded-xl ring-2 ring-primary/50" : ""}
          >
            <Textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="Paste the module here, or drag the file onto this box…"
              className="min-h-[420px] font-mono text-xs leading-6"
              spellCheck={false}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Your module is made of: a title, subject and goals → writing blocks (notes, blurbs,
            examples, dividers) → checkpoint questions. Activity squares are optional and relink to
            the decks on this device.
          </p>
        </section>

        <section className="space-y-4">
          {!result && (
            <div className="panel flex flex-col items-center px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Puzzle className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">Preview appears here</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Paste a module to preview its blocks, blurbs and checkpoints — plus anything that
                still needs fixing.
              </p>
            </div>
          )}

          {result && (
            <>
              <div
                className={`panel p-5 ${result.ok ? "border-success/40" : "border-destructive/40"}`}
              >
                <div className="flex items-start gap-3">
                  {result.ok ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">
                      {result.ok ? module?.title : "A few things need fixing"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.ok ? module?.subject : "Fix the items below, then check again."}
                    </p>
                  </div>
                </div>

                {result.ok && module && (
                  <>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{blockCount} blocks</Badge>
                      <Badge variant="outline">{blurbCount} blurbs</Badge>
                      <Badge variant="outline">{questionCount} checkpoints</Badge>
                      <Badge variant="outline">{module.estimatedMinutes} min</Badge>
                      <Badge variant="outline">
                        {module.difficulty === 1
                          ? "Intro"
                          : module.difficulty === 3
                            ? "Advanced"
                            : "Core"}
                      </Badge>
                    </div>
                    {module.objectives.length > 0 && (
                      <div className="mt-4 rounded-xl border border-border bg-surface2/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Goals
                        </p>
                        <ul className="mt-2 space-y-1 pl-1.5 text-sm">
                          {module.objectives.map((objective, index) => (
                            <li key={index}>· {objective}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 space-y-2">
                      {module.blocks.slice(0, 8).map((block, index) => (
                        <div
                          key={block.id}
                          className="rounded-xl border border-border bg-surface2/60 p-3"
                        >
                          <p className="text-sm font-medium">
                            {index + 1}.{" "}
                            {block.type === "callout"
                              ? `Blurb — ${block.title || "Untitled"}`
                              : block.type === "example"
                                ? `Example — ${block.title || "Untitled"}`
                                : block.type === "checkpoint"
                                  ? "Checkpoint"
                                  : block.type === "activity"
                                    ? `Activity — ${block.title || "Deck"}`
                                    : block.type === "image"
                                      ? "Image"
                                      : block.type === "divider"
                                        ? "Divider"
                                        : "Note"}
                          </p>
                          {block.markdown && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {block.markdown.replace(/[#*_`>]/g, "")}
                            </p>
                          )}
                        </div>
                      ))}
                      {module.blocks.length > 8 && (
                        <p className="text-xs text-muted-foreground">
                          …and {module.blocks.length - 8} more blocks
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="panel border-destructive/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <XCircle className="size-4" /> {result.errors.length}{" "}
                    {result.errors.length === 1 ? "thing needs fixing" : "things need fixing"}
                  </p>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-xs leading-5">
                    {result.errors.map((error, index) => (
                      <li key={index} className="rounded-lg bg-destructive/10 p-2 font-mono">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="panel border-warning/30 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                    <AlertTriangle className="size-4" /> {result.warnings.length} warnings
                  </p>
                  <ul className="mt-3 max-h-52 space-y-2 overflow-auto text-xs leading-5 text-muted-foreground">
                    {result.warnings.map((warning, index) => (
                      <li key={index} className="rounded-lg bg-warning/10 p-2">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.ok && module && (
                <Button className="w-full" onClick={doImport}>
                  <CheckCircle2 className="size-4" /> Add this module to Knowly
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </AppPage>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Hammer, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKnowly } from "@/store/knowly";
import type { Module } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/modules/forge")({
  head: () => ({ meta: [{ title: "Module Forge — Knowly" }] }),
  component: () => (
    <AppPage>
      <ModuleForge />
    </AppPage>
  ),
});

function ModuleForge() {
  const { addModule } = useKnowly();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("2");
  const [minutes, setMinutes] = useState("15");
  const [objectives, setObjectives] = useState("");

  const forge = () => {
    if (!title.trim()) return;
    const now = Date.now();
    const mod: Module = {
      id: `mod_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`,
      title: title.trim(),
      subject: subject.trim() || "General",
      color: "#6d8cff",
      emoji: "📘",
      tags: [],
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
      objectives: objectives
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      blocks: [
        {
          id: `b_${now}`,
          type: "markdown",
          markdown: `# ${title.trim()}\n\nStart writing your lesson here.`,
        },
      ],
      questions: [],
      linkedDeckIds: [],
      estimatedMinutes: Number(minutes) || 15,
      difficulty: Number(difficulty) as 1 | 2 | 3,
      createdAt: now,
      updatedAt: now,
    };
    addModule(mod);
    toast.success("Module forged — open the editor to refine it");
    navigate({ to: "/modules/$moduleId", params: { moduleId: mod.id } } as never);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Module Forge"
        description="Hand-build a standalone module block by block. You can add checkpoints, examples and activity squares in the editor."
      />
      <div className="panel space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Photosynthesis in 10 minutes"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Biology"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Intro</SelectItem>
                <SelectItem value="2">Core</SelectItem>
                <SelectItem value="3">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estimated minutes</Label>
            <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Objectives (one per line)</Label>
          <Textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            className="min-h-20"
          />
        </div>
        <Button onClick={forge} disabled={!title.trim()}>
          <Hammer className="size-4" /> Forge module
        </Button>
      </div>
    </div>
  );
}

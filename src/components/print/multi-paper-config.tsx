import { useMemo, useState } from "react";
import { Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  BULK_STRATEGIES,
  eligibleQuestions,
  generateBulkPapers,
  getRequiredPoolSize,
  type BulkDistributionStrategy,
  type BulkExamConfig,
  type GeneratedBulkPaper,
} from "@/lib/exam-bulk";
import type { ExamOptions, SelectionFilters } from "@/lib/exam-print";
import type { Question } from "@/lib/types";

interface MultiPaperConfigProps {
  pool: Question[];
  filters: SelectionFilters;
  baseOptions: ExamOptions;
  onGenerate: (papers: GeneratedBulkPaper[]) => void;
}

const MAX_PAPERS = 50;

function clampCount(value: number, max = 999): number {
  return Math.min(max, Math.max(1, Math.round(value) || 1));
}

export function MultiPaperConfig({
  pool,
  filters,
  baseOptions,
  onGenerate,
}: MultiPaperConfigProps) {
  const [numberOfPapers, setNumberOfPapers] = useState(3);
  const [strategy, setStrategy] = useState<BulkDistributionStrategy>("same-for-all");
  const [perPaperCount, setPerPaperCount] = useState(20);
  const [customCounts, setCustomCounts] = useState<number[]>([20, 20, 20]);
  const [autoNumbering, setAutoNumbering] = useState(true);
  const [namingPrefix, setNamingPrefix] = useState(baseOptions.title || "Exam");

  const available = useMemo(() => eligibleQuestions(pool, filters).length, [pool, filters]);

  const counts = Array.from({ length: numberOfPapers }, (_, i) =>
    strategy === "custom-per-paper" ? (customCounts[i] ?? perPaperCount) : perPaperCount,
  );

  const config: BulkExamConfig = {
    numberOfPapers,
    distributionStrategy: strategy,
    questionsPerPaper: strategy === "custom-per-paper" ? counts : perPaperCount,
    autoNumbering,
    namingPrefix,
  };

  const required = getRequiredPoolSize(config);
  const hasEnough = available > 0 && available >= required;

  const updateNumberOfPapers = (next: number) => {
    const clamped = clampCount(next, MAX_PAPERS);
    setNumberOfPapers(clamped);
    setCustomCounts((current) =>
      Array.from({ length: clamped }, (_, i) => current[i] ?? perPaperCount),
    );
  };

  const updateCustomCount = (index: number, next: number) => {
    setCustomCounts((current) => {
      const copy = Array.from({ length: numberOfPapers }, (_, i) => current[i] ?? perPaperCount);
      copy[index] = clampCount(next);
      return copy;
    });
  };

  const handleGenerate = () => {
    if (!hasEnough) return;
    onGenerate(generateBulkPapers(pool, filters, baseOptions, config));
  };

  return (
    <section className="panel space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="size-4 text-primary" /> Multiple papers
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {available} eligible {available === 1 ? "question" : "questions"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="bulk-paper-count" className="text-xs">
            Number of papers
          </Label>
          <Input
            id="bulk-paper-count"
            type="number"
            min={1}
            max={MAX_PAPERS}
            value={numberOfPapers}
            onChange={(e) => updateNumberOfPapers(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bulk-per-paper" className="text-xs">
            Questions per paper
          </Label>
          <Input
            id="bulk-per-paper"
            type="number"
            min={1}
            value={perPaperCount}
            disabled={strategy === "custom-per-paper"}
            onChange={(e) => setPerPaperCount(clampCount(parseInt(e.target.value, 10) || 1))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Distribution</Label>
        <div role="radiogroup" aria-label="Distribution strategy" className="grid gap-2">
          {BULK_STRATEGIES.map((option) => {
            const active = strategy === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (option.id === "custom-per-paper" && strategy !== "custom-per-paper") {
                    setCustomCounts(Array.from({ length: numberOfPapers }, () => perPaperCount));
                  }
                  setStrategy(option.id);
                }}
                className={cn(
                  "press rounded-lg border p-3 text-left transition-colors",
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-3.5 shrink-0 place-items-center rounded-full border",
                      active ? "border-primary" : "border-muted-foreground/50",
                    )}
                  >
                    {active && <span className="size-1.5 rounded-full bg-primary" />}
                  </span>
                  {option.label}
                </span>
                <span className="mt-1 block pl-5 text-[11px] leading-4 text-muted-foreground">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {strategy === "custom-per-paper" && (
        <div className="space-y-2">
          <Label className="text-xs">Questions on each paper</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: numberOfPapers }, (_, i) => (
              <label key={i} className="space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Paper {i + 1}
                </span>
                <Input
                  type="number"
                  min={1}
                  value={counts[i] ?? perPaperCount}
                  onChange={(e) => updateCustomCount(i, parseInt(e.target.value, 10) || 1)}
                  aria-label={`Questions on paper ${i + 1}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="bulk-auto-number" className="text-xs">
            Auto-number papers
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Adds “Paper 1”, “Paper 2”, … to every title
          </p>
        </div>
        <Switch id="bulk-auto-number" checked={autoNumbering} onCheckedChange={setAutoNumbering} />
      </div>

      {autoNumbering && (
        <div className="space-y-2">
          <Label htmlFor="bulk-prefix" className="text-xs">
            Naming prefix
          </Label>
          <Input
            id="bulk-prefix"
            value={namingPrefix}
            placeholder={baseOptions.title || "e.g. Biology Midterm"}
            onChange={(e) => setNamingPrefix(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Preview: “{namingPrefix.trim() || baseOptions.title || "Exam"} — Paper 1”
          </p>
        </div>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-[11px] leading-4 text-muted-foreground">
          {strategy === "same-for-all"
            ? `One set of ${required} questions, reused on all ${numberOfPapers} papers.`
            : `${required} questions needed across ${numberOfPapers} papers · ${available} available.`}
        </p>
        <Button className="w-full" onClick={handleGenerate} disabled={!hasEnough}>
          <Sparkles /> Generate {numberOfPapers} {numberOfPapers === 1 ? "paper" : "papers"}
        </Button>
        {!hasEnough && (
          <p className="text-[11px] font-medium text-destructive">
            {available === 0
              ? "No questions match the selected types and difficulty."
              : `Not enough eligible questions — add more cards, widen the filters, or ask for fewer questions per paper.`}
          </p>
        )}
      </div>
    </section>
  );
}

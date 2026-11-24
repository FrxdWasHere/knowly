import type { LengthPreset } from "@/lib/smart-mode";
import { LENGTH_PRESETS } from "@/lib/smart-mode";
import { describeLengthBudget, presetForSliderValue } from "@/lib/length-detail";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LengthPresetButtonProps {
  preset: LengthPreset;
  active: boolean;
  onSelect: (preset: LengthPreset) => void;
}

function LengthPresetButton({ preset, active, onSelect }: LengthPresetButtonProps) {
  const config = LENGTH_PRESETS[preset];

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={() => onSelect(preset)}
      className={cn(
        "h-auto min-h-12 flex-col items-start gap-0 rounded-lg px-3 py-2 text-left transition-all duration-200",
        active && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <span className="text-sm font-semibold">{config.label}</span>
      <span className={cn("text-[10px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {config.description}
      </span>
    </Button>
  );
}

interface LengthDetailControlProps {
  /** 0–100 shared length/detail value */
  value: number;
  preset: LengthPreset;
  onChange: (value: number, preset: LengthPreset) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/**
 * The one length/detail control every Prompt Studio surface shares.
 *
 * The five presets are shortcuts, not the source of truth: the slider value
 * drives the shared budget (stages, activities, depth, reinforcement and
 * explanation detail), so an in-between value still produces a coherent plan.
 */
export function LengthDetailControl({
  value,
  preset,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: LengthDetailControlProps) {
  const handleSliderChange = (next: number[]) => {
    const raw = next[0] ?? value;
    const clamped = Math.min(max, Math.max(min, Math.round(raw)));
    onChange(clamped, presetForSliderValue(clamped));
  };

  const handlePresetSelect = (nextPreset: LengthPreset) => {
    onChange(LENGTH_PRESETS[nextPreset].sliderValue, nextPreset);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(Object.keys(LENGTH_PRESETS) as LengthPreset[]).map((p) => (
          <LengthPresetButton
            key={p}
            preset={p}
            active={preset === p}
            onSelect={handlePresetSelect}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Length / detail</span>
          <span className="text-sm font-semibold">
            {LENGTH_PRESETS[preset].label} · {value}/100
          </span>
        </div>

        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="h-2"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Essential</span>
          <span>Comprehensive</span>
        </div>
      </div>

      <div className="rounded-lg bg-surface-2/50 p-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <span className="mt-0.5">💡</span>
          <p>{describeLengthBudget(value)}</p>
        </div>
      </div>
    </div>
  );
}

/** Kept for callers that want a tiny local state wrapper. */
export function useLengthDetail(initialValue: number = 50) {
  const preset = presetForSliderValue(initialValue);
  return { value: initialValue, preset, LENGTH_PRESETS };
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PrintStyle = "design" | "friendly";

const STYLES: { id: PrintStyle; label: string; hint: string }[] = [
  {
    id: "design",
    label: "Full design",
    hint: "Every theme element and full-colour cover, built for digital viewing.",
  },
  {
    id: "friendly",
    label: "Print friendly",
    hint: "White paper with accent rules instead of washes and covers, to save ink.",
  },
];

/**
 * One menu shared by the exam builder and the module and course print panels.
 * Full design keeps the paper art, print friendly strips the ink-heavy layers.
 */
export function PrintStyleMenu({
  value,
  onChange,
  id = "print-style",
}: {
  value?: PrintStyle;
  onChange: (style: PrintStyle) => void;
  id?: string;
}) {
  const active = STYLES.find((style) => style.id === (value ?? "design")) ?? STYLES[0]!;
  return (
    <div className="space-y-2">
      <Select value={active.id} onValueChange={(next) => onChange(next as PrintStyle)}>
        <SelectTrigger id={id} className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STYLES.map((style) => (
            <SelectItem key={style.id} value={style.id}>
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] leading-4 text-muted-foreground">{active.hint}</p>
    </div>
  );
}

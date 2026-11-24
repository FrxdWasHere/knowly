import { Palette } from "lucide-react";
import { EXAM_THEMES, type ExamTheme } from "@/lib/exam-print";
import { getDocumentThemeLabel, isDocumentTheme } from "@/lib/document-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DocumentThemePicker({
  value,
  onChange,
}: {
  value: ExamTheme;
  onChange: (theme: ExamTheme) => void;
}) {
  const active = EXAM_THEMES.find((theme) => theme.id === value) ?? EXAM_THEMES[0]!;

  return (
    <Select
      value={value}
      onValueChange={(theme) => {
        if (isDocumentTheme(theme)) onChange(theme);
      }}
    >
      <SelectTrigger aria-label="Document reading theme" className="h-9 w-full gap-2 sm:w-52">
        <Palette className="size-4 shrink-0 text-primary" />
        <SelectValue>{getDocumentThemeLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {EXAM_THEMES.map((theme) => (
          <SelectItem key={theme.id} value={theme.id}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border border-border"
                style={{ background: theme.accent }}
              />
              <span className="min-w-0">
                <span className="block text-xs">{theme.label}</span>
                <span className="block max-w-64 truncate text-[10px] text-muted-foreground">
                  {theme.description}
                </span>
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

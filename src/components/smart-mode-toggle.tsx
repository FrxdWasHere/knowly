import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * SmartModeToggleProps - Props for the Smart Mode toggle component
 */
interface SmartModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  fileCount?: number;
  className?: string;
}

/**
 * SmartModeToggle - Toggle for enabling Smart Mode with file status
 */
export function SmartModeToggle({
  enabled,
  onToggle,
  fileCount = 0,
  className,
}: SmartModeToggleProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="smart-mode-toggle" className="cursor-pointer font-semibold">
              Smart Mode
            </Label>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              NEW
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {enabled
              ? `Knowly reads ${fileCount} source file(s) and suggests a starting setup.`
              : "Configure content manually."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            {enabled && fileCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="size-3.5" />
                <span>
                  {fileCount} file{fileCount !== 1 ? "s" : ""} uploaded
                </span>
              </div>
            )}
          </div>
          <Switch id="smart-mode-toggle" checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>

      {/* Help text when Smart Mode is enabled */}
      {enabled && (
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="flex gap-3 text-sm text-muted-foreground">
            <Info className="size-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p>
                <strong>Smart Mode</strong> extracts and analyzes your uploaded files on this device
                to suggest topics, titles, and learning objectives.
              </p>
              <p>
                Your chosen AI receives the copied prompt and source text. Review and edit the
                suggestions before using them.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * SmartModeIntro - Introductory text for Smart Mode
 */
export function SmartModeIntro({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4 bg-gradient-to-br from-primary/5 to-secondary/5", className)}>
      <div className="flex gap-3">
        <div className="bg-primary/20 p-2 rounded-lg shrink-0">
          <Info className="size-5 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">Introducing Smart Mode</h3>
          <p className="text-sm text-muted-foreground">
            Smart Mode uses AI to analyze your source materials and automatically configure your
            content. Upload files, review AI-generated suggestions, adjust length and detail, then
            generate your educational resource.
          </p>
        </div>
      </div>
    </Card>
  );
}

import {
  Award,
  Brain,
  Crosshair,
  Flame,
  Layers,
  Medal,
  Moon,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit icon registry for achievements.
 *
 * The achievement list stores icon names as strings, so rendering them used to
 * require `import * as LucideIcons from "lucide-react"` — which pulled the whole
 * icon library (~600 kB) into the achievements chunk. Listing the icons we
 * actually use keeps the bundle tree-shakeable. Keep this in sync with the
 * `icon` field of every entry in `ACHIEVEMENTS`.
 */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Award,
  Brain,
  Crosshair,
  Flame,
  Layers,
  Medal,
  Moon,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Zap,
};

/** Resolves an achievement's icon name to a component, falling back to `Award`. */
export function achievementIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICONS[name] ?? Award;
}

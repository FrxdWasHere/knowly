import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Library,
  Wand2,
  FileJson,
  Download,
  BrainCircuit,
  Brain,
  BarChart3,
  Trophy,
  Settings as SettingsIcon,
  Flame,
  Zap,
  PanelLeftClose,
  PanelLeft,
  Printer,
  Rocket,
  GraduationCap,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  LibraryBig,
  BookOpen,
  Compass,
  Activity,
  SlidersHorizontal,
  Table2,
  Timer,
  Star,
  Hammer,
  Target,
  Bug,
  Hash,
  NotebookPen,
  NotebookText,
  BookMarked,
  Search,
  Camera,
  FileBarChart,
  Shuffle,
  Keyboard,
  HardDrive,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  FileQuestion,
  Pencil,
  Play,
} from "lucide-react";
import { useKnowly } from "@/store/knowly";
import { levelFromXp } from "@/lib/gamification";
import { collectDue } from "@/lib/srs";
import { courseStats, lessonProgress, nextLesson } from "@/lib/courses";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallpaperUrl } from "@/hooks/use-wallpaper-url";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  /** Short line explaining what the feature does — shown under the label. */
  hint?: string;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  /** One-liner shown next to the section heading. */
  hint?: string;
  items: NavItem[];
}

/** Ordered around the actual study loop: home → study → library → build → notes → progress → system. */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Home",
    icon: LayoutDashboard,
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
        hint: "Daily snapshot — due cards, streak, weak topics",
      },
    ],
  },
  {
    label: "Study cycle",
    icon: Brain,
    hint: "Every way to practice",
    items: [
      {
        to: "/review",
        label: "Daily Review",
        icon: Brain,
        exact: false,
        hint: "Spaced repetition — cards due today",
      },
      {
        to: "/weak-spots",
        label: "Weak Spots",
        icon: Target,
        exact: false,
        hint: "Drill your 60 shakiest cards first",
      },
      {
        to: "/cram",
        label: "Cram Mode",
        icon: Rocket,
        exact: false,
        hint: "Last-minute blitz — ignores the schedule",
      },
      {
        to: "/quiz",
        label: "Practice Quiz",
        icon: BrainCircuit,
        exact: false,
        hint: "Build a custom quiz from any decks",
      },
      {
        to: "/exam",
        label: "Exam Simulator",
        icon: GraduationCap,
        exact: false,
        hint: "Timed mock exam, graded after submit",
      },
      {
        to: "/print",
        label: "Print Exam",
        icon: Printer,
        exact: false,
        hint: "Paper exam + answer key, ready to print",
      },
      {
        to: "/focus",
        label: "Focus Timer",
        icon: Timer,
        exact: false,
        hint: "Pomodoro rounds with session tracking",
      },
    ],
  },
  {
    label: "Courses",
    icon: BookMarked,
    hint: "Structured multi-week learning",
    items: [
      {
        to: "/courses",
        label: "Course Library",
        icon: BookMarked,
        exact: false,
        hint: "Lessons, checkpoints and final exams",
      },
      {
        to: "/courses/forge",
        label: "Course Forge",
        icon: Wand2,
        exact: false,
        hint: "Design a course — write it or forge it with AI outside",
      },
      {
        to: "/courses/import",
        label: "Import Course",
        icon: FileJson,
        exact: false,
        hint: "Paste a course JSON and validate it",
      },
    ],
  },
  {
    label: "Decks & cards",
    icon: Library,
    hint: "Browse everything you've collected",
    items: [
      {
        to: "/decks",
        label: "Deck Library",
        icon: Library,
        exact: false,
        hint: "All decks with due-count and mastery",
      },
      {
        to: "/cards",
        label: "Card Browser",
        icon: Table2,
        exact: false,
        hint: "One searchable table of every question",
      },
      {
        to: "/tags",
        label: "Tag Explorer",
        icon: Hash,
        exact: false,
        hint: "Browse by tag and concept",
      },
      {
        to: "/bookmarks",
        label: "Bookmarks & Notes",
        icon: Star,
        exact: false,
        hint: "Starred cards with your personal notes",
      },
    ],
  },
  {
    label: "Build & import",
    icon: Hammer,
    hint: "Create and maintain decks",
    items: [
      {
        to: "/forge",
        label: "Deck Forge",
        icon: Hammer,
        exact: false,
        hint: "Hand-build cards in all 8 question types",
      },
      {
        to: "/deck-tools",
        label: "Merge & Split",
        icon: Shuffle,
        exact: false,
        hint: "Combine decks or split one by tag",
      },
      {
        to: "/import",
        label: "Import JSON",
        icon: Download,
        exact: false,
        hint: "Paste question-bank JSON with validation",
      },
      {
        to: "/generate",
        label: "Prompt Forge",
        icon: Wand2,
        exact: false,
        hint: "Build an AI prompt — run it outside, import the result",
      },
      {
        to: "/format",
        label: "JSON Format",
        icon: FileJson,
        exact: false,
        hint: "Schema reference + sample deck files",
      },
    ],
  },
  {
    label: "Notes",
    icon: NotebookText,
    hint: "Where thinking happens",
    items: [
      {
        to: "/notes",
        label: "Notebooks",
        icon: NotebookText,
        exact: false,
        hint: "Handwriting, drawing, PDF pages and audio",
      },
      {
        to: "/journal",
        label: "Study Journal",
        icon: NotebookPen,
        exact: false,
        hint: "Daily reflections with mood and tags",
      },
    ],
  },
  {
    label: "Progress",
    icon: Activity,
    hint: "See how you're doing",
    items: [
      {
        to: "/stats",
        label: "Statistics",
        icon: BarChart3,
        exact: false,
        hint: "Heatmap, study time, accuracy trends",
      },
      {
        to: "/goals",
        label: "Goals & Streaks",
        icon: CalendarCheck,
        exact: false,
        hint: "Daily question goals and streak milestones",
      },
      {
        to: "/achievements",
        label: "Achievements",
        icon: Trophy,
        exact: false,
        hint: "Badges unlocked as you study",
      },
      {
        to: "/leeches",
        label: "Leech Manager",
        icon: Bug,
        exact: false,
        hint: "Fix the cards you keep forgetting",
      },
      {
        to: "/report",
        label: "Progress Report",
        icon: FileBarChart,
        exact: false,
        hint: "Printable summary for any date range",
      },
    ],
  },
  {
    label: "System",
    icon: SlidersHorizontal,
    hint: "Backups and preferences",
    items: [
      {
        to: "/snapshots",
        label: "Snapshots",
        icon: Camera,
        exact: false,
        hint: "Back up or restore your entire library",
      },
      {
        to: "/shortcuts",
        label: "Shortcuts & Help",
        icon: Keyboard,
        exact: false,
        hint: "Every keyboard shortcut and FAQ",
      },
      {
        to: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        exact: false,
        hint: "Theme, scheduling, gamification, data",
      },
    ],
  },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

const isNavItemActive = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.to : pathname.startsWith(item.to);

const navLinkClass = (active: boolean) =>
  cn(
    "press group relative mb-1 flex items-center gap-2.5 overflow-hidden rounded-[0.9rem] px-2.5 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
    active
      ? "bg-gradient-to-r from-primary/16 via-primary/5 to-transparent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--primary),0_12px_32px_-26px_var(--primary)] ring-1 ring-inset ring-primary/25"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  );

const navIconClass = (active: boolean) =>
  cn(
    "grid size-7 shrink-0 place-items-center rounded-[0.65rem] ring-1 transition-all duration-200 group-hover:scale-105",
    active
      ? "bg-primary/15 text-primary shadow-[0_0_18px_-8px_var(--primary)] ring-primary/30"
      : "bg-background/40 text-muted-foreground ring-sidebar-border group-hover:text-primary",
  );

/** Flat, always-labelled nav row: icon · name · one-line hint. */
function NavRow({ item, active, dueCount }: { item: NavItem; active: boolean; dueCount?: number }) {
  return (
    <Link to={item.to} title={item.hint ?? item.label} className={navLinkClass(active)}>
      <span className={navIconClass(active)}>
        <item.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight">{item.label}</span>
        {item.hint && (
          <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted-foreground/70 transition-colors group-hover:text-muted-foreground">
            {item.hint}
          </span>
        )}
      </span>
      {item.to === "/review" && dueCount != null && dueCount > 0 && (
        <span className="press inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary/15 px-1.5 text-[10px] font-bold tabular-nums text-primary ring-1 ring-inset ring-primary/30">
          {dueCount > 99 ? "99+" : dueCount}
        </span>
      )}
      {active && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, updateSettings } = useKnowly();
  const palette = useCommandPalette();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.searchStr });
  const collapsed = state.settings.sidebarCollapsed;
  const courseMatch = pathname.match(/^\/courses\/([^/]+)/);
  const activeCourse = courseMatch
    ? state.courses.find((course) => course.id === courseMatch[1])
    : undefined;
  const courseMode = Boolean(activeCourse);
  /** Sections stay open by default; a click on the heading tucks it away. */
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const toggleGroup = (label: string) =>
    setClosedGroups((current) =>
      current.includes(label) ? current.filter((name) => name !== label) : [...current, label],
    );
  const { level, pct, intoLevel, needed } = levelFromXp(state.progress.lifetimeXp);
  const dueCount = useMemo(() => collectDue(state.decks).length, [state.decks]);
  const density = state.settings.density;
  const pad = density === "compact" ? "p-4" : density === "spacious" ? "p-5 md:p-8" : "p-5 md:p-8";
  const wallpaper = useWallpaperUrl(state.settings.wallpaper);

  return (
    <div className="workspace relative flex min-h-screen w-full bg-background">
      {wallpaper && (
        <>
          <div
            aria-hidden
            className="anim-fade-in pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${wallpaper})`,
              opacity: state.settings.wallpaperOpacity,
              filter: `blur(${state.settings.wallpaperBlur}px)`,
            }}
          />
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-background/55" />
        </>
      )}
      {/* Ambient studio backdrop: slow aurora washes and a drifting accent orb
          over a counter-drifting blueprint grid, anchored by a glowing hairline.
          Sits beneath the content (z-0), is suppressed when a user wallpaper is
          set, gets static-ified by .reduce-motion and hidden in print. */}
      <div aria-hidden className="print-hide pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {!wallpaper && (
          <>
            <div className="anim-aurora app-aurora absolute -inset-[12%] opacity-60 blur-3xl" />
            <div className="anim-aurora app-aurora absolute -inset-[12%] opacity-35 blur-3xl [animation-delay:-9s] [transform:rotate(120deg)]" />
            <div className="anim-float absolute -bottom-44 -left-36 size-[36rem] rounded-full bg-[color-mix(in_oklab,var(--primary)_26%,transparent)] blur-3xl opacity-45" />
            <div className="anim-float absolute -right-40 -top-44 size-[30rem] rounded-full bg-[color-mix(in_oklab,var(--primary-glow)_20%,transparent)] blur-3xl opacity-35 [animation-delay:-2s]" />
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--primary),transparent)] opacity-50" />
          </>
        )}
        <div className="anim-grid-drift grid-forge absolute inset-0 opacity-[0.09] [mask-image:radial-gradient(ellipse_70%_65%_at_50%_30%,black,transparent_78%)]" />
        <div className="anim-grid-drift-rev grid-forge absolute inset-0 opacity-[0.08] [background-size:88px_88px] [mask-image:radial-gradient(ellipse_60%_55%_at_80%_72%,black,transparent_80%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_45%,transparent_72%,var(--background)_100%)] opacity-65" />
      </div>
      <aside
        className={cn(
          "sticky top-0 z-10 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/90 backdrop-blur-2xl transition-all duration-300 md:flex",
          courseMode ? "w-[304px]" : collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,var(--primary),transparent_45%)] opacity-[0.14]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent"
        />
        {activeCourse ? (
          <CourseSidebar course={activeCourse} pathname={pathname} search={search} />
        ) : (
          <>
            <div
              className={cn(
                "relative flex items-center gap-3 px-5 py-5",
                collapsed && "justify-center px-3",
              )}
            >
              <span className="anim-pop grid size-11 shrink-0 place-items-center rounded-[1.1rem] border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent shadow-[0_16px_34px_-18px_var(--primary)] ring-1 ring-primary/25">
                <Logo className="size-7 rounded-lg" />
              </span>
              {!collapsed && (
                <div className="anim-fade-in min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-base font-bold leading-none tracking-tight">
                      Knowly
                    </p>
                    <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
                  </div>
                  <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                    {state.settings.avatarEmoji} {state.settings.displayName}
                  </p>
                </div>
              )}
            </div>

            <nav className="relative flex-1 overflow-y-auto px-3 pb-2">
              {collapsed ? (
                NAV_GROUPS.map((group) => (
                  <div key={group.label} className="mt-4 first:mt-1">
                    <div aria-hidden className="mx-3 mb-2 border-t border-sidebar-border" />
                    {group.items.map((item) => {
                      const active = isNavItemActive(item, pathname);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          title={item.hint ? `${item.label} — ${item.hint}` : item.label}
                          className={cn(navLinkClass(active), "justify-center px-2")}
                        >
                          <span className={navIconClass(active)}>
                            <item.icon className="size-4" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))
              ) : (
                <>
                  {NAV_GROUPS.map((group) => {
                    const closed = closedGroups.includes(group.label);
                    const hasActive = group.items.some((item) => isNavItemActive(item, pathname));
                    const panelId = `sidebar-section-${group.label.replace(/[^a-z]/gi, "-").toLowerCase()}`;
                    return (
                      <section
                        key={group.label}
                        className="mt-4 first:mt-1"
                        aria-label={group.label}
                      >
                        {group.label !== "Home" && (
                          <div aria-hidden className="mx-3 mb-2 border-t border-sidebar-border" />
                        )}
                        <button
                          type="button"
                          aria-expanded={!closed}
                          aria-controls={panelId}
                          title={group.hint ? `${group.label} — ${group.hint}` : group.label}
                          onClick={() => toggleGroup(group.label)}
                          className="press group/head mb-1 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-left"
                        >
                          <span
                            className={cn(
                              "flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                              hasActive ? "text-primary" : "text-muted-foreground/60",
                            )}
                          >
                            {group.label}
                          </span>
                          {hasActive && !closed && (
                            <span
                              aria-hidden
                              className="size-1.5 shrink-0 rounded-full bg-primary"
                            />
                          )}
                          <ChevronDown
                            className={cn(
                              "size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover/head:text-muted-foreground",
                              closed && "-rotate-90",
                            )}
                          />
                        </button>
                        {!closed && (
                          <ul id={panelId}>
                            {group.items.map((item) => (
                              <li key={item.to}>
                                <NavRow
                                  item={item}
                                  active={isNavItemActive(item, pathname)}
                                  dueCount={dueCount}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    );
                  })}
                </>
              )}
            </nav>

            <div className="relative space-y-3 border-t border-sidebar-border p-3">
              <div className="rounded-[1.05rem] border border-white/10 bg-gradient-to-br from-primary/10 via-sidebar-accent/60 to-sidebar-accent/20 p-3 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold tracking-tight">Lv {level}</span>
                  {!collapsed && (
                    <span className="text-muted-foreground">
                      {intoLevel}/{needed} XP
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60 ring-1 ring-sidebar-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
                className="press flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-sidebar-border hover:bg-sidebar-accent hover:text-foreground"
              >
                {collapsed ? (
                  <PanelLeft className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
                {!collapsed && "Collapse"}
              </Button>
            </div>
          </>
        )}
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl md:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          />
          <div className="flex items-center gap-2 md:hidden">
            <span className="grid size-8 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/25 to-transparent ring-1 ring-primary/20">
              <Logo className="size-5 rounded-md" />
            </span>
            <span className="font-display font-bold">Knowly</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground backdrop-blur md:flex">
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
            <HardDrive className="size-3.5 text-primary" />
            Saved on this device · export JSON to move it
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => palette.setOpen(true)}
              aria-label="Open command palette"
              className="press inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Jump to…</span>
              <kbd className="hidden rounded-md border border-white/10 bg-background/40 px-1.5 py-0.5 text-[10px] sm:inline">
                Ctrl K
              </kbd>
            </button>
            <span className="press inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:border-primary/50">
              <Flame className="size-3.5 text-primary" />
              {state.progress.streak} day
            </span>
            <span className="press hidden min-[480px]:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:border-primary/50">
              <Zap className="size-3.5 text-primary" />
              <span className="max-w-[20vw] truncate">
                {state.progress.lifetimeXp.toLocaleString()} XP
              </span>
            </span>
          </div>
        </header>

        {activeCourse ? (
          <CourseMobileBar course={activeCourse} pathname={pathname} search={search} />
        ) : (
          <nav
            aria-label="Main navigation"
            className="flex gap-1.5 overflow-x-auto border-b border-border bg-surface/30 px-3 py-2 backdrop-blur md:hidden"
          >
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.label} className="flex items-center gap-1.5">
                {groupIndex > 0 && (
                  <span aria-hidden className="h-5 w-px shrink-0 bg-sidebar-border" />
                )}
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.hint ? `${item.label} — ${item.hint}` : item.label}
                    className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors"
                    activeProps={{
                      className:
                        "border-primary/30 bg-primary/12 text-foreground shadow-[0_8px_24px_-18px_var(--primary)]",
                    }}
                    activeOptions={{ exact: item.to === "/dashboard" }}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                    {item.to === "/review" && dueCount > 0 && (
                      <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-primary/15 px-1 text-[9px] font-bold tabular-nums text-primary">
                        {dueCount > 99 ? "99+" : dueCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        )}

        <main key={pathname} className={cn("anim-fade-up flex-1", pad)}>
          {children}
        </main>
      </div>

      <CommandPalette
        open={palette.open}
        onOpenChange={palette.setOpen}
        targets={NAV.map((item) => ({ to: item.to, label: item.label }))}
      />
    </div>
  );
}

function CourseSidebar({
  course,
  pathname,
  search,
}: {
  course: Course;
  pathname: string;
  search: string;
}) {
  const { state } = useKnowly();
  const progress = state.courseProgress[course.id];
  const stats = courseStats(course, progress);
  const next = nextLesson(course, progress);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-sidebar-border p-4">
        <Link
          to="/courses"
          className="press inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Course library
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl shadow-sm ring-1 ring-black/5"
            style={{ background: `${course.color}24` }}
          >
            {course.emoji || "📘"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {course.subject}
            </p>
            <h1 className="mt-0.5 line-clamp-2 font-display text-base font-semibold leading-snug">
              {course.title}
            </h1>
          </div>
          <Link
            to="/courses/$courseId/edit"
            params={{ courseId: course.id }}
            aria-label="Edit course"
            className="press grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-medium text-muted-foreground">{stats.percent}% complete</span>
            <span className="text-muted-foreground">
              {stats.completedLessons}/{stats.lessons} lessons
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sidebar-accent">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.percent}%`, background: course.color }}
            />
          </div>
        </div>
      </div>

      <CourseOutline course={course} pathname={pathname} search={search} />

      <div className="shrink-0 space-y-1.5 border-t border-sidebar-border p-3">
        <Button asChild className="w-full justify-start rounded-xl" size="sm">
          <Link
            to={next ? "/courses/$courseId/lessons/$lessonId" : "/courses/$courseId"}
            params={
              next ? { courseId: course.id, lessonId: next.lesson.id } : { courseId: course.id }
            }
          >
            <Play className="size-3.5" />
            {next ? "Continue learning" : "Review course"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full justify-start rounded-xl">
          <Link to="/courses/$courseId/print" params={{ courseId: course.id }}>
            <Printer className="size-3.5" /> Print course
          </Link>
        </Button>
        <Link
          to="/courses"
          className="press flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Exit to course library
        </Link>
      </div>
    </div>
  );
}

function CourseOutline({
  course,
  pathname,
  search,
}: {
  course: Course;
  pathname: string;
  search: string;
}) {
  const { state } = useKnowly();
  const progress = state.courseProgress[course.id];
  const activeLessonId = pathname.match(/\/lessons\/([^/]+)/)?.[1];
  const activeAssessment = new URLSearchParams(search).get("assessment") ?? undefined;
  const overviewActive =
    pathname === `/courses/${course.id}` || pathname === `/courses/${course.id}/`;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const activeModule = course.modules.find(
      (module) =>
        module.lessons.some((lesson) => lesson.id === activeLessonId) ||
        (module.quiz && module.quiz.id === activeAssessment),
    );
    if (!activeModule) return;
    setExpanded((current) =>
      current[activeModule.id] === false ? { ...current, [activeModule.id]: true } : current,
    );
  }, [activeLessonId, activeAssessment, course.id, course.modules]);

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Course contents">
      <Link
        to="/courses/$courseId"
        params={{ courseId: course.id }}
        aria-current={overviewActive ? "page" : undefined}
        className={cn(
          "press flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
          overviewActive
            ? "bg-primary/10 text-foreground ring-1 ring-inset ring-primary/20"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
        )}
      >
        <span className="grid size-6 place-items-center rounded-md bg-background/60 ring-1 ring-sidebar-border">
          <BookOpenCheck className="size-3.5" />
        </span>
        Course home
      </Link>

      <div className="mb-2 mt-5 flex items-center justify-between px-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Curriculum
        </p>
        <span className="text-[9px] tabular-nums text-muted-foreground/60">
          {course.modules.length} modules
        </span>
      </div>

      <div className="space-y-1">
        {course.modules.map((module, moduleIndex) => {
          const completed = module.lessons.filter(
            (lesson) => lessonProgress(progress, lesson.id).status === "completed",
          ).length;
          const moduleActive =
            module.lessons.some((lesson) => lesson.id === activeLessonId) ||
            Boolean(module.quiz && module.quiz.id === activeAssessment);
          const open = expanded[module.id] ?? (moduleIndex === 0 || moduleActive);
          const panelId = `course-module-${module.id}`;

          return (
            <div
              key={module.id}
              className={cn(
                "rounded-xl transition-colors",
                moduleActive && "bg-sidebar-accent/45 ring-1 ring-inset ring-sidebar-border",
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded((current) => ({ ...current, [module.id]: !open }))}
                aria-expanded={open}
                aria-controls={panelId}
                className="press flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-sidebar-accent/60"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-lg text-[10px] font-semibold ring-1",
                    moduleActive
                      ? "bg-primary/15 text-primary ring-primary/20"
                      : "bg-background/55 text-muted-foreground ring-sidebar-border",
                  )}
                >
                  {moduleIndex + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold leading-5">
                    {module.title}
                  </span>
                  <span className="block text-[9px] text-muted-foreground">
                    {completed}/{module.lessons.length} lessons
                    {module.quiz ? " · quiz" : ""}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open && (
                <div
                  id={panelId}
                  className="relative ml-4 border-l border-sidebar-border/80 pb-2 pl-2.5 pr-1"
                >
                  {module.lessons.map((lesson) => {
                    const complete = lessonProgress(progress, lesson.id).status === "completed";
                    const active = lesson.id === activeLessonId;
                    return (
                      <Link
                        key={lesson.id}
                        to="/courses/$courseId/lessons/$lessonId"
                        params={{ courseId: course.id, lessonId: lesson.id }}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "press group/lesson relative -ml-3 flex items-center gap-2 rounded-lg py-1.5 pl-3 pr-1.5 text-xs transition-colors",
                          active
                            ? "bg-primary/10 font-semibold text-foreground"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {complete ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                        ) : (
                          <Circle
                            className={cn(
                              "size-3.5 shrink-0",
                              active ? "text-primary" : "text-muted-foreground/45",
                            )}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                        {lesson.estimatedMinutes ? (
                          <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/60">
                            {lesson.estimatedMinutes}m
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}

                  {module.quiz && module.quiz.questions.length > 0 && (
                    <Link
                      to="/courses/$courseId/quiz"
                      params={{ courseId: course.id }}
                      search={{ assessment: module.quiz.id }}
                      aria-current={activeAssessment === module.quiz.id ? "page" : undefined}
                      className={cn(
                        "press relative -ml-3 flex items-center gap-2 rounded-lg py-1.5 pl-3 pr-1.5 text-xs transition-colors",
                        activeAssessment === module.quiz.id
                          ? "bg-primary/10 font-semibold text-foreground"
                          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <FileQuestion className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{module.quiz.title}</span>
                      <span className="shrink-0 text-[9px] text-muted-foreground/60">
                        {module.quiz.questions.length}q
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {course.finalExam && course.finalExam.questions.length > 0 && (
        <Link
          to="/courses/$courseId/quiz"
          params={{ courseId: course.id }}
          search={{ assessment: course.finalExam.id }}
          aria-current={activeAssessment === course.finalExam.id ? "page" : undefined}
          className={cn(
            "press mt-4 flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-xs font-medium transition-colors",
            activeAssessment === course.finalExam.id
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-sidebar-border bg-background/40 text-sidebar-foreground/75 hover:border-primary/25 hover:bg-sidebar-accent/60",
          )}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <GraduationCap className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate">{course.finalExam.title}</span>
          <span className="shrink-0 text-[9px] text-muted-foreground">
            {course.finalExam.questions.length}q
          </span>
        </Link>
      )}
    </nav>
  );
}

function CourseMobileBar({
  course,
  pathname,
  search,
}: {
  course: Course;
  pathname: string;
  search: string;
}) {
  const { state } = useKnowly();
  const [open, setOpen] = useState(false);
  const stats = courseStats(course, state.courseProgress[course.id]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);

  return (
    <div className="print-hide border-b border-border bg-sidebar/95 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="press flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
          style={{ background: `${course.color}24` }}
        >
          {course.emoji || "📘"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{course.title}</span>
          <span className="block text-[10px] text-muted-foreground">
            {stats.percent}% complete · {stats.completedLessons}/{stats.lessons} lessons
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
          Contents
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="max-h-[62dvh] overflow-y-auto border-t border-border bg-sidebar p-2">
          <CourseOutline course={course} pathname={pathname} search={search} />
          <div className="mt-2 border-t border-sidebar-border p-2">
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <Link to="/courses/$courseId/print" params={{ courseId: course.id }}>
                <Printer className="size-3.5" /> Print course
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="anim-fade-up mb-8 flex flex-wrap items-end gap-4 border-b border-border pb-7">
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="break-words font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  );
}

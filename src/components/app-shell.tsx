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
import { courseStats, lessonProgress, nextLesson } from "@/lib/courses";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallpaperUrl } from "@/hooks/use-wallpaper-url";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Library",
    icon: LibraryBig,
    items: [
      { to: "/decks", label: "Deck Library", icon: Library, exact: false },
      { to: "/generate", label: "Prompt Forge", icon: Wand2, exact: false },
      { to: "/forge", label: "Deck Forge", icon: Hammer, exact: false },
      { to: "/import", label: "Import JSON", icon: Download, exact: false },
      { to: "/format", label: "JSON Format", icon: FileJson, exact: false },
      { to: "/deck-tools", label: "Merge & Split", icon: Shuffle, exact: false },
    ],
  },
  {
    label: "Courses",
    icon: BookMarked,
    items: [
      { to: "/courses", label: "Course Library", icon: BookMarked, exact: false },
      { to: "/courses/forge", label: "Course Forge", icon: Wand2, exact: false },
      { to: "/courses/import", label: "Import Course", icon: FileJson, exact: false },
    ],
  },
  {
    label: "Notes",
    icon: NotebookText,
    items: [
      { to: "/notes", label: "Notebooks", icon: NotebookText, exact: false },
      { to: "/journal", label: "Study Journal", icon: NotebookPen, exact: false },
    ],
  },
  {
    label: "Study",
    icon: BookOpen,
    items: [
      { to: "/review", label: "Daily Review", icon: Brain, exact: false },
      { to: "/cram", label: "Cram Mode", icon: Rocket, exact: false },
      { to: "/exam", label: "Exam Simulator", icon: GraduationCap, exact: false },
      { to: "/quiz", label: "Practice Quiz", icon: BrainCircuit, exact: false },
      { to: "/print", label: "Print Exam", icon: Printer, exact: false },
      { to: "/focus", label: "Focus Timer", icon: Timer, exact: false },
    ],
  },
  {
    label: "Improve",
    icon: Compass,
    items: [
      { to: "/weak-spots", label: "Weak Spots", icon: Target, exact: false },
      { to: "/leeches", label: "Leech Manager", icon: Bug, exact: false },
      { to: "/cards", label: "Card Browser", icon: Table2, exact: false },
      { to: "/tags", label: "Tag Explorer", icon: Hash, exact: false },
      { to: "/bookmarks", label: "Bookmarks & Notes", icon: Star, exact: false },
    ],
  },
  {
    label: "Progress",
    icon: Activity,
    items: [
      { to: "/stats", label: "Statistics", icon: BarChart3, exact: false },
      { to: "/goals", label: "Goals & Streaks", icon: CalendarCheck, exact: false },
      { to: "/achievements", label: "Achievements", icon: Trophy, exact: false },
      { to: "/report", label: "Progress Report", icon: FileBarChart, exact: false },
    ],
  },
  {
    label: "System",
    icon: SlidersHorizontal,
    items: [
      { to: "/snapshots", label: "Snapshots", icon: Camera, exact: false },
      { to: "/shortcuts", label: "Shortcuts & Help", icon: Keyboard, exact: false },
      { to: "/settings", label: "Settings", icon: SettingsIcon, exact: false },
    ],
  },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const OVERVIEW_GROUP = NAV_GROUPS[0];
const SUBMENU_GROUPS = NAV_GROUPS.filter((group) => group !== OVERVIEW_GROUP);

const isNavItemActive = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.to : pathname.startsWith(item.to);

const groupForPath = (pathname: string) =>
  NAV_GROUPS.find((group) => group.items.some((item) => isNavItemActive(item, pathname)));

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

export function AppShell({ children }: { children: ReactNode }) {
  const { state, updateSettings } = useKnowly();
  const palette = useCommandPalette();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.searchStr });
  const collapsed = state.settings.sidebarCollapsed;
  const activeGroup = groupForPath(pathname);
  const courseMatch = pathname.match(/^\/courses\/([^/]+)/);
  const activeCourse = courseMatch
    ? state.courses.find((course) => course.id === courseMatch[1])
    : undefined;
  const courseMode = Boolean(activeCourse);
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    activeGroup && activeGroup !== OVERVIEW_GROUP ? activeGroup.label : null,
  );

  useEffect(() => {
    setOpenGroup(activeGroup && activeGroup !== OVERVIEW_GROUP ? activeGroup.label : null);
  }, [activeGroup]);
  const { level, pct, intoLevel, needed } = levelFromXp(state.progress.lifetimeXp);
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
                          title={item.label}
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
                  {OVERVIEW_GROUP.items.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        title={item.label}
                        className={navLinkClass(active)}
                      >
                        <span className={navIconClass(active)}>
                          <item.icon className="size-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                  {SUBMENU_GROUPS.map((group) => {
                    const isOpen = openGroup === group.label;
                    const hasActive = group.items.some((item) => isNavItemActive(item, pathname));
                    const panelId = `sidebar-submenu-${group.label.toLowerCase()}`;
                    return (
                      <div
                        key={group.label}
                        className={cn(
                          "mt-1.5 rounded-[1.15rem] transition-all duration-300",
                          isOpen &&
                            "bg-white/[0.035] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10",
                        )}
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          title={`${group.label} submenu`}
                          onClick={() => setOpenGroup(isOpen ? null : group.label)}
                          className={cn(
                            "press group flex w-full items-center gap-2.5 rounded-[1.1rem] px-2.5 py-2 text-sm transition-all duration-200",
                            isOpen
                              ? "text-sidebar-accent-foreground"
                              : hasActive
                                ? "text-sidebar-accent-foreground hover:bg-sidebar-accent/40"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <span className={navIconClass(isOpen || hasActive)}>
                            <group.icon className="size-4" />
                          </span>
                          <span className="flex-1 truncate text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            {group.label}
                          </span>
                          {hasActive && !isOpen && (
                            <span
                              aria-hidden
                              className="size-1.5 shrink-0 rounded-full bg-primary"
                            />
                          )}
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>
                        <div
                          className={cn(
                            "grid transition-[grid-template-rows] duration-300 ease-out",
                            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                          )}
                        >
                          <div className="overflow-hidden" inert={!isOpen}>
                            <ul
                              id={panelId}
                              className="mx-2 mb-2 divide-y divide-sidebar-border/60 overflow-hidden rounded-[0.9rem] border border-white/10 bg-background/50 backdrop-blur-sm"
                            >
                              {group.items.map((item) => {
                                const active = isNavItemActive(item, pathname);
                                return (
                                  <li key={item.to}>
                                    <Link
                                      to={item.to}
                                      title={item.label}
                                      aria-current={active ? "page" : undefined}
                                      tabIndex={isOpen ? undefined : -1}
                                      className={cn(
                                        "press group/row flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                                        active
                                          ? "bg-primary/10 text-foreground shadow-[inset_2px_0_0_var(--primary)]"
                                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "grid size-6 shrink-0 place-items-center rounded-md ring-1 transition-all duration-200 group-hover/row:scale-105",
                                          active
                                            ? "bg-primary/15 text-primary ring-primary/30"
                                            : "bg-background/40 text-muted-foreground ring-sidebar-border group-hover/row:text-primary",
                                        )}
                                      >
                                        <item.icon className="size-3.5" />
                                      </span>
                                      <span className="flex-1 truncate">{item.label}</span>
                                      <ChevronRight
                                        className={cn(
                                          "size-3.5 shrink-0 transition-all duration-150",
                                          active
                                            ? "text-primary"
                                            : "text-muted-foreground/30 group-hover/row:translate-x-px group-hover/row:text-muted-foreground",
                                        )}
                                      />
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </div>
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
          <nav className="flex gap-1.5 overflow-x-auto border-b border-border bg-surface/30 px-3 py-2 backdrop-blur md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors"
                activeProps={{
                  className:
                    "border-primary/30 bg-primary/12 text-foreground shadow-[0_8px_24px_-18px_var(--primary)]",
                }}
                activeOptions={{ exact: item.to === "/dashboard" }}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
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
    <div className="border-b border-border bg-sidebar/95 md:hidden">
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

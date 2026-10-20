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
} from "lucide-react";
import { useKnowly } from "@/store/knowly";
import { levelFromXp } from "@/lib/gamification";
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
    "press group relative mb-1 flex items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
    active
      ? "bg-primary/10 text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--primary)] ring-1 ring-inset ring-primary/25"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
  );

const navIconClass = (active: boolean) =>
  cn(
    "grid size-7 shrink-0 place-items-center rounded-lg ring-1 transition-all duration-200 group-hover:scale-105",
    active
      ? "bg-primary/15 text-primary ring-primary/30"
      : "bg-background/40 text-muted-foreground ring-sidebar-border group-hover:text-primary",
  );

export function AppShell({ children }: { children: ReactNode }) {
  const { state, updateSettings } = useKnowly();
  const palette = useCommandPalette();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const collapsed = state.settings.sidebarCollapsed;
  const activeGroup = groupForPath(pathname);
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
          "sticky top-0 z-10 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur transition-all duration-300 md:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div
          className={cn("flex items-center gap-3 px-5 py-6", collapsed && "justify-center px-3")}
        >
          <span className="anim-pop grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent shadow-[0_10px_24px_-12px_var(--primary)] ring-1 ring-primary/30">
            <Logo className="size-7 rounded-md" />
          </span>
          {!collapsed && (
            <div className="anim-fade-in min-w-0">
              <p className="font-display text-base font-bold leading-none tracking-tight">Knowly</p>
              <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-sidebar-accent/70 px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-sidebar-border">
                {state.settings.avatarEmoji} {state.settings.displayName}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2">
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
                      "mt-1.5 rounded-2xl transition-colors duration-300",
                      isOpen && "bg-background/40 ring-1 ring-sidebar-border",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      title={`${group.label} submenu`}
                      onClick={() => setOpenGroup(isOpen ? null : group.label)}
                      className={cn(
                        "press group flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-sm transition-all duration-200",
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
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
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
                          className="mx-2 mb-2 divide-y divide-sidebar-border/60 overflow-hidden rounded-xl border border-sidebar-border/70 bg-background/50"
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
                                      ? "bg-primary/10 text-foreground"
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

        <div className="space-y-3 border-t border-sidebar-border p-3">
          <div className="rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent/80 to-sidebar-accent/30 p-3 shadow-sm">
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
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Logo className="anim-float size-6" />
            <span className="font-display font-bold">Knowly</span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-success" />
            Saved in this browser · export JSON to move it
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => palette.setOpen(true)}
              aria-label="Open command palette"
              className="press inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Jump to…</span>
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">
                Ctrl K
              </kbd>
            </button>
            <span className="press inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50">
              <Flame className="size-3.5 text-primary" />
              {state.progress.streak} day
            </span>
            <span className="press hidden min-[480px]:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50">
              <Zap className="size-3.5 text-primary" />
              <span className="max-w-[20vw] truncate">
                {state.progress.lifetimeXp.toLocaleString()} XP
              </span>
            </span>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface/40 px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="press shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "bg-secondary text-foreground" }}
              activeOptions={{ exact: item.to === "/dashboard" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

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

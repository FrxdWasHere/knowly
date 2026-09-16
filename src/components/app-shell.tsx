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
  Table2,
  Timer,
  Star,
  Hammer,
  Target,
} from "lucide-react";
import { useKnowly } from "@/store/knowly";
import { levelFromXp } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallpaperUrl } from "@/hooks/use-wallpaper-url";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/decks", label: "Deck Library", icon: Library, exact: false },
  { to: "/generate", label: "Prompt Forge", icon: Wand2, exact: false },
  { to: "/forge", label: "Deck Forge", icon: Hammer, exact: false },
  { to: "/import", label: "Import JSON", icon: Download, exact: false },
  { to: "/format", label: "JSON Format", icon: FileJson, exact: false },
  { to: "/review", label: "Daily Review", icon: Brain, exact: false },
  { to: "/cram", label: "Cram Mode", icon: Rocket, exact: false },
  { to: "/weak-spots", label: "Weak Spots", icon: Target, exact: false },
  { to: "/goals", label: "Goals & Streaks", icon: CalendarCheck, exact: false },
  { to: "/exam", label: "Exam Simulator", icon: GraduationCap, exact: false },
  { to: "/cards", label: "Card Browser", icon: Table2, exact: false },
  { to: "/bookmarks", label: "Bookmarks & Notes", icon: Star, exact: false },
  { to: "/focus", label: "Focus Timer", icon: Timer, exact: false },
  { to: "/quiz", label: "Practice Quiz", icon: BrainCircuit, exact: false },
  { to: "/print", label: "Print Exam", icon: Printer, exact: false },
  { to: "/stats", label: "Statistics", icon: BarChart3, exact: false },
  { to: "/achievements", label: "Achievements", icon: Trophy, exact: false },
  { to: "/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { state, updateSettings } = useKnowly();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const collapsed = state.settings.sidebarCollapsed;
  const { level, pct, intoLevel, needed } = levelFromXp(state.progress.lifetimeXp);
  const density = state.settings.density;
  const pad = density === "compact" ? "p-4" : density === "spacious" ? "p-5 md:p-10 lg:p-12" : "p-6 md:p-8";
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
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 bg-background/55"
          />
        </>
      )}
      <aside
        className={cn(
          "sticky top-0 z-10 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur transition-all duration-300 md:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <Logo className="anim-pop size-9 transition-transform duration-300 hover:scale-110 hover:rotate-6" />
          {!collapsed && (
            <div className="anim-fade-in min-w-0">
              <p className="font-display text-base font-bold leading-none">Knowly</p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {state.settings.avatarEmoji} {state.settings.displayName}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={cn(
                  "press group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--primary)]",
                )}
              >
                <item.icon
                  className={cn(
                    "size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active && "text-primary",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Lv {level}</span>
              {!collapsed && (
                <span className="text-muted-foreground">
                  {intoLevel}/{needed} XP
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
            className="press flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
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
            <span className="press inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50">
              <Flame className="size-3.5 text-primary" />
              {state.progress.streak} day
            </span>
            <span className="press inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50">
              <Zap className="size-3.5 text-primary" />
              {state.progress.lifetimeXp.toLocaleString()} XP
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
    <div className="anim-fade-up mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-7">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import {
  BarChart2, ChevronDown, ChevronLeft, ChevronRight, GanttChart, Users2,
} from "lucide-react";

export const Route = createFileRoute("/operations/planner/")({
  head: () => ({ meta: [{ title: "Planner · BearingPro" }] }),
  component: PlannerPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type PhaseStatus = "not_started" | "in_progress" | "completed";
type TabId = "gantt" | "resource" | "capacity";
type GanttProjectStatus = "in-progress" | "scheduled" | "completed";

interface Phase {
  id: string;
  name: string;
  start: string;
  end: string;
  status: PhaseStatus;
  pct: number;
}

interface GanttProject {
  id: string;
  name: string;
  customer: string;
  projectStatus: GanttProjectStatus;
  start: string;
  end: string;
  phases: Phase[];
  teamIds: string[];
}

interface PlannerMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  availability: "full_time" | "part_time";
}

// ─── Phase / status meta ──────────────────────────────────────────────────────

const PHASE_META: Record<PhaseStatus, { bar: string; label: string; text: string }> = {
  completed:   { bar: "bg-green-500",                             label: "Completed",   text: "text-white" },
  in_progress: { bar: "bg-blue-500",                              label: "In Progress", text: "text-white" },
  not_started: { bar: "bg-slate-300 dark:bg-slate-600",          label: "Not Started", text: "text-slate-700 dark:text-slate-200" },
};

const PROJECT_STATUS_META: Record<GanttProjectStatus, { cls: string; label: string }> = {
  "in-progress": { cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", label: "In Progress" },
  "scheduled":   { cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400", label: "Scheduled"  },
  "completed":   { cls: "bg-green-500/15 text-green-600 dark:text-green-400",   label: "Completed"  },
};

const RESOURCE_BAR_CLS: Record<GanttProjectStatus, string> = {
  "in-progress": "bg-primary/15 border border-primary/25",
  "scheduled":   "bg-violet-500/15 border border-violet-500/25",
  "completed":   "bg-green-500/15 border border-green-500/25",
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const MEMBERS: PlannerMember[] = [
  { id: "tm1", name: "Justin Shader", initials: "JS", role: "Admin",      availability: "full_time" },
  { id: "tm2", name: "Marcus Okafor", initials: "MO", role: "Lead Tech",  availability: "full_time" },
  { id: "tm3", name: "Rachel Torres", initials: "RT", role: "Lead Tech",  availability: "full_time" },
  { id: "tm4", name: "Devon Parks",   initials: "DP", role: "Field Tech", availability: "full_time" },
  { id: "tm5", name: "Sierra Nash",   initials: "SN", role: "Field Tech", availability: "part_time" },
];

const GANTT_PROJECTS: GanttProject[] = [
  {
    id: "pr1", name: "Penthouse Cinema Build",
    customer: "Northbeam Architects", projectStatus: "in-progress",
    start: "2026-05-01", end: "2026-07-09",
    teamIds: ["tm1", "tm2", "tm4"],
    phases: [
      { id: "p1a", name: "Engineering",  start: "2026-05-01", end: "2026-05-15", status: "completed",   pct: 100 },
      { id: "p1b", name: "Procurement",  start: "2026-05-10", end: "2026-05-28", status: "completed",   pct: 100 },
      { id: "p1c", name: "Installation", start: "2026-05-25", end: "2026-06-20", status: "in_progress", pct: 70  },
      { id: "p1d", name: "Programming",  start: "2026-06-15", end: "2026-07-02", status: "in_progress", pct: 20  },
      { id: "p1e", name: "Closeout",     start: "2026-06-30", end: "2026-07-09", status: "not_started", pct: 0   },
    ],
  },
  {
    id: "pr2", name: "Surgical Center A/V Overhaul",
    customer: "Helio Health Systems", projectStatus: "in-progress",
    start: "2026-04-15", end: "2026-08-21",
    teamIds: ["tm1", "tm3"],
    phases: [
      { id: "p2a", name: "Engineering",           start: "2026-04-15", end: "2026-04-30", status: "completed",   pct: 100 },
      { id: "p2b", name: "Procurement",           start: "2026-04-22", end: "2026-05-20", status: "completed",   pct: 100 },
      { id: "p2c", name: "Cable / Infrastructure",start: "2026-05-01", end: "2026-06-15", status: "in_progress", pct: 60  },
      { id: "p2d", name: "Equipment Install",     start: "2026-06-10", end: "2026-07-25", status: "in_progress", pct: 15  },
      { id: "p2e", name: "Programming",           start: "2026-07-20", end: "2026-08-10", status: "not_started", pct: 0   },
      { id: "p2f", name: "Closeout",              start: "2026-08-08", end: "2026-08-21", status: "not_started", pct: 0   },
    ],
  },
  {
    id: "pr3", name: "Smart Home — Quay Residence",
    customer: "Quay Residential", projectStatus: "in-progress",
    start: "2026-03-20", end: "2026-06-19",
    teamIds: ["tm5"],
    phases: [
      { id: "p3a", name: "Design",        start: "2026-03-20", end: "2026-04-05", status: "completed",   pct: 100 },
      { id: "p3b", name: "Rough-In",      start: "2026-04-01", end: "2026-04-30", status: "completed",   pct: 100 },
      { id: "p3c", name: "Device Install",start: "2026-04-25", end: "2026-06-01", status: "completed",   pct: 100 },
      { id: "p3d", name: "Programming",   start: "2026-06-01", end: "2026-06-15", status: "in_progress", pct: 80  },
      { id: "p3e", name: "Closeout",      start: "2026-06-14", end: "2026-06-19", status: "in_progress", pct: 40  },
    ],
  },
  {
    id: "pr4", name: "Sound Stage 3 Control Room",
    customer: "Arden & Loom Studios", projectStatus: "scheduled",
    start: "2026-06-15", end: "2026-10-02",
    teamIds: ["tm2"],
    phases: [
      { id: "p4a", name: "Engineering",      start: "2026-05-20", end: "2026-06-14", status: "completed",   pct: 100 },
      { id: "p4b", name: "Procurement",      start: "2026-06-01", end: "2026-06-30", status: "in_progress", pct: 40  },
      { id: "p4c", name: "Infrastructure",   start: "2026-06-15", end: "2026-07-20", status: "not_started", pct: 0   },
      { id: "p4d", name: "Equipment Install",start: "2026-07-15", end: "2026-09-01", status: "not_started", pct: 0   },
      { id: "p4e", name: "Programming",      start: "2026-08-25", end: "2026-09-25", status: "not_started", pct: 0   },
      { id: "p4f", name: "Closeout",         start: "2026-09-22", end: "2026-10-02", status: "not_started", pct: 0   },
    ],
  },
  {
    id: "pr6", name: "Auditorium AV — Halcyon HS",
    customer: "Halcyon Public Schools", projectStatus: "in-progress",
    start: "2026-02-28", end: "2026-08-04",
    teamIds: ["tm2"],
    phases: [
      { id: "p6a", name: "Engineering",   start: "2026-02-28", end: "2026-03-15", status: "completed",   pct: 100 },
      { id: "p6b", name: "Procurement",   start: "2026-03-10", end: "2026-04-10", status: "completed",   pct: 100 },
      { id: "p6c", name: "Installation",  start: "2026-04-01", end: "2026-06-20", status: "in_progress", pct: 50  },
      { id: "p6d", name: "AV Integration",start: "2026-06-15", end: "2026-07-20", status: "in_progress", pct: 10  },
      { id: "p6e", name: "Closeout",      start: "2026-07-18", end: "2026-08-04", status: "not_started", pct: 0   },
    ],
  },
];

// Capacity: 5 weeks of June 2026 (week start dates)
const CAPACITY_WEEKS: string[] = [
  "2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29",
];

// Hours scheduled per team member per week (index matches CAPACITY_WEEKS)
const CAPACITY_HOURS: Record<string, number[]> = {
  tm1: [32, 36, 42, 16, 8],   // Justin — overloaded Jun 15 (42 / 40h)
  tm2: [38, 40, 36, 36, 20],
  tm3: [28, 32, 36, 40, 16],
  tm4: [40, 38, 24, 20, 0],
  tm5: [16, 20, 12, 8, 0],    // Sierra — part-time, 20h cap
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fromISO(s: string): Date {
  return new Date(s + "T00:00:00");
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

function sundayStart(d: Date): Date {
  const r = new Date(d.getTime());
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function monthViewStart(d: Date): Date {
  return sundayStart(new Date(d.getFullYear(), d.getMonth(), 1));
}

function fmtShort(iso: string): string {
  return fromISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Compute bar geometry (left%, width%) within a date range. Returns null if fully outside.
function barGeo(
  startISO: string,
  endISO: string,
  rangeStart: Date,
  rangeEnd: Date,
): { left: number; width: number } | null {
  const s = fromISO(startISO);
  const e = fromISO(endISO);
  if (e <= rangeStart || s >= rangeEnd) return null;
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const left = Math.max(0, (s.getTime() - rangeStart.getTime()) / rangeMs) * 100;
  const right = Math.min(100, (e.getTime() - rangeStart.getTime()) / rangeMs) * 100;
  const width = right - left;
  return width > 0 ? { left, width } : null;
}

function todayISO(): string {
  return toISO(new Date());
}

// ─── Member Avatar ─────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = "sm" }: { member: PlannerMember; size?: "sm" | "xs" }) {
  const dim = size === "sm" ? "h-6 w-6 text-2xs" : "h-5 w-5 text-2xs";
  return (
    <div
      title={member.name}
      className={cn(
        "rounded-full border border-background bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0",
        dim,
      )}
    >
      {member.initials}
    </div>
  );
}

// ─── Multi-select member filter dropdown ──────────────────────────────────────

function MemberMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, []);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
          selected.length > 0 && "border-primary/50 text-foreground",
        )}
      >
        Team Member
        {selected.length > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-2xs font-medium text-primary">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-45 rounded-md border border-border bg-background shadow-md py-1">
          {MEMBERS.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent/40"
            >
              <input
                type="checkbox"
                checked={selected.includes(m.id)}
                onChange={() => toggle(m.id)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <MemberAvatar member={m} size="xs" />
              {m.name}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-t border-border px-3 py-1.5 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function GanttLegend() {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/60">
      {(Object.entries(PHASE_META) as [PhaseStatus, typeof PHASE_META[PhaseStatus]][]).map(([status, meta]) => (
        <div key={status} className="flex items-center gap-1.5">
          <div className={cn("h-2.5 w-2.5 rounded-sm", meta.bar)} />
          <span className="text-2xs text-muted-foreground">{meta.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── TAB 1 · GANTT ────────────────────────────────────────────────────────────

const SIDEBAR_W = 200;

function GanttTab() {
  const [scale, setScale] = useState<"week" | "month">("week");
  const [period, setPeriod] = useState<Date>(() => sundayStart(new Date()));

  const today = todayISO();

  const { rangeStart, rangeEnd, headers } = useMemo(() => {
    if (scale === "week") {
      const rs = period;
      const re = addDays(period, 7);
      const hdrs = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(period, i);
        const iso = toISO(d);
        return {
          iso,
          top: d.toLocaleDateString("en-US", { weekday: "short" }),
          sub: `${d.getMonth() + 1}/${d.getDate()}`,
        };
      });
      return { rangeStart: rs, rangeEnd: re, headers: hdrs };
    } else {
      const rs = period;
      const re = addDays(period, 35);
      const hdrs = Array.from({ length: 5 }, (_, i) => {
        const d = addDays(period, i * 7);
        return {
          iso: toISO(d),
          top: "Week of",
          sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      });
      return { rangeStart: rs, rangeEnd: re, headers: hdrs };
    }
  }, [scale, period]);

  const rangeLabel = useMemo(() => {
    if (scale === "week") {
      const end = addDays(rangeStart, 6);
      return `${fmtShort(toISO(rangeStart))} — ${fmtShort(toISO(end))}, ${rangeStart.getFullYear()}`;
    }
    const start = rangeStart;
    const end = addDays(rangeStart, 34);
    const sameMon = start.getMonth() === end.getMonth();
    return sameMon
      ? start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${start.toLocaleDateString("en-US", { month: "short" })} – ${end.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  }, [scale, rangeStart]);

  const todayPct = useMemo(() => {
    const td = fromISO(today);
    if (td < rangeStart || td >= rangeEnd) return null;
    const ms = rangeEnd.getTime() - rangeStart.getTime();
    return ((td.getTime() - rangeStart.getTime()) / ms) * 100;
  }, [today, rangeStart, rangeEnd]);

  const goToday = () => {
    const now = new Date();
    setPeriod(scale === "week" ? sundayStart(now) : monthViewStart(now));
  };

  const navPrev = () => {
    if (scale === "week") {
      setPeriod((p) => addDays(p, -7));
    } else {
      setPeriod((p) => {
        // p is the Sunday before the 1st — use p+7 as a stable anchor inside
        // the displayed month, then step to the 1st of the previous month.
        const anchor = addDays(p, 7);
        return monthViewStart(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
      });
    }
  };

  const navNext = () => {
    if (scale === "week") {
      setPeriod((p) => addDays(p, 7));
    } else {
      setPeriod((p) => {
        const anchor = addDays(p, 7);
        return monthViewStart(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));
      });
    }
  };

  const switchScale = (s: "week" | "month") => {
    setScale(s);
    const now = new Date();
    setPeriod(s === "week" ? sundayStart(now) : monthViewStart(now));
  };

  const colCount = headers.length;

  return (
    <div className="flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={goToday}
          className="h-7 rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent/40 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={navPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface hover:bg-accent/40 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={navNext}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface hover:bg-accent/40 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="flex-1 text-center text-base font-medium">{rangeLabel}</span>
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["week", "month"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => switchScale(s)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                scale === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-accent/40",
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <GanttLegend />

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: SIDEBAR_W + colCount * 130 }}>
          {/* Date header row */}
          <div
            className="flex border-b border-border bg-surface/50"
            style={{ paddingLeft: SIDEBAR_W }}
          >
            {headers.map((h) => (
              <div
                key={h.iso}
                className={cn(
                  "flex-1 border-l border-border px-2 py-1.5 text-center",
                  h.iso === today && "bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "text-2xs uppercase tracking-wide text-muted-foreground",
                    h.iso === today && "text-primary font-semibold",
                  )}
                >
                  {h.top}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold leading-snug",
                    h.iso === today ? "text-primary" : "text-foreground",
                  )}
                >
                  {h.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Project rows */}
          {GANTT_PROJECTS.map((project) => {
            const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
            const sm = PROJECT_STATUS_META[project.projectStatus];

            return (
              <div key={project.id} className="flex border-b border-border hover:bg-accent/10 transition-colors">
                {/* Sidebar */}
                <div
                  className="shrink-0 border-r border-border px-3 py-2"
                  style={{ width: SIDEBAR_W }}
                >
                  <div className="truncate text-sm font-medium leading-snug">
                    {project.name}
                  </div>
                  <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-2xs font-medium", sm.cls)}>
                    {sm.label}
                  </span>
                </div>

                {/* Bar area */}
                <div className="relative flex-1" style={{ height: 48 }}>
                  {/* Column grid lines + today highlight */}
                  {headers.map((h, i) => (
                    <div
                      key={h.iso}
                      className={cn(
                        "absolute inset-y-0 border-l border-border/30",
                        h.iso === today && "bg-primary/3",
                      )}
                      style={{
                        left: `${(i / colCount) * 100}%`,
                        width: `${(1 / colCount) * 100}%`,
                      }}
                    />
                  ))}

                  {/* Today vertical line */}
                  {todayPct !== null && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500/70"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}

                  {/* Bars */}
                  {scale === "week" ? (
                    project.phases.map((phase) => {
                      const s = fromISO(phase.start);
                      const e = fromISO(phase.end);
                      if (e <= rangeStart || s >= rangeEnd) return null;
                      const left =
                        Math.max(0, (s.getTime() - rangeStart.getTime()) / rangeMs) * 100;
                      const right =
                        Math.min(100, (e.getTime() - rangeStart.getTime()) / rangeMs) * 100;
                      const width = right - left;
                      if (width <= 0) return null;
                      const meta = PHASE_META[phase.status];
                      return (
                        <div
                          key={phase.id}
                          className={cn(
                            "absolute z-20 flex items-center overflow-hidden rounded px-1.5",
                            meta.bar,
                          )}
                          style={{ left: `${left}%`, width: `${width}%`, height: 20, top: 14 }}
                          title={`${phase.name}  ·  ${fmtShort(phase.start)} – ${fmtShort(phase.end)}  ·  ${phase.pct}% complete`}
                        >
                          <span
                            className={cn(
                              "truncate select-none text-2xs font-medium",
                              meta.text,
                            )}
                          >
                            {phase.name}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    // Month view: full project bar with phase segments
                    (() => {
                      const geo = barGeo(project.start, project.end, rangeStart, rangeEnd);
                      if (!geo) return null;
                      const ps = fromISO(project.start);
                      const pe = fromISO(project.end);
                      const projMs = pe.getTime() - ps.getTime();
                      return (
                        <div
                          className="absolute z-20 overflow-hidden rounded bg-muted"
                          style={{ left: `${geo.left}%`, width: `${geo.width}%`, height: 20, top: 14 }}
                          title={`${project.name}  ·  ${fmtShort(project.start)} – ${fmtShort(project.end)}`}
                        >
                          {project.phases.map((phase) => {
                            const phS = fromISO(phase.start);
                            const phE = fromISO(phase.end);
                            // Clamp phase within project bounds
                            const phLeft =
                              Math.max(0, (phS.getTime() - ps.getTime()) / projMs) * 100;
                            const phRight =
                              Math.min(100, (phE.getTime() - ps.getTime()) / projMs) * 100;
                            const phWidth = phRight - phLeft;
                            if (phWidth <= 0) return null;
                            return (
                              <div
                                key={phase.id}
                                className={cn("absolute inset-y-0 opacity-80", PHASE_META[phase.status].bar)}
                                style={{ left: `${phLeft}%`, width: `${phWidth}%` }}
                                title={`${phase.name}  ·  ${fmtShort(phase.start)} – ${fmtShort(phase.end)}  ·  ${phase.pct}%`}
                              />
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2 · RESOURCE VIEW ────────────────────────────────────────────────────

const RESOURCE_RANGE_START = "2026-05-01";
const RESOURCE_RANGE_END   = "2026-08-01"; // ~3 months

const RESOURCE_MONTH_MARKS = [
  { label: "May 2026",  iso: "2026-05-01" },
  { label: "Jun 2026",  iso: "2026-06-01" },
  { label: "Jul 2026",  iso: "2026-07-01" },
];

function ResourceTab() {
  const [memberFilter, setMemberFilter] = useState<string[]>([]);

  const rsDate = fromISO(RESOURCE_RANGE_START);
  const reDate = fromISO(RESOURCE_RANGE_END);
  const rangeMs = reDate.getTime() - rsDate.getTime();

  const todayDate = new Date();
  const todayPct =
    todayDate >= rsDate && todayDate < reDate
      ? ((todayDate.getTime() - rsDate.getTime()) / rangeMs) * 100
      : null;

  // Summary: active project count per member
  const memberProjectCount = useMemo(
    () =>
      Object.fromEntries(
        MEMBERS.map((m) => [m.id, GANTT_PROJECTS.filter((p) => p.teamIds.includes(m.id)).length]),
      ),
    [],
  );

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <MemberMultiSelect selected={memberFilter} onChange={setMemberFilter} />
        {memberFilter.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Highlighting rows with selected members
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 780 }}>
          {/* Month marker header */}
          <div className="flex border-b border-border bg-surface/50" style={{ paddingLeft: SIDEBAR_W + 20 }}>
            <div className="relative flex-1 py-1.5" style={{ height: 28 }}>
              {RESOURCE_MONTH_MARKS.map((mk) => {
                const d = fromISO(mk.iso);
                const pct = ((d.getTime() - rsDate.getTime()) / rangeMs) * 100;
                return (
                  <span
                    key={mk.iso}
                    className="absolute text-2xs font-medium text-muted-foreground"
                    style={{ left: `${pct}%`, transform: "translateX(-25%)" }}
                  >
                    {mk.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Column header */}
          <div
            className="flex border-b border-border bg-surface/30"
            style={{ paddingLeft: 0 }}
          >
            <div
              className="shrink-0 border-r border-border px-3 py-1.5"
              style={{ width: SIDEBAR_W + 20 }}
            >
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project
              </span>
            </div>
            <div className="flex-1 px-3 py-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timeline · May – Jul 2026
              </span>
            </div>
          </div>

          {/* Project rows */}
          {GANTT_PROJECTS.map((project) => {
            const assigned = MEMBERS.filter((m) => project.teamIds.includes(m.id));
            const dimmed =
              memberFilter.length > 0 && !assigned.some((m) => memberFilter.includes(m.id));
            const geo = barGeo(project.start, project.end, rsDate, reDate);

            return (
              <div
                key={project.id}
                className={cn(
                  "flex border-b border-border transition-opacity",
                  dimmed ? "opacity-25" : "hover:bg-accent/10",
                )}
              >
                {/* Sidebar */}
                <div
                  className="shrink-0 border-r border-border px-3 py-3"
                  style={{ width: SIDEBAR_W + 20 }}
                >
                  <div className="truncate text-sm font-medium leading-snug">
                    {project.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {project.customer}
                  </div>
                </div>

                {/* Timeline area */}
                <div className="relative flex-1" style={{ height: 52 }}>
                  {/* Today line */}
                  {todayPct !== null && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500/50"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}

                  {/* Project bar */}
                  {geo && (
                    <div
                      className={cn(
                        "absolute z-20 flex items-center gap-1.5 rounded-md px-2",
                        RESOURCE_BAR_CLS[project.projectStatus],
                      )}
                      style={{ left: `${geo.left}%`, width: `${geo.width}%`, height: 28, top: 12 }}
                    >
                      {assigned.length > 0 ? (
                        <div className="flex items-center -space-x-1">
                          {assigned.map((m) => (
                            <MemberAvatar key={m.id} member={m} size="sm" />
                          ))}
                        </div>
                      ) : (
                        <span className="whitespace-nowrap text-2xs font-medium text-red-500/80">
                          Unassigned
                        </span>
                      )}
                      <span className="truncate text-2xs text-foreground/60">
                        {fmtShort(project.start)} – {fmtShort(project.end)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Summary footer */}
          <div className="flex border-t border-border bg-surface/40">
            <div
              className="shrink-0 border-r border-border px-3 py-2.5"
              style={{ width: SIDEBAR_W + 20 }}
            >
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Load
              </span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-4 px-4 py-2.5">
              {MEMBERS.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5">
                  <MemberAvatar member={m} size="sm" />
                  <span className="text-xs font-medium">{m.name.split(" ")[0]}</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-px text-2xs font-medium text-primary">
                    {memberProjectCount[m.id]} project{memberProjectCount[m.id] !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3 · CAPACITY ─────────────────────────────────────────────────────────

function CapacityTab() {
  const weekTotals = CAPACITY_WEEKS.map((_, wi) =>
    MEMBERS.reduce((sum, m) => sum + (CAPACITY_HOURS[m.id]?.[wi] ?? 0), 0),
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 700 }}>
        {/* Header */}
        <div className="flex border-b border-border bg-surface/50">
          <div
            className="shrink-0 border-r border-border px-3 py-2"
            style={{ width: SIDEBAR_W + 40 }}
          >
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team Member
            </span>
          </div>
          {CAPACITY_WEEKS.map((w) => (
            <div key={w} className="flex-1 border-r border-border px-3 py-2 text-center">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {fromISO(w).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>

        {/* Member rows */}
        {MEMBERS.map((member) => {
          const capacity = member.availability === "full_time" ? 40 : 20;
          const hours = CAPACITY_HOURS[member.id] ?? [0, 0, 0, 0, 0];

          return (
            <div key={member.id} className="flex border-b border-border hover:bg-accent/10 transition-colors">
              {/* Name + role */}
              <div
                className="shrink-0 border-r border-border px-3 py-3"
                style={{ width: SIDEBAR_W + 40 }}
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar member={member} />
                  <div>
                    <div className="text-sm font-medium leading-snug">{member.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{member.role}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-2xs font-medium",
                          member.availability === "full_time"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                        )}
                      >
                        {member.availability === "full_time" ? "Full Time" : "Part Time"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Week cells */}
              {hours.map((h, wi) => {
                const rawPct = (h / capacity) * 100;
                const barPct = Math.min(100, rawPct);
                const isOver = rawPct > 100;
                const barCls = isOver
                  ? "bg-red-500"
                  : rawPct >= 80
                  ? "bg-amber-500"
                  : "bg-green-500";

                return (
                  <div key={wi} className="flex-1 border-r border-border px-3 py-3">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isOver ? "text-red-500" : rawPct >= 80 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                        )}
                      >
                        {h}h
                      </span>
                      <span className="text-2xs text-muted-foreground">/ {capacity}h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", barCls)}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    {isOver && (
                      <p className="mt-1 text-2xs font-medium text-red-500">
                        +{h - capacity}h over
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Footer totals */}
        <div className="flex border-t border-border bg-surface/40">
          <div
            className="shrink-0 border-r border-border px-3 py-2.5"
            style={{ width: SIDEBAR_W + 40 }}
          >
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Scheduled
            </span>
          </div>
          {CAPACITY_WEEKS.map((w, wi) => (
            <div key={w} className="flex-1 border-r border-border px-3 py-2.5 text-center">
              <span className="text-base font-semibold">{weekTotals[wi]}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; Icon: typeof GanttChart }[] = [
  { id: "gantt",    label: "Gantt",         Icon: GanttChart },
  { id: "resource", label: "Resource View", Icon: Users2 },
  { id: "capacity", label: "Capacity",      Icon: BarChart2 },
];

function PlannerPage() {
  const { setMeta } = useMeta();
  const [tab, setTab] = useState<TabId>("gantt");

  useEffect(() => {
    setMeta({
      title: "Planner",
      subtitle: "Project timeline and resource planning",
    });
  }, [setMeta]);

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-border px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
              tab === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.Icon className="h-3.5 w-3.5" />
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "gantt"    && <GanttTab />}
      {tab === "resource" && <ResourceTab />}
      {tab === "capacity" && <CapacityTab />}
    </div>
  );
}

/*
  PLANNER NOTE: Gantt and Resource View derive from projects + phases tables.
  No additional tables needed — phase start/end dates drive the Gantt.

  Capacity View derives from:
  - scheduled_jobs + scheduled_job_techs (hours scheduled)
  - team_members (availability/capacity)

  No separate planner tables required.
*/

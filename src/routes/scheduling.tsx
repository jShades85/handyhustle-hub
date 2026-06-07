import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useMeta } from "@/contexts/PageMetaContext";
import { ownerNames } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/scheduling")({
  head: () => ({ meta: [{ title: "Scheduling · Crosscurrent" }] }),
  component: SchedulingPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type JobCategory =
  | "security"
  | "networking"
  | "audio_video"
  | "access_control"
  | "service_call"
  | "other";

type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
type JobType = "project" | "work_order";

interface ScheduledJob {
  id: string;
  title: string;
  jobType: JobType;
  jobReference: string;
  category: JobCategory;
  customer: string;
  address: string;
  assignedTechs: string[];
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM 24h
  endTime: string;    // HH:MM 24h
  status: JobStatus;
  notes: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 7;
const HOUR_END = 19;
const CELL_H = 60; // px per hour
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

const TECH_NAMES = Object.values(ownerNames);

const CATEGORY_LABELS: Record<JobCategory, string> = {
  security: "Security",
  networking: "Networking",
  audio_video: "Audio / Video",
  access_control: "Access Control",
  service_call: "Service Call",
  other: "Other",
};

const CATEGORY_COLORS: Record<JobCategory, { bg: string; border: string; text: string; dot: string }> = {
  security:       { bg: "bg-blue-500/15",   border: "border-l-blue-500",   text: "text-blue-700 dark:text-blue-300",   dot: "bg-blue-500" },
  networking:     { bg: "bg-purple-500/15", border: "border-l-purple-500", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  audio_video:    { bg: "bg-orange-500/15", border: "border-l-orange-500", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  access_control: { bg: "bg-teal-500/15",   border: "border-l-teal-500",   text: "text-teal-700 dark:text-teal-300",   dot: "bg-teal-500" },
  service_call:   { bg: "bg-yellow-500/15", border: "border-l-yellow-500", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  other:          { bg: "bg-slate-500/15",  border: "border-l-slate-500",  text: "text-slate-700 dark:text-slate-300",  dot: "bg-slate-500" },
};

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Demo Data ────────────────────────────────────────────────────────────────

/*
  SCHEMA NOTES — scheduled_jobs table
  id, tenant_id, job_type, job_id (FK to projects or work_orders),
  category, customer_name, address, date, start_time, end_time,
  status, notes, created_at, updated_at

  scheduled_job_techs (join table)
  id, scheduled_job_id, team_member_id
*/

const INITIAL_JOBS: ScheduledJob[] = [
  // ── Jun 7 (Sun) — 2 jobs ────────────────────────────────────────────────────
  {
    id: "sj-001", title: "DVR Replacement", jobType: "work_order",
    jobReference: "WO-0041", category: "security",
    customer: "Pacific Coast Security Systems", address: "4200 Harbor Blvd, Costa Mesa, CA",
    assignedTechs: ["Ravi Tate"],
    date: "2026-06-07", startTime: "08:00", endTime: "14:00",
    status: "completed", notes: null,
  },
  {
    id: "sj-002", title: "Network Switch Install", jobType: "work_order",
    jobReference: "WO-0043", category: "networking",
    customer: "Pacific Coast Security Systems", address: "1820 Newport Blvd, Newport Beach, CA",
    assignedTechs: ["Maya Okafor"],
    date: "2026-06-07", startTime: "09:00", endTime: "15:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 8 (Mon) — 3 jobs ────────────────────────────────────────────────────
  {
    id: "sj-003", title: "Penthouse Cinema — Install Day 1", jobType: "project",
    jobReference: "AV-2026-014", category: "audio_video",
    customer: "Northbeam Architects", address: "44 Berry St, Brooklyn, NY",
    assignedTechs: ["Ravi Tate", "Sofia Nakamura"],
    date: "2026-06-08", startTime: "07:00", endTime: "15:00",
    status: "in_progress", notes: "Bring rack #2 from warehouse",
  },
  {
    id: "sj-004", title: "Quay Residence Commissioning", jobType: "project",
    jobReference: "AV-2026-009", category: "audio_video",
    customer: "Quay Residential", address: "1408 Bayshore Dr, Miami, FL",
    assignedTechs: ["Sofia Nakamura"],
    date: "2026-06-08", startTime: "09:00", endTime: "13:00",
    status: "in_progress", notes: null,
  },
  {
    id: "sj-005", title: "Vertex 14F Closeout Walk", jobType: "project",
    jobReference: "AV-2025-138", category: "service_call",
    customer: "Vertex Capital Partners", address: "200 W Madison St, Chicago, IL",
    assignedTechs: ["Eli Moreno"],
    date: "2026-06-08", startTime: "14:00", endTime: "16:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 9 (Tue) — 4 jobs (overlap test) ────────────────────────────────────
  {
    id: "sj-006", title: "Halcyon Auditorium Punch List", jobType: "project",
    jobReference: "AV-2025-132", category: "audio_video",
    customer: "Halcyon Public Schools", address: "1010 SE Powell Blvd, Portland, OR",
    assignedTechs: ["Maya Okafor", "Eli Moreno"],
    date: "2026-06-09", startTime: "07:00", endTime: "16:00",
    status: "in_progress", notes: null,
  },
  {
    id: "sj-007", title: "Arden — DSP Programming", jobType: "project",
    jobReference: "AV-2026-005", category: "audio_video",
    customer: "Arden & Loom Studios", address: "5200 Lankershim Blvd, Los Angeles, CA",
    assignedTechs: ["Aman Verma"],
    date: "2026-06-09", startTime: "08:00", endTime: "12:00",
    status: "scheduled", notes: "Crestron programmer on site",
  },
  {
    id: "sj-008", title: "Helio — Rack Build Day 1", jobType: "project",
    jobReference: "AV-2026-011", category: "audio_video",
    customer: "Helio Health Systems", address: "1719 E 19th Ave, Denver, CO",
    assignedTechs: ["Ravi Tate"],
    date: "2026-06-09", startTime: "09:00", endTime: "17:00",
    status: "in_progress", notes: null,
  },
  {
    id: "sj-009", title: "Pinecrest Site Survey", jobType: "project",
    jobReference: "AV-2026-016", category: "service_call",
    customer: "Pinecrest Hospitality Group", address: "905 Congress Ave, Austin, TX",
    assignedTechs: ["Jess Kim"],
    date: "2026-06-09", startTime: "10:00", endTime: "12:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 10 (Wed) — 3 jobs ───────────────────────────────────────────────────
  {
    id: "sj-010", title: "Surgical Center Cable Run", jobType: "project",
    jobReference: "AV-2026-011", category: "audio_video",
    customer: "Helio Health Systems", address: "1719 E 19th Ave, Denver, CO",
    assignedTechs: ["Ravi Tate", "Aman Verma"],
    date: "2026-06-10", startTime: "07:00", endTime: "13:00",
    status: "in_progress", notes: null,
  },
  {
    id: "sj-011", title: "Access Control Fault", jobType: "work_order",
    jobReference: "WO-0042", category: "access_control",
    customer: "Pacific Coast Security Systems", address: "4200 Harbor Blvd, Costa Mesa, CA",
    assignedTechs: ["Aman Verma"],
    date: "2026-06-10", startTime: "09:00", endTime: "13:00",
    status: "in_progress", notes: "Panel at entry door #3",
  },
  {
    id: "sj-012", title: "Smart Home Final Walkthrough", jobType: "project",
    jobReference: "AV-2026-009", category: "audio_video",
    customer: "Quay Residential", address: "1408 Bayshore Dr, Miami, FL",
    assignedTechs: ["Sofia Nakamura"],
    date: "2026-06-10", startTime: "14:00", endTime: "17:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 11 (Thu) — 2 jobs ───────────────────────────────────────────────────
  {
    id: "sj-013", title: "Cinder & Oak Staff Training", jobType: "work_order",
    jobReference: "WO-0044", category: "service_call",
    customer: "Cinder & Oak Hospitality", address: "112 3rd Ave S, Nashville, TN",
    assignedTechs: ["Jess Kim"],
    date: "2026-06-11", startTime: "10:00", endTime: "12:00",
    status: "completed", notes: null,
  },
  {
    id: "sj-014", title: "Lobby Video Wall — Structural Survey", jobType: "project",
    jobReference: "AV-2026-016", category: "audio_video",
    customer: "Pinecrest Hospitality Group", address: "905 Congress Ave, Austin, TX",
    assignedTechs: ["Jess Kim", "Maya Okafor"],
    date: "2026-06-11", startTime: "13:00", endTime: "17:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 12 (Fri) — 1 job ────────────────────────────────────────────────────
  {
    id: "sj-015", title: "Vertex Boardroom Rack Install", jobType: "work_order",
    jobReference: "AV-2026-017", category: "audio_video",
    customer: "Vertex Capital Partners", address: "200 W Madison St, Chicago, IL",
    assignedTechs: ["Ravi Tate"],
    date: "2026-06-12", startTime: "08:00", endTime: "16:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 14 (Sun) — 1 job ────────────────────────────────────────────────────
  {
    id: "sj-016", title: "Northbeam Projector Calibration", jobType: "work_order",
    jobReference: "AV-2026-018", category: "audio_video",
    customer: "Northbeam Architects", address: "44 Berry St, Brooklyn, NY",
    assignedTechs: ["Maya Okafor"],
    date: "2026-06-14", startTime: "09:00", endTime: "12:00",
    status: "scheduled", notes: null,
  },
  // ── Jun 16 (Tue) — 2 jobs ───────────────────────────────────────────────────
  {
    id: "sj-017", title: "Trading Floor Network Prep", jobType: "project",
    jobReference: "AV-2026-019", category: "networking",
    customer: "Vertex Capital Partners", address: "200 W Madison St, Chicago, IL",
    assignedTechs: ["Ravi Tate", "Aman Verma"],
    date: "2026-06-16", startTime: "07:00", endTime: "11:00",
    status: "scheduled", notes: null,
  },
  {
    id: "sj-018", title: "Halcyon Classroom AV Kickoff", jobType: "project",
    jobReference: "AV-2026-020", category: "audio_video",
    customer: "Halcyon Public Schools", address: "1010 SE Powell Blvd, Portland, OR",
    assignedTechs: ["Maya Okafor", "Eli Moreno", "Sofia Nakamura"],
    date: "2026-06-16", startTime: "08:00", endTime: "17:00",
    status: "scheduled", notes: "First day — bring all staging equipment",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday = 0
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function timeToOffset(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h + m / 60 - HOUR_START) * CELL_H;
}

function durationToHeight(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(((eh + em / 60) - (sh + sm / 60)) * CELL_H - 2, 20);
}

function todayStr(): string {
  return toDateStr(new Date());
}

function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekStart)} — ${fmt(end)}, ${weekStart.getFullYear()}`;
}

function dayViewLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function currentTimeOffset(): number {
  const now = new Date();
  return (now.getHours() + now.getMinutes() / 60 - HOUR_START) * CELL_H;
}

// ─── Multi-select dropdown ────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  renderOption?: (opt: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] text-foreground hover:bg-accent/40 transition-colors"
      >
        {selected.length > 0 ? `${label} (${selected.length})` : label}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-md border border-border bg-background shadow-md py-1">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[12px] hover:bg-accent/40"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {renderOption ? renderOption(opt) : opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Job block (placeholder) ──────────────────────────────────────────────────

function JobBlock({ job, style }: { job: ScheduledJob; style: React.CSSProperties }) {
  const colors = CATEGORY_COLORS[job.category];
  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 rounded border-l-2 px-1.5 py-0.5 overflow-hidden",
        colors.bg,
        colors.border,
        colors.text,
      )}
      style={style}
    >
      <div className="truncate text-[10.5px] font-medium leading-snug">{job.title}</div>
    </div>
  );
}

// ─── Time gutter ─────────────────────────────────────────────────────────────

function TimeGutter() {
  return (
    <div className="border-r border-border bg-surface/30">
      {HOURS.map((h) => (
        <div key={h} className="flex items-start justify-end pr-2 pt-0.5 border-b border-border/40 text-[10px] font-mono text-muted-foreground" style={{ height: CELL_H }}>
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  jobs,
  today,
  onDayClick,
}: {
  weekStart: Date;
  jobs: ScheduledJob[];
  today: string;
  onDayClick: (dateStr: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: d, dateStr: toDateStr(d) };
  });

  const todayOffset = currentTimeOffset();
  const showTimeLine =
    todayOffset >= 0 && todayOffset <= HOURS.length * CELL_H;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[780px]">
        {/* Column headers */}
        <div
          className="grid border-b border-border bg-surface/50"
          style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}
        >
          <div />
          {days.map(({ date, dateStr }) => {
            const isToday = dateStr === today;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onDayClick(dateStr)}
                className={cn(
                  "border-l border-border px-2 py-1.5 text-left hover:bg-accent/40 transition-colors",
                  isToday && "bg-primary/5",
                )}
              >
                <div className={cn("text-[10px] uppercase tracking-wide text-muted-foreground", isToday && "text-primary font-semibold")}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={cn("text-[13px] font-semibold leading-tight", isToday ? "text-primary" : "text-foreground")}>
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Grid body */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}
        >
          <TimeGutter />
          {days.map(({ dateStr }) => {
            const isToday = dateStr === today;
            const dayJobs = jobs.filter((j) => j.date === dateStr);
            return (
              <div
                key={dateStr}
                className={cn("relative border-l border-border", isToday && "bg-primary/[0.03]")}
                style={{ height: HOURS.length * CELL_H }}
              >
                {HOURS.map((h) => (
                  <div key={h} className="border-b border-border/40" style={{ height: CELL_H }} />
                ))}
                {isToday && showTimeLine && (
                  <div
                    className="absolute inset-x-0 z-10 h-px bg-red-500 pointer-events-none"
                    style={{ top: todayOffset }}
                  >
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}
                {dayJobs.map((job) => (
                  <JobBlock
                    key={job.id}
                    job={job}
                    style={{
                      top: timeToOffset(job.startTime),
                      height: durationToHeight(job.startTime, job.endTime),
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ dateStr, jobs, today }: { dateStr: string; jobs: ScheduledJob[]; today: string }) {
  const isToday = dateStr === today;
  const dayJobs = jobs.filter((j) => j.date === dateStr);
  const todayOffset = currentTimeOffset();
  const showTimeLine = isToday && todayOffset >= 0 && todayOffset <= HOURS.length * CELL_H;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Header */}
        <div
          className="grid border-b border-border bg-surface/50"
          style={{ gridTemplateColumns: `48px 1fr` }}
        >
          <div />
          <div className={cn("border-l border-border px-3 py-2", isToday && "bg-primary/5")}>
            <div className={cn("text-[10px] uppercase tracking-wide text-muted-foreground", isToday && "text-primary font-semibold")}>
              {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            <div className={cn("text-[13px] font-semibold", isToday ? "text-primary" : "text-foreground")}>
              {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Grid body */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `48px 1fr` }}
        >
          <TimeGutter />
          <div
            className={cn("relative border-l border-border", isToday && "bg-primary/[0.03]")}
            style={{ height: HOURS.length * CELL_H }}
          >
            {HOURS.map((h) => (
              <div key={h} className="border-b border-border/40" style={{ height: CELL_H }} />
            ))}
            {showTimeLine && (
              <div
                className="absolute inset-x-0 z-10 h-px bg-red-500 pointer-events-none"
                style={{ top: todayOffset }}
              >
                <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
              </div>
            )}
            {dayJobs.map((job) => (
              <JobBlock
                key={job.id}
                job={job}
                style={{
                  top: timeToOffset(job.startTime),
                  height: durationToHeight(job.startTime, job.endTime),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Job Drawer ──────────────────────────────────────────────────────

const formSchema = z.object({
  jobReference: z.string().min(1, "Required"),
  title: z.string().min(1, "Required"),
  jobType: z.enum(["project", "work_order"]),
  category: z.enum(["security", "networking", "audio_video", "access_control", "service_call", "other"]),
  customer: z.string().min(1, "Required"),
  address: z.string().optional(),
  date: z.string().min(1, "Required"),
  startTime: z.string().min(1, "Required"),
  endTime: z.string().min(1, "Required"),
  assignedTechs: z.array(z.string()).min(1, "Select at least one tech"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const inputCls =
  "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";
const errorCls = "mt-0.5 text-[10.5px] text-red-500";

function ScheduleDrawer({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (job: ScheduledJob) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { jobType: "work_order", assignedTechs: [], notes: "" },
  });

  const assignedTechs = watch("assignedTechs");
  const selectedCategory = watch("category") as JobCategory | undefined;

  const toggleTech = (name: string) => {
    const current = assignedTechs ?? [];
    setValue(
      "assignedTechs",
      current.includes(name) ? current.filter((t) => t !== name) : [...current, name],
      { shouldValidate: true },
    );
  };

  const onSubmit = (data: FormData) => {
    const job: ScheduledJob = {
      id: `sj-${Date.now()}`,
      title: data.title,
      jobType: data.jobType,
      jobReference: data.jobReference,
      category: data.category,
      customer: data.customer,
      address: data.address ?? "",
      assignedTechs: data.assignedTechs,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      status: "scheduled",
      notes: data.notes ?? null,
    };
    onSave(job);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-[14px]">Schedule Job</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-4">
          {/* Job Reference */}
          <div>
            <label className={labelCls}>Job Reference *</label>
            <input
              {...register("jobReference")}
              placeholder="e.g. PRJ-0023 or WO-0042"
              className={inputCls}
            />
            {errors.jobReference && <p className={errorCls}>{errors.jobReference.message}</p>}
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input {...register("title")} placeholder="Job title" className={inputCls} />
            {errors.title && <p className={errorCls}>{errors.title.message}</p>}
          </div>

          {/* Job Type */}
          <div>
            <label className={labelCls}>Job Type *</label>
            <div className="flex gap-2">
              {(["project", "work_order"] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer text-[12.5px]">
                  <input
                    type="radio"
                    value={t}
                    {...register("jobType")}
                    className="accent-primary"
                  />
                  {t === "project" ? "Project" : "Work Order"}
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category *</label>
            <select {...register("category")} className={cn(inputCls, "cursor-pointer")}>
              <option value="">Select category…</option>
              {(Object.keys(CATEGORY_LABELS) as JobCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
            {selectedCategory && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", CATEGORY_COLORS[selectedCategory].dot)} />
                {CATEGORY_LABELS[selectedCategory]}
              </div>
            )}
            {errors.category && <p className={errorCls}>{errors.category.message}</p>}
          </div>

          {/* Customer */}
          <div>
            <label className={labelCls}>Customer *</label>
            <input {...register("customer")} placeholder="Customer name" className={inputCls} />
            {errors.customer && <p className={errorCls}>{errors.customer.message}</p>}
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Address</label>
            <input {...register("address")} placeholder="Site address" className={inputCls} />
          </div>

          {/* Date / Times */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label className={labelCls}>Date *</label>
              <input type="date" {...register("date")} className={inputCls} />
              {errors.date && <p className={errorCls}>{errors.date.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Start *</label>
              <input type="time" {...register("startTime")} className={inputCls} />
              {errors.startTime && <p className={errorCls}>{errors.startTime.message}</p>}
            </div>
            <div>
              <label className={labelCls}>End *</label>
              <input type="time" {...register("endTime")} className={inputCls} />
              {errors.endTime && <p className={errorCls}>{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Assign Techs */}
          <div>
            <label className={labelCls}>Assign Techs *</label>
            <div className="rounded-md border border-border bg-surface p-2 flex flex-col gap-1">
              {TECH_NAMES.map((name) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={assignedTechs?.includes(name) ?? false}
                    onChange={() => toggleTech(name)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {name}
                </label>
              ))}
            </div>
            {errors.assignedTechs && <p className={errorCls}>{errors.assignedTechs.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Optional notes…"
              className={cn(inputCls, "h-auto py-1.5 resize-none")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false); }}
              className="h-8 rounded-md border border-border px-4 text-[12.5px] text-muted-foreground hover:bg-accent/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SchedulingPage() {
  const { setMeta } = useMeta();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [jobs, setJobs] = useState<ScheduledJob[]>(INITIAL_JOBS);

  const [view, setView] = useState<"week" | "day">(() => {
    try {
      const stored = localStorage.getItem("hhh-schedule-view");
      return stored === "day" ? "day" : "week";
    } catch {
      return "week";
    }
  });

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayStr());

  // Filters
  const [techFilter, setTechFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  useEffect(() => {
    setMeta({
      title: "Scheduling",
      subtitle: "Job calendar and dispatch",
      newLabel: "Schedule Job",
      onNew: () => setDrawerOpen(true),
    });
  }, [setMeta]);

  const changeView = (v: "week" | "day") => {
    setView(v);
    try { localStorage.setItem("hhh-schedule-view", v); } catch { /* ignore */ }
  };

  const goToday = () => {
    setWeekStart(getWeekStart(new Date()));
    setSelectedDate(todayStr());
  };

  const navPrev = () => {
    if (view === "week") {
      setWeekStart((w) => addDays(w, -7));
    } else {
      const prev = toDateStr(addDays(new Date(selectedDate + "T00:00:00"), -1));
      setSelectedDate(prev);
      setWeekStart(getWeekStart(new Date(prev + "T00:00:00")));
    }
  };

  const navNext = () => {
    if (view === "week") {
      setWeekStart((w) => addDays(w, 7));
    } else {
      const next = toDateStr(addDays(new Date(selectedDate + "T00:00:00"), 1));
      setSelectedDate(next);
      setWeekStart(getWeekStart(new Date(next + "T00:00:00")));
    }
  };

  const onDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setWeekStart(getWeekStart(new Date(dateStr + "T00:00:00")));
    changeView("day");
  };

  const rangeLabel =
    view === "week" ? weekRangeLabel(weekStart) : dayViewLabel(selectedDate);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (techFilter.length > 0 && !j.assignedTechs.some((t) => techFilter.includes(t))) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(j.category)) return false;
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      return true;
    });
  }, [jobs, techFilter, categoryFilter, statusFilter]);

  const visibleJobs = useMemo(() => {
    if (view === "week") {
      const start = toDateStr(weekStart);
      const end = toDateStr(addDays(weekStart, 6));
      return filteredJobs.filter((j) => j.date >= start && j.date <= end);
    }
    return filteredJobs.filter((j) => j.date === selectedDate);
  }, [filteredJobs, view, weekStart, selectedDate]);

  const addJob = (job: ScheduledJob) => setJobs((prev) => [...prev, job]);

  const selectCls =
    "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Top navigation bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={goToday}
          className="h-7 rounded-md border border-border bg-surface px-3 text-[11.5px] font-medium hover:bg-accent/40 transition-colors"
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

        <span className="flex-1 text-center text-[13px] font-medium">{rangeLabel}</span>

        {/* View toggle */}
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={cn(
                "px-3 py-1 text-[11.5px] font-medium transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-accent/40",
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <MultiSelect
          label="Techs"
          options={TECH_NAMES}
          selected={techFilter}
          onChange={setTechFilter}
        />
        <MultiSelect
          label="Category"
          options={Object.keys(CATEGORY_LABELS) as JobCategory[]}
          selected={categoryFilter}
          onChange={setCategoryFilter}
          renderOption={(opt) => (
            <span className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", CATEGORY_COLORS[opt as JobCategory].dot)} />
              {CATEGORY_LABELS[opt as JobCategory]}
            </span>
          )}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | "all")}
          className={selectCls}
        >
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {visibleJobs.length} job{visibleJobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {view === "week" ? (
          <WeekView
            weekStart={weekStart}
            jobs={visibleJobs}
            today={todayStr()}
            onDayClick={onDayClick}
          />
        ) : (
          <DayView dateStr={selectedDate} jobs={visibleJobs} today={todayStr()} />
        )}
      </div>

      {/* Schedule Job drawer */}
      <ScheduleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSave={addJob}
      />
    </div>
  );
}

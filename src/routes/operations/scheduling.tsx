import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Clock } from "lucide-react";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterBar, FilterSelect } from "@/components/ui/page-components";

export const Route = createFileRoute("/operations/scheduling")({
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
  jobId: string | null;
  jobType: JobType;
  jobReference: string;
  title: string;
  category: JobCategory;
  customer: string;
  address: string;
  assignedTechs: { id: string; name: string }[];
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

const STATUS_BADGE_CLASSES: Record<JobStatus, string> = {
  scheduled:   "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
  completed:   "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300",
  cancelled:   "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300",
};


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

// ─── Overlap layout ───────────────────────────────────────────────────────────

interface JobLayout { left: number; width: number }

function techInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function computeOverlapLayout(jobs: ScheduledJob[]): Map<string, JobLayout> {
  const result = new Map<string, JobLayout>();
  if (jobs.length === 0) return result;

  const sorted = [...jobs].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const colEnds: string[] = [];
  const jobCol = new Map<string, number>();

  for (const job of sorted) {
    let col = colEnds.findIndex((end) => end <= job.startTime);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(job.endTime);
    } else {
      colEnds[col] = job.endTime;
    }
    jobCol.set(job.id, col);
  }

  for (const job of sorted) {
    const concurrent = sorted.filter(
      (o) => o.startTime < job.endTime && o.endTime > job.startTime,
    ).length;
    const col = jobCol.get(job.id)!;
    result.set(job.id, {
      left: (col / concurrent) * 100,
      width: (1 / concurrent) * 100,
    });
  }

  return result;
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

// ─── Job block ───────────────────────────────────────────────────────────────

function JobBlock({
  job,
  style,
  isDayView = false,
  onEditSchedule,
}: {
  job: ScheduledJob;
  style: React.CSSProperties;
  isDayView?: boolean;
  onEditSchedule: (job: ScheduledJob) => void;
}) {
  const colors = CATEGORY_COLORS[job.category];
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const height =
    typeof style.height === "number"
      ? style.height
      : parseFloat(style.height as string);
  const compact = height < 46;

  const handleViewJob = () => {
    setOpen(false);
    if (!job.jobId) return;
    if (job.jobType === "work_order") {
      navigate({ to: "/operations/work-orders/$workOrderId", params: { workOrderId: job.jobId } });
    } else {
      navigate({ to: "/operations/projects/$projectId", params: { projectId: job.jobId } });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "absolute rounded border-l-[3px] px-1.5 py-0.5 overflow-hidden cursor-pointer",
            "hover:brightness-95 dark:hover:brightness-110 transition-[filter] select-none",
            colors.bg,
            colors.border,
            colors.text,
          )}
          style={style}
        >
          <div className="truncate text-[10.5px] font-semibold leading-snug">{job.title}</div>
          {!compact && (
            <div className="truncate text-[9.5px] opacity-70 leading-snug">{job.customer}</div>
          )}
          {!compact && (
            <div className="truncate text-[9.5px] opacity-70 leading-snug font-mono">
              {job.startTime} – {job.endTime}
            </div>
          )}
          {isDayView && !compact && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {job.assignedTechs.map((tech) => (
                <span
                  key={tech.id}
                  title={tech.name}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/30 dark:bg-black/20 border border-current/30 text-[8px] font-bold"
                >
                  {techInitials(tech.name)}
                </span>
              ))}
              <span className={cn("ml-0.5 rounded border border-current/20 px-1 py-px text-[9px] font-semibold", colors.bg, colors.text)}>
                {CATEGORY_LABELS[job.category]}
              </span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="right" align="start" sideOffset={8}>
        <div className="px-4 pt-4 pb-3">
          <div className="text-[13px] font-semibold leading-snug">{job.title}</div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground">{job.jobReference}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold border-current/20",
                colors.bg,
                colors.text,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
              {CATEGORY_LABELS[job.category]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold",
                STATUS_BADGE_CLASSES[job.status],
              )}
            >
              {STATUS_LABELS[job.status]}
            </span>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3 flex flex-col gap-2.5 text-[11.5px]">
          <div className="flex items-start gap-2">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium leading-snug">{job.customer}</div>
              <div className="text-muted-foreground leading-snug">{job.address}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {new Date(job.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric",
              })}
              {" · "}
              {job.startTime} – {job.endTime}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1 h-3.5 w-3.5 shrink-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex flex-wrap gap-1">
              {job.assignedTechs.map((tech) => (
                <span
                  key={tech.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/60 px-2 py-0.5 text-[10.5px]"
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[7.5px] font-bold">
                    {techInitials(tech.name)}
                  </span>
                  {tech.name}
                </span>
              ))}
            </div>
          </div>
          {job.notes && (
            <p className="pl-5 italic text-[11px] leading-snug text-muted-foreground">{job.notes}</p>
          )}
        </div>
        <div className="flex gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={handleViewJob}
            className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-[11.5px] font-medium hover:opacity-90 transition-opacity"
          >
            View Job
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onEditSchedule(job); }}
            className="flex-1 h-7 rounded-md border border-border text-[11.5px] font-medium text-foreground hover:bg-accent/40 transition-colors"
          >
            Edit Schedule
          </button>
        </div>
      </PopoverContent>
    </Popover>
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
  onEditSchedule,
}: {
  weekStart: Date;
  jobs: ScheduledJob[];
  today: string;
  onDayClick: (dateStr: string) => void;
  onEditSchedule: (job: ScheduledJob) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: d, dateStr: toDateStr(d) };
  });

  const dayLayouts = new Map(
    days.map(({ dateStr }) => [
      dateStr,
      computeOverlapLayout(jobs.filter((j) => j.date === dateStr)),
    ]),
  );

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
                {dayJobs.map((job) => {
                  const layout = dayLayouts.get(dateStr)?.get(job.id) ?? { left: 0, width: 100 };
                  return (
                    <JobBlock
                      key={job.id}
                      job={job}
                      style={{
                        top: timeToOffset(job.startTime),
                        height: durationToHeight(job.startTime, job.endTime),
                        left: `calc(${layout.left}% + 1px)`,
                        width: `calc(${layout.width}% - 2px)`,
                      }}
                      onEditSchedule={onEditSchedule}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  dateStr,
  jobs,
  today,
  onEditSchedule,
}: {
  dateStr: string;
  jobs: ScheduledJob[];
  today: string;
  onEditSchedule: (job: ScheduledJob) => void;
}) {
  const isToday = dateStr === today;
  const dayJobs = jobs.filter((j) => j.date === dateStr);
  const layout = computeOverlapLayout(dayJobs);
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
            {dayJobs.map((job) => {
              const jl = layout.get(job.id) ?? { left: 0, width: 100 };
              return (
                <JobBlock
                  key={job.id}
                  job={job}
                  isDayView
                  style={{
                    top: timeToOffset(job.startTime),
                    height: durationToHeight(job.startTime, job.endTime),
                    left: `calc(${jl.left}% + 1px)`,
                    width: `calc(${jl.width}% - 2px)`,
                  }}
                  onEditSchedule={onEditSchedule}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Job Drawer ──────────────────────────────────────────────────────

const formSchema = z.object({
  jobType: z.enum(["project", "work_order"]),
  jobId: z.string().optional(),
  jobReference: z.string().optional(),
  title: z.string().min(1, "Required"),
  category: z.enum(["security", "networking", "audio_video", "access_control", "service_call", "other"]),
  customer: z.string().min(1, "Required"),
  address: z.string().optional(),
  date: z.string().min(1, "Required"),
  startTime: z.string().min(1, "Required"),
  endTime: z.string().min(1, "Required"),
  techIds: z.array(z.string()).min(1, "Select at least one tech"),
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
  editingJob = null,
  teamMembers,
  workOrders,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: FormData, editingId?: string) => void;
  editingJob?: ScheduledJob | null;
  teamMembers: { id: string; full_name: string }[];
  workOrders: { id: string; code: string; name: string; site_address: string; customer_name: string }[];
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
    defaultValues: { jobType: "work_order" as const, techIds: [], notes: "" },
  });

  const techIds = watch("techIds");
  const selectedCategory = watch("category") as JobCategory | undefined;

  useEffect(() => {
    if (!open) return;
    if (editingJob) {
      reset({
        jobType: editingJob.jobType,
        jobId: editingJob.jobId ?? undefined,
        jobReference: editingJob.jobReference,
        title: editingJob.title,
        category: editingJob.category,
        customer: editingJob.customer,
        address: editingJob.address,
        date: editingJob.date,
        startTime: editingJob.startTime,
        endTime: editingJob.endTime,
        techIds: editingJob.assignedTechs.map((t) => t.id),
        notes: editingJob.notes ?? "",
      });
    } else {
      reset({ jobType: "work_order", techIds: [], notes: "" });
    }
  }, [open, editingJob, reset]);

  const handleJobSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setValue("jobId", selectedId);
    const record = workOrders.find((r) => r.id === selectedId);
    if (record) {
      setValue("jobReference", record.code);
      setValue("title", record.name);
      if (record.customer_name) setValue("customer", record.customer_name);
      if (record.site_address) setValue("address", record.site_address);
    }
  };

  const toggleTech = (id: string) => {
    const current = techIds ?? [];
    setValue(
      "techIds",
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
      { shouldValidate: true },
    );
  };

  const onSubmit = (data: FormData) => {
    onSave(data, editingJob?.id);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-[14px]">{editingJob ? "Edit Schedule" : "Dispatch Work Order"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-4">
          {/* Link Work Order */}
          <div>
            <label className={labelCls}>Work Order</label>
            <select
              className={cn(inputCls, "cursor-pointer")}
              onChange={handleJobSelect}
              defaultValue=""
            >
              <option value="">— Select work order…</option>
              {workOrders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input {...register("title")} placeholder="Job title" className={inputCls} />
            {errors.title && <p className={errorCls}>{errors.title.message}</p>}
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
              {teamMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-2 cursor-pointer text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={techIds?.includes(member.id) ?? false}
                    onChange={() => toggleTech(member.id)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {member.full_name}
                </label>
              ))}
            </div>
            {errors.techIds && <p className={errorCls}>{errors.techIds.message}</p>}
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

// ─── DB → ScheduledJob mapper ─────────────────────────────────────────────────

// Postgres time columns come back as "HH:MM:SS" — strip seconds for display.
function toHHMM(t: string): string {
  return t.slice(0, 5);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toScheduledJob(row: any): ScheduledJob {
  return {
    id: row.id,
    jobId: row.job_id ?? null,
    jobType: row.job_type as JobType,
    jobReference: row.job_reference ?? "",
    title: row.title,
    category: row.category as JobCategory,
    customer: row.customer_name,
    address: row.address ?? "",
    date: row.date,
    startTime: toHHMM(row.start_time),
    endTime: toHHMM(row.end_time),
    status: row.status as JobStatus,
    notes: row.notes ?? null,
    assignedTechs: (row.scheduled_job_techs ?? []).map(
      (t: { team_member_id: string; user_profiles: { id: string; full_name: string } | null }) => ({
        id: t.team_member_id,
        name: t.user_profiles?.full_name ?? "Unknown",
      }),
    ),
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SchedulingPage() {
  const { setMeta } = useMeta();
  const supabase = createClient();
  const qc = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);

  // Auto-refresh current-time indicator every 60 s
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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

  // Filters — tech filter uses IDs, category/status as before
  const [techFilter, setTechFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  useEffect(() => {
    setMeta({
      title: "Scheduling",
      subtitle: "Job calendar and dispatch",
      newLabel: "Dispatch",
      onNew: () => setDrawerOpen(true),
    });
  }, [setMeta]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: rawJobs = [] } = useQuery({
    queryKey: ["scheduled-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_jobs")
        .select(`*, scheduled_job_techs(team_member_id, user_profiles!team_member_id(id, full_name))`)
        .order("date")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["user-profiles-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ["work-orders-scheduling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          id, code, name, site_address,
          companies!company_id(name),
          contacts!contact_id(full_name),
          projects!project_id(site_address, companies!company_id(name), contacts!contact_id(full_name))
        `)
        .neq("status", "cancelled")
        .order("code");
      if (error) throw error;
      return (data ?? []).map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const co = r.companies as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ct = r.contacts as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proj = r.projects as any;
        return {
          id: r.id,
          code: r.code ?? "",
          name: r.name,
          site_address: r.site_address || proj?.site_address || "",
          customer_name: co?.name ?? ct?.full_name ?? proj?.companies?.name ?? proj?.contacts?.full_name ?? "",
        };
      });
    },
  });

  const jobs = useMemo(() => rawJobs.map(toScheduledJob), [rawJobs]);

  // ── Mutation ───────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async ({ formData, editingId }: { formData: ReturnType<typeof Object.assign> & { jobType: "project" | "work_order"; jobId?: string; jobReference?: string; title: string; category: string; customer: string; address?: string; date: string; startTime: string; endTime: string; techIds: string[]; notes?: string }, editingId?: string }) => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      if (!tenantId) throw new Error("tenant not loaded");
      const payload = {
        tenant_id: tenantId,
        job_type: formData.jobType,
        job_id: formData.jobId || null,
        job_reference: formData.jobReference || null,
        title: formData.title,
        category: formData.category,
        customer_name: formData.customer,
        address: formData.address || null,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        notes: formData.notes || null,
      };

      let sjId: string;
      if (editingId) {
        await supabase.from("scheduled_jobs").update(payload).eq("id", editingId);
        sjId = editingId;
        await supabase.from("scheduled_job_techs").delete().eq("scheduled_job_id", sjId);
      } else {
        const { data, error } = await supabase
          .from("scheduled_jobs")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        sjId = data.id;
      }

      if (formData.techIds.length > 0) {
        await supabase.from("scheduled_job_techs").insert(
          formData.techIds.map((mid: string) => ({ scheduled_job_id: sjId, team_member_id: mid })),
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });

  // ── Calendar helpers ───────────────────────────────────────────────────────

  const changeView = (v: "week" | "day") => {
    setView(v);
    try { localStorage.setItem("hhh-schedule-view", v); } catch { /* ignore */ }
  };

  const goToday = () => {
    setWeekStart(getWeekStart(new Date()));
    setSelectedDate(todayStr());
    changeView("week");
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
      if (techFilter.length > 0 && !j.assignedTechs.some((t) => techFilter.includes(t.id))) return false;
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

  const openEditDrawer = (job: ScheduledJob) => {
    setEditingJob(job);
    setDrawerOpen(true);
  };

  const handleDrawerOpenChange = (v: boolean) => {
    setDrawerOpen(v);
    if (!v) setEditingJob(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = (formData: any, editingId?: string) => {
    saveMutation.mutate({ formData, editingId });
  };

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
      <FilterBar>
        <MultiSelect
          label="Techs"
          options={teamMembers.map((m) => m.id)}
          selected={techFilter}
          onChange={setTechFilter}
          renderOption={(id) => {
            const m = teamMembers.find((t) => t.id === id);
            return <span>{m?.full_name ?? id}</span>;
          }}
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
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as JobStatus | "all")}
        >
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </FilterSelect>

        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {visibleJobs.length} job{visibleJobs.length !== 1 ? "s" : ""}
        </span>
      </FilterBar>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {view === "week" ? (
          <WeekView
            weekStart={weekStart}
            jobs={visibleJobs}
            today={todayStr()}
            onDayClick={onDayClick}
            onEditSchedule={openEditDrawer}
          />
        ) : (
          <DayView
            dateStr={selectedDate}
            jobs={visibleJobs}
            today={todayStr()}
            onEditSchedule={openEditDrawer}
          />
        )}
      </div>

      {/* Schedule Job drawer */}
      <ScheduleDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        onSave={handleSave}
        editingJob={editingJob}
        teamMembers={teamMembers}
        workOrders={workOrders}
      />
    </div>
  );
}

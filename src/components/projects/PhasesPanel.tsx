import { useCallback, useRef, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { ownerNames } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import type { ProjectType } from "@/data/projects";

// ─── Types ───────────────────────────────────────────────────────────────────

type PhaseStatus = "not-started" | "in-progress" | "complete";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  estHours: number;
  actualHours: number;
  done: boolean;
}

interface Phase {
  id: string;
  name: string;
  status: PhaseStatus;
  budgetedHours: number;
  loggedHours: number;
  assignees: string[];
  tasks: Task[];
}

interface Template {
  id: string;
  label: string;
  phases: ReadonlyArray<{ name: string }>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhasesPanelProps {
  projectId: string;
  projectType: ProjectType;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const phaseStatusMeta: Record<PhaseStatus, { label: string; cls: string }> = {
  "not-started": { label: "Not Started", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
  "in-progress": { label: "In Progress", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  "complete":    { label: "Complete",    cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
};

const TEMPLATES: Template[] = [
  {
    id: "blank",
    label: "Blank",
    phases: [],
  },
  {
    id: "standard-av",
    label: "Standard AV Install (Rough-in, Trim Out, Rack Build, Finish)",
    phases: [{ name: "Rough-in" }, { name: "Trim Out" }, { name: "Rack Build" }, { name: "Finish" }],
  },
  {
    id: "basic-3phase",
    label: "Basic 3-Phase (Prep, Install, Finish)",
    phases: [{ name: "Prep" }, { name: "Install" }, { name: "Finish" }],
  },
  {
    id: "custom",
    label: "Custom…",
    phases: [],
  },
];

// ─── Seed data ────────────────────────────────────────────────────────────────

function mkTask(
  id: string, title: string, assignee: string, dueDate: string,
  estHours: number, actualHours: number, done: boolean,
): Task {
  return { id, title, assignee, dueDate, estHours, actualHours, done };
}

function mkPhase(
  id: string, name: string, status: PhaseStatus,
  budgetedHours: number, loggedHours: number,
  assignees: string[], tasks: Task[],
): Phase {
  return { id, name, status, budgetedHours, loggedHours, assignees, tasks };
}

function getInitialPhases(projectId: string): Phase[] {
  switch (projectId) {
    case "pr1":
      return [
        mkPhase("p1-1", "Design", "complete", 40, 38, ["MO", "AV"], [
          mkTask("t1-1", "Client kick-off & scope review",        "MO", "May 05",  4,  4, true),
          mkTask("t1-2", "System design & signal flow diagram",   "AV", "May 10", 16, 16, true),
          mkTask("t1-3", "Design review sign-off",                "MO", "May 12",  2,  2, true),
        ]),
        mkPhase("p1-2", "Procurement", "complete", 20, 18, ["MO"], [
          mkTask("t2-1", "Submit equipment purchase order",       "MO", "May 14",  4,  4, true),
          mkTask("t2-2", "Confirm delivery schedule",             "MO", "May 15",  2,  2, true),
          mkTask("t2-3", "Receive & inspect all gear",            "MO", "May 24",  8,  8, true),
        ]),
        mkPhase("p1-3", "Install", "in-progress", 180, 120, ["MO", "RT"], [
          mkTask("t3-1", "Rack build & pre-wire",                 "RT", "Jun 01", 40, 40, true),
          mkTask("t3-2", "In-wall rough-in cabling",              "RT", "Jun 05", 48, 48, true),
          mkTask("t3-3", "Screen & projector mount",              "MO", "Jun 12", 16, 16, true),
          mkTask("t3-4", "Speaker placement & pull",              "MO", "Jun 18", 32, 16, false),
          mkTask("t3-5", "Control system wiring",                 "RT", "Jun 24", 24,  0, false),
        ]),
        mkPhase("p1-4", "Commission", "not-started", 100, 0, ["MO", "AV"], [
          mkTask("t4-1", "DSP programming & tuning",              "AV", "Jul 01", 40,  0, false),
          mkTask("t4-2", "Control system programming",            "AV", "Jul 05", 40,  0, false),
          mkTask("t4-3", "Client walk-through & training",        "MO", "Jul 08",  8,  0, false),
        ]),
        mkPhase("p1-5", "Closeout", "not-started", 20, 0, ["MO"], [
          mkTask("t5-1", "As-built documentation",                "MO", "Jul 09",  8,  0, false),
          mkTask("t5-2", "Final invoice & client sign-off",       "MO", "Jul 09",  4,  0, false),
        ]),
      ];

    case "pr2":
      return [
        mkPhase("p2-1", "Design", "complete", 32, 30, ["RT"], [
          mkTask("u1-1", "Site survey & infrastructure review",   "RT", "Apr 20",  8,  8, true),
          mkTask("u1-2", "System design documentation",           "RT", "Apr 25", 16, 16, true),
          mkTask("u1-3", "Facilities approval",                   "RT", "Apr 28",  2,  2, true),
        ]),
        mkPhase("p2-2", "Procurement", "in-progress", 24, 8, ["RT"], [
          mkTask("u2-1", "Submit PO — Poly Studio units",         "RT", "May 10",  4,  4, true),
          mkTask("u2-2", "Submit PO — racks & accessories",       "RT", "May 12",  4,  4, true),
          mkTask("u2-3", "Receive & inspect all equipment",       "RT", "Jun 08", 16,  0, false),
        ]),
        mkPhase("p2-3", "Install", "not-started", 200, 0, ["RT", "AV"], [
          mkTask("u3-1", "Surgical suite rough-in cabling",       "RT", "Jun 15", 80,  0, false),
          mkTask("u3-2", "Equipment mount & termination",         "AV", "Jul 01", 80,  0, false),
          mkTask("u3-3", "Network infrastructure setup",          "RT", "Jul 10", 40,  0, false),
        ]),
        mkPhase("p2-4", "Commission", "not-started", 80, 0, ["RT"], [
          mkTask("u4-1", "Video conferencing setup & testing",    "RT", "Jul 20", 48,  0, false),
          mkTask("u4-2", "Staff training sessions",               "RT", "Aug 10", 24,  0, false),
        ]),
        mkPhase("p2-5", "Closeout", "not-started", 24, 0, ["RT"], [
          mkTask("u5-1", "As-built docs & closeout package",      "RT", "Aug 21", 16,  0, false),
          mkTask("u5-2", "Final sign-off",                        "RT", "Aug 21",  4,  0, false),
        ]),
      ];

    case "pr3":
      return [
        mkPhase("p3-1", "Design", "complete", 24, 22, ["SN"], [
          mkTask("v1-1", "Smart home scope & drawings",           "SN", "Mar 22",  8,  8, true),
          mkTask("v1-2", "Lutron lighting layout",                "SN", "Mar 25",  8,  8, true),
          mkTask("v1-3", "Client approval",                       "SN", "Mar 28",  2,  2, true),
        ]),
        mkPhase("p3-2", "Install", "complete", 120, 114, ["SN", "RT"], [
          mkTask("v2-1", "In-wall cabling — main floor",          "RT", "Apr 10", 40, 40, true),
          mkTask("v2-2", "In-wall cabling — upper floor",         "RT", "Apr 18", 40, 38, true),
          mkTask("v2-3", "Equipment rack build",                  "SN", "Apr 28", 24, 24, true),
          mkTask("v2-4", "Outdoor audio pull",                    "RT", "May 05", 16, 12, true),
        ]),
        mkPhase("p3-3", "Commission", "in-progress", 72, 68, ["SN", "AV"], [
          mkTask("v3-1", "Lutron programming & scenes",           "AV", "May 20", 24, 24, true),
          mkTask("v3-2", "Control4 programming",                  "AV", "May 28", 32, 28, true),
          mkTask("v3-3", "Final client walk-through",             "SN", "Jun 18",  8,  0, false),
        ]),
        mkPhase("p3-4", "Closeout", "not-started", 20, 0, ["SN"], [
          mkTask("v4-1", "Documentation & user guide",            "SN", "Jun 19",  8,  0, false),
          mkTask("v4-2", "Final punch list & sign-off",           "SN", "Jun 19",  4,  0, false),
        ]),
      ];

    case "pr5":
      return [
        mkPhase("p5-1", "Design",      "complete", 20, 20, ["EM"],       [
          mkTask("w1-1", "Boardroom scope & layout",              "EM", "Jan 14",  8,  8, true),
          mkTask("w1-2", "Equipment selection & spec sheet",      "EM", "Jan 18",  8,  8, true),
        ]),
        mkPhase("p5-2", "Procurement", "complete", 16, 16, ["EM"],       [
          mkTask("w2-1", "Place equipment orders",                "EM", "Jan 22",  4,  4, true),
          mkTask("w2-2", "Receive & inspect gear",                "EM", "Feb 05",  8,  8, true),
        ]),
        mkPhase("p5-3", "Install",     "complete", 80, 78, ["EM", "RT"], [
          mkTask("w3-1", "Cable pull & rough-in",                 "RT", "Feb 12", 40, 38, true),
          mkTask("w3-2", "Rack build & mount",                    "RT", "Feb 20", 24, 24, true),
          mkTask("w3-3", "Display installation",                  "EM", "Feb 28", 16, 16, true),
        ]),
        mkPhase("p5-4", "Commission",  "complete", 40, 38, ["EM", "AV"], [
          mkTask("w4-1", "Crestron programming",                  "AV", "Mar 10", 24, 22, true),
          mkTask("w4-2", "Client training",                       "EM", "Mar 20",  8,  8, true),
        ]),
        mkPhase("p5-5", "Closeout",    "complete", 16, 14, ["EM"],       [
          mkTask("w5-1", "As-built docs",                         "EM", "Jun 10",  8,  8, true),
          mkTask("w5-2", "Final sign-off & invoice",              "EM", "Jun 12",  4,  4, true),
        ]),
      ];

    case "pr6":
      return [
        mkPhase("p6-1", "Design",      "complete",     40, 38, ["MO"],       [
          mkTask("x1-1", "Auditorium A/V scope",                  "MO", "Mar 05", 12, 12, true),
          mkTask("x1-2", "Rigging & sightline review",            "MO", "Mar 12", 16, 16, true),
          mkTask("x1-3", "District approval",                     "MO", "Mar 18",  4,  4, true),
        ]),
        mkPhase("p6-2", "Procurement", "complete",     32, 30, ["MO"],       [
          mkTask("x2-1", "Projector & screen PO",                 "MO", "Mar 22",  8,  8, true),
          mkTask("x2-2", "Line array speaker order",              "MO", "Mar 25",  8,  8, true),
          mkTask("x2-3", "Receive & stage equipment",             "MO", "Apr 10", 16, 14, true),
        ]),
        mkPhase("p6-3", "Install",     "in-progress", 160, 80, ["MO", "RT"], [
          mkTask("x3-1", "Stage rigging prep",                    "RT", "Apr 20", 32, 32, true),
          mkTask("x3-2", "Speaker fly & cabling",                 "RT", "May 01", 48, 48, true),
          mkTask("x3-3", "Projection & screen install",           "MO", "May 15", 32,  0, false),
          mkTask("x3-4", "Amp rack & DSP wiring",                 "RT", "Jun 01", 32,  0, false),
        ]),
        mkPhase("p6-4", "Commission",  "not-started",  60,  0, ["MO", "AV"], [
          mkTask("x4-1", "Speaker tuning & EQ",                   "AV", "Jun 20", 32,  0, false),
          mkTask("x4-2", "Projection alignment & calibration",    "MO", "Jul 01", 16,  0, false),
          mkTask("x4-3", "Staff training",                        "MO", "Jul 20",  8,  0, false),
        ]),
        mkPhase("p6-5", "Closeout",    "not-started",  24,  0, ["MO"],       [
          mkTask("x5-1", "As-built drawings & O&M manual",        "MO", "Aug 02", 16,  0, false),
          mkTask("x5-2", "Final inspection & sign-off",           "MO", "Aug 04",  4,  0, false),
        ]),
      ];

    default:
      return [];
  }
}

function getInitialFlatTasks(projectId: string): Task[] {
  switch (projectId) {
    case "pr8":
      return [
        mkTask("fw8-1", "Site walk-through & measurement",        "RT", "Jun 10",  2, 0, false),
        mkTask("fw8-2", "Rack assembly & component mounting",     "RT", "Jun 10",  6, 0, false),
        mkTask("fw8-3", "Cable management & labeling",            "RT", "Jun 10",  4, 0, false),
        mkTask("fw8-4", "System test & client sign-off",          "RT", "Jun 10",  2, 0, false),
      ];
    case "pr9":
      return [
        mkTask("fw9-1", "Pre-work site inspection",               "MO", "Jun 04",  1, 1, true),
        mkTask("fw9-2", "Projector physical alignment",           "MO", "Jun 04",  2, 0, false),
        mkTask("fw9-3", "Screen & color calibration",             "MO", "Jun 04",  1, 0, false),
      ];
    case "wo-0041":
      return [
        mkTask("wo41-1", "Assess existing DVR unit and cabling",        "RT", "May 29", 1, 1, true),
        mkTask("wo41-2", "Remove old DVR and document layout",          "RT", "May 29", 1, 1, true),
        mkTask("wo41-3", "Install and configure replacement DVR",       "RT", "May 29", 3, 3, true),
        mkTask("wo41-4", "Test all camera feeds and client sign-off",   "RT", "May 29", 1, 1, true),
      ];
    case "wo-0042":
      return [
        mkTask("wo42-1", "Review access control event log",                  "AV", "Jun 06", 1, 1, true),
        mkTask("wo42-2", "Test door controller board continuity",            "AV", "Jun 06", 1, 1, true),
        mkTask("wo42-3", "Replace faulty relay module",                      "AV", "Jun 06", 1, 0, false),
        mkTask("wo42-4", "Verify all access points and report to client",    "AV", "Jun 06", 1, 0, false),
      ];
    case "wo-0043":
      return [
        mkTask("wo43-1", "Rack mount and cable new managed switch",     "MO", "Jun 07", 3, 0, false),
        mkTask("wo43-2", "Configure VLANs per network diagram",         "MO", "Jun 07", 2, 0, false),
        mkTask("wo43-3", "Test all ports and update asset register",    "MO", "Jun 07", 1, 0, false),
      ];
    default:
      return [];
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarStack({ assignees }: { assignees: string[] }) {
  const shown = assignees.slice(0, 3);
  const overflow = Math.max(0, assignees.length - 3);
  return (
    <div className="flex items-center shrink-0">
      {shown.map((a, i) => (
        <Avatar
          key={a}
          initials={a}
          className={cn("!h-5 !w-5 !text-[8.5px] ring-1 ring-background", i > 0 && "-ml-1.5")}
        />
      ))}
      {overflow > 0 && (
        <span className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted ring-1 ring-background text-[9px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div
      className={cn(
        "grid items-center gap-x-3 px-4 py-2 text-[12px] border-t border-border/40 hover:bg-accent/20 transition-colors",
        task.done && "opacity-55",
      )}
      style={{ gridTemplateColumns: "1.25rem 1fr 8rem 5.5rem 3.5rem 3.5rem" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border transition-colors shrink-0",
          task.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary/60",
        )}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
      >
        {task.done && <Check className="h-2.5 w-2.5" />}
      </button>

      <span className={cn("truncate", task.done && "line-through text-muted-foreground")}>
        {task.title}
      </span>

      <div className="flex items-center gap-1.5 min-w-0">
        {task.assignee ? (
          <>
            <Avatar initials={task.assignee} className="!h-4 !w-4 !text-[7.5px] shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">
              {ownerNames[task.assignee]?.split(" ")[0] ?? task.assignee}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </div>

      <span className="text-[11px] text-muted-foreground">{task.dueDate}</span>

      <span className="text-right font-mono text-[11px] text-muted-foreground">
        {task.estHours > 0 ? `${task.estHours}h` : "—"}
      </span>

      <span className="text-right font-mono text-[11px] text-muted-foreground">
        {task.actualHours > 0 ? `${task.actualHours}h` : "—"}
      </span>
    </div>
  );
}

// Shared Add Task form used inside PhaseCard and WorkOrderChecklist
function AddTaskForm({
  value,
  onChange,
  onAdd,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border/40 bg-surface/30 px-4 py-2">
      <span className="h-4 w-4 shrink-0" />
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onAdd(); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Task title…"
        className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/50"
      />
      <button
        type="button"
        onClick={onAdd}
        className="flex h-6 items-center rounded bg-primary px-2.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface PhaseCardProps {
  phase: Phase;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleTask: (taskId: string) => void;
  addingTask: boolean;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  onStartAdd: () => void;
  onAdd: () => void;
  onCancelAdd: () => void;
}

function PhaseCard({
  phase,
  expanded,
  onToggleExpand,
  onToggleTask,
  addingTask,
  newTaskTitle,
  onNewTaskTitleChange,
  onStartAdd,
  onAdd,
  onCancelAdd,
}: PhaseCardProps) {
  const { label: statusLabel, cls: statusCls } = phaseStatusMeta[phase.status];
  const doneTasks = phase.tasks.filter((t) => t.done).length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Phase header — click to toggle */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="shrink-0 text-muted-foreground">
          {expanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </span>

        <span className="font-medium text-[13px] flex-1 min-w-0 truncate">{phase.name}</span>

        {/* Status badge */}
        <span className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap shrink-0",
          statusCls,
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>

        {/* Hours */}
        {phase.budgetedHours > 0 && (
          <span className="hidden sm:block text-[11px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
            {phase.loggedHours}h&thinsp;/&thinsp;{phase.budgetedHours}h
          </span>
        )}

        {/* Task count */}
        {phase.tasks.length > 0 && (
          <span className="text-[11px] text-muted-foreground shrink-0">
            {doneTasks}/{phase.tasks.length}
          </span>
        )}

        {/* Assignee stack */}
        {phase.assignees.length > 0 && (
          <AvatarStack assignees={phase.assignees} />
        )}
      </button>

      {/* Expanded task list */}
      {expanded && (
        <div className="border-t border-border/60">
          {/* Column header */}
          {phase.tasks.length > 0 && (
            <div
              className="hidden sm:grid items-center gap-x-3 px-4 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-surface/40 border-b border-border/40"
              style={{ gridTemplateColumns: "1.25rem 1fr 8rem 5.5rem 3.5rem 3.5rem" }}
            >
              <span />
              <span>Task</span>
              <span>Assignee</span>
              <span>Due</span>
              <span className="text-right">Est</span>
              <span className="text-right">Actual</span>
            </div>
          )}

          {phase.tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task.id)} />
          ))}

          {phase.tasks.length === 0 && !addingTask && (
            <p className="px-4 py-3 text-[12px] text-muted-foreground italic">No tasks yet.</p>
          )}

          {addingTask ? (
            <AddTaskForm
              value={newTaskTitle}
              onChange={onNewTaskTitleChange}
              onAdd={onAdd}
              onCancel={onCancelAdd}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStartAdd(); }}
              className="flex w-full items-center gap-1.5 px-4 py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors border-t border-border/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Work Order flat checklist ────────────────────────────────────────────────

interface WorkOrderChecklistProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  addingTask: boolean;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  onStartAdd: () => void;
  onAdd: () => void;
  onCancelAdd: () => void;
}

function WorkOrderChecklist({
  tasks,
  onToggle,
  addingTask,
  newTaskTitle,
  onNewTaskTitleChange,
  onStartAdd,
  onAdd,
  onCancelAdd,
}: WorkOrderChecklistProps) {
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Tasks
          {tasks.length > 0 && (
            <span className="ml-2 font-mono text-muted-foreground/60">
              {done}/{tasks.length} done
            </span>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {tasks.length > 0 && (
          <div
            className="hidden sm:grid items-center gap-x-3 px-4 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-surface/40 border-b border-border"
            style={{ gridTemplateColumns: "1.25rem 1fr 8rem 5.5rem 3.5rem 3.5rem" }}
          >
            <span />
            <span>Task</span>
            <span>Assignee</span>
            <span>Due</span>
            <span className="text-right">Est</span>
            <span className="text-right">Actual</span>
          </div>
        )}

        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={() => onToggle(task.id)} />
        ))}

        {tasks.length === 0 && !addingTask && (
          <p className="px-4 py-4 text-[12px] text-muted-foreground italic">No tasks yet.</p>
        )}

        {addingTask ? (
          <AddTaskForm
            value={newTaskTitle}
            onChange={onNewTaskTitleChange}
            onAdd={onAdd}
            onCancel={onCancelAdd}
          />
        ) : (
          <button
            type="button"
            onClick={onStartAdd}
            className={cn(
              "flex w-full items-center gap-1.5 px-4 py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors",
              tasks.length > 0 && "border-t border-border/40",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PhasesPanel({ projectId, projectType }: PhasesPanelProps) {
  const [phases, setPhases] = useState<Phase[]>(() => getInitialPhases(projectId));
  const [flatTasks, setFlatTasks] = useState<Task[]>(() => getInitialFlatTasks(projectId));

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const init = getInitialPhases(projectId);
    return new Set(init.length > 0 ? [init[0].id] : []);
  });

  const [addingTaskToPhase, setAddingTaskToPhase] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const counterRef = useRef(9000);
  const nextId = useCallback(() => `g${counterRef.current++}`, []);

  const toggleExpanded = useCallback((phaseId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }, []);

  const toggleTask = useCallback((phaseId: string, taskId: string) => {
    setPhases((prev) =>
      prev.map((ph) =>
        ph.id !== phaseId ? ph : {
          ...ph,
          tasks: ph.tasks.map((t) => t.id !== taskId ? t : { ...t, done: !t.done }),
        },
      ),
    );
  }, []);

  const toggleFlatTask = useCallback((taskId: string) => {
    setFlatTasks((prev) => prev.map((t) => t.id !== taskId ? t : { ...t, done: !t.done }));
  }, []);

  const commitAddTask = useCallback((phaseId: string) => {
    const title = newTaskTitle.trim();
    if (!title) { setAddingTaskToPhase(null); return; }
    setPhases((prev) =>
      prev.map((ph) =>
        ph.id !== phaseId ? ph : {
          ...ph,
          tasks: [...ph.tasks, {
            id: nextId(), title,
            assignee: "", dueDate: "—",
            estHours: 0, actualHours: 0, done: false,
          }],
        },
      ),
    );
    setNewTaskTitle("");
    setAddingTaskToPhase(null);
  }, [newTaskTitle, nextId]);

  const commitAddFlatTask = useCallback(() => {
    const title = newTaskTitle.trim();
    if (!title) { setAddingTaskToPhase(null); return; }
    setFlatTasks((prev) => [...prev, {
      id: nextId(), title,
      assignee: "", dueDate: "—",
      estHours: 0, actualHours: 0, done: false,
    }]);
    setNewTaskTitle("");
    setAddingTaskToPhase(null);
  }, [newTaskTitle, nextId]);

  const cancelAddTask = useCallback(() => {
    setAddingTaskToPhase(null);
    setNewTaskTitle("");
  }, []);

  const commitAddPhase = useCallback(() => {
    const name = newPhaseName.trim();
    if (!name) { setAddingPhase(false); return; }
    const id = nextId();
    const newPhase: Phase = {
      id, name, status: "not-started",
      budgetedHours: 0, loggedHours: 0,
      assignees: [], tasks: [],
    };
    setPhases((prev) => [...prev, newPhase]);
    setExpandedIds((prev) => new Set([...prev, id]));
    setNewPhaseName("");
    setAddingPhase(false);
  }, [newPhaseName, nextId]);

  const cancelAddPhase = useCallback(() => {
    setAddingPhase(false);
    setNewPhaseName("");
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl || templateId === "custom") return;

    const doApply = () => {
      const newPhases: Phase[] = tpl.phases.map((p) => ({
        id: nextId(),
        name: p.name,
        status: "not-started" as const,
        budgetedHours: 0,
        loggedHours: 0,
        assignees: [],
        tasks: [],
      }));
      setPhases(newPhases);
      setExpandedIds(new Set(newPhases.length > 0 ? [newPhases[0].id] : []));
    };

    if (phases.length > 0) {
      if (window.confirm("Replace current phases with this template?")) doApply();
    } else {
      doApply();
    }
  }, [phases.length, nextId]);

  // ── Work Order: flat checklist ───────────────────────────────────────────
  if (projectType === "work-order") {
    return (
      <WorkOrderChecklist
        tasks={flatTasks}
        onToggle={toggleFlatTask}
        addingTask={addingTaskToPhase === "flat"}
        newTaskTitle={newTaskTitle}
        onNewTaskTitleChange={setNewTaskTitle}
        onStartAdd={() => setAddingTaskToPhase("flat")}
        onAdd={commitAddFlatTask}
        onCancelAdd={cancelAddTask}
      />
    );
  }

  // ── Project: phase cards ─────────────────────────────────────────────────
  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks  = phases.reduce((s, p) => s + p.tasks.filter((t) => t.done).length, 0);

  return (
    <div className="px-5 py-4">
      {/* Toolbar: count + template selector */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {phases.length} phase{phases.length !== 1 ? "s" : ""}
          {totalTasks > 0 && (
            <span className="ml-2 font-mono text-muted-foreground/60">
              · {doneTasks}/{totalTasks} tasks
            </span>
          )}
        </p>

        <select
          defaultValue="none"
          onChange={(e) => {
            const val = e.target.value;
            e.target.value = "none";
            applyTemplate(val);
          }}
          className="h-6 rounded border border-border bg-surface px-2 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="none" disabled>Apply Template</option>
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Phase cards */}
      <div className="space-y-2">
        {phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            expanded={expandedIds.has(phase.id)}
            onToggleExpand={() => toggleExpanded(phase.id)}
            onToggleTask={(taskId) => toggleTask(phase.id, taskId)}
            addingTask={addingTaskToPhase === phase.id}
            newTaskTitle={newTaskTitle}
            onNewTaskTitleChange={setNewTaskTitle}
            onStartAdd={() => setAddingTaskToPhase(phase.id)}
            onAdd={() => commitAddTask(phase.id)}
            onCancelAdd={cancelAddTask}
          />
        ))}

        {/* Empty state */}
        {phases.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-[13px] font-medium text-foreground">No phases yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Apply a template above or add phases manually below.
            </p>
          </div>
        )}

        {/* Add Phase inline */}
        {addingPhase ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-card px-4 py-2.5">
            <input
              autoFocus
              type="text"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitAddPhase(); }
                if (e.key === "Escape") cancelAddPhase();
              }}
              placeholder="Phase name…"
              className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={commitAddPhase}
              className="flex h-6 items-center rounded bg-primary px-2.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Add
            </button>
            <button
              type="button"
              onClick={cancelAddPhase}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingPhase(true)}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Phase
          </button>
        )}
      </div>
    </div>
  );
}

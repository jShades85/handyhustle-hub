import { useCallback, useRef, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  Clock,
  MessageSquare,
  Package,
  Paperclip,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType =
  | "status_change"
  | "note"
  | "hours_logged"
  | "part_added"
  | "file_uploaded"
  | "member_added";

interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: string;
  text: string;
  timestamp: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActivityPanelProps {
  projectId: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

interface ActivityMeta {
  icon: LucideIcon;
  iconCls: string;
  bgCls: string;
}

const activityMeta: Record<ActivityType, ActivityMeta> = {
  status_change: { icon: ArrowRightLeft, iconCls: "text-primary",    bgCls: "bg-primary/10" },
  note:          { icon: MessageSquare,  iconCls: "text-blue-500",   bgCls: "bg-blue-500/10" },
  hours_logged:  { icon: Clock,          iconCls: "text-amber-500",  bgCls: "bg-amber-500/10" },
  part_added:    { icon: Package,        iconCls: "text-violet-500", bgCls: "bg-violet-500/10" },
  file_uploaded: { icon: Paperclip,      iconCls: "text-teal-500",   bgCls: "bg-teal-500/10" },
  member_added:  { icon: UserPlus,       iconCls: "text-green-500",  bgCls: "bg-green-500/10" },
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_ACTIVITIES: Record<string, ActivityItem[]> = {
  pr1: [
    {
      id: "a1-1",
      type: "hours_logged",
      actor: "Ravi Tate",
      text: "8 hours logged on Install phase",
      timestamp: "2h ago",
    },
    {
      id: "a1-2",
      type: "status_change",
      actor: "Maya Okafor",
      text: "Status changed from Scheduled → In Progress",
      timestamp: "Jun 2, 2026",
    },
    {
      id: "a1-3",
      type: "part_added",
      actor: "Maya Okafor",
      text: 'Part added: Samsung The Wall 110" 4K LED Display',
      timestamp: "Jun 1, 2026",
    },
    {
      id: "a1-4",
      type: "member_added",
      actor: "Maya Okafor",
      text: "Team member added: Aman Verma (Field Tech)",
      timestamp: "May 28, 2026",
    },
    {
      id: "a1-5",
      type: "note",
      actor: "Ravi Tate",
      text: "Checked in with client. Window treatments are being installed next week — may delay access to the south wall. Will coordinate with their GC before scheduling the display rough-in.",
      timestamp: "May 22, 2026",
    },
    {
      id: "a1-6",
      type: "file_uploaded",
      actor: "Maya Okafor",
      text: "File uploaded: penthouse-signal-flow-v2.pdf",
      timestamp: "May 10, 2026",
    },
  ],
  pr2: [
    {
      id: "a2-1",
      type: "status_change",
      actor: "Jess Kim",
      text: "Status changed from Quoted → Scheduled",
      timestamp: "May 30, 2026",
    },
    {
      id: "a2-2",
      type: "note",
      actor: "Jess Kim",
      text: "Client confirmed install window: June 9–13. Site access through the service elevator only — coordinate with building management 48 hrs in advance.",
      timestamp: "May 29, 2026",
    },
    {
      id: "a2-3",
      type: "member_added",
      actor: "Jess Kim",
      text: "Team member added: Aman Verma (Lead Tech)",
      timestamp: "May 27, 2026",
    },
  ],
  pr3: [
    {
      id: "a3-1",
      type: "hours_logged",
      actor: "Eli Moreno",
      text: "6 hours logged on rough-in",
      timestamp: "Jun 3, 2026",
    },
    {
      id: "a3-2",
      type: "status_change",
      actor: "Eli Moreno",
      text: "Status changed from Scheduled → In Progress",
      timestamp: "Jun 1, 2026",
    },
  ],
  pr5: [
    {
      id: "a5-1",
      type: "status_change",
      actor: "Sofia Nakamura",
      text: "Status changed from In Progress → On Hold",
      timestamp: "May 20, 2026",
    },
    {
      id: "a5-2",
      type: "note",
      actor: "Sofia Nakamura",
      text: "Project on hold per client request — owner traveling through June. Will re-engage first week of July.",
      timestamp: "May 20, 2026",
    },
  ],
};

function getDefaultActivity(projectId: string): ActivityItem[] {
  return [
    {
      id: `adef-${projectId}-1`,
      type: "status_change",
      actor: "System",
      text: "Project record created",
      timestamp: "May 2026",
    },
  ];
}

function getInitialActivity(projectId: string): ActivityItem[] {
  return SEED_ACTIVITIES[projectId] ?? getDefaultActivity(projectId);
}

function nameToInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function nowLabel(): string {
  return "Just now";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const { icon: Icon, iconCls, bgCls } = activityMeta[item.type];
  const initials = nameToInitials(item.actor);

  return (
    <li className="flex gap-3 py-3 border-b border-border/40 last:border-0">
      {/* Icon column */}
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          bgCls,
        )}
      >
        <Icon className={cn("h-3 w-3", iconCls)} />
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {item.type === "note" ? (
          <>
            <p className="text-[12.5px]">
              <span className="font-medium">{item.actor}</span>
              <span className="text-muted-foreground"> added a note</span>
            </p>
            <blockquote className="mt-1.5 rounded-md border-l-2 border-blue-400/50 bg-blue-500/5 py-2 pl-3 pr-2 text-[12px] text-foreground/80 leading-relaxed">
              {item.text}
            </blockquote>
          </>
        ) : (
          <p className="text-[12.5px]">
            <span className="font-medium">{item.actor}</span>
            {" "}
            <span className="text-muted-foreground">{item.text}</span>
          </p>
        )}
        <p className="mt-1 flex items-center gap-1.5 text-[10.5px] font-mono text-muted-foreground/60">
          <Avatar initials={initials} className="!h-3.5 !w-3.5 !text-[7px] shrink-0" />
          {item.timestamp}
        </p>
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityPanel({ projectId }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    getInitialActivity(projectId),
  );
  const [noteText, setNoteText] = useState("");

  const counterRef = useRef(9000);
  const nextId = useCallback(() => `a-gen-${counterRef.current++}`, []);

  const submitNote = useCallback(() => {
    const text = noteText.trim();
    if (!text) return;
    const newItem: ActivityItem = {
      id: nextId(),
      type: "note",
      actor: "You",
      text,
      timestamp: nowLabel(),
    };
    setActivities((prev) => [newItem, ...prev]);
    setNoteText("");
  }, [noteText, nextId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitNote();
      }
    },
    [submitNote],
  );

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Add Note */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <textarea
          rows={3}
          placeholder="Add a note… (⌘ + Enter to submit)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] text-muted-foreground/50">⌘ + Enter to submit</span>
          <button
            type="button"
            onClick={submitNote}
            disabled={!noteText.trim()}
            className="h-7 rounded-md bg-primary px-3.5 text-[12px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Activity feed */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Activity
          <span className="ml-2 font-mono text-muted-foreground/60">{activities.length}</span>
        </p>
        <ul className="rounded-lg border border-border bg-card px-4">
          {activities.map((item) => (
            <ActivityItemRow key={item.id} item={item} />
          ))}
        </ul>
      </div>

      {/* Load more stub */}
      <div className="flex justify-center pb-2">
        <button
          type="button"
          onClick={() => { /* stub */ }}
          className="text-[11.5px] text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          Load earlier activity
        </button>
      </div>
    </div>
  );
}

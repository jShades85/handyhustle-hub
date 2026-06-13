import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { activityItems, requestItems } from "@/data/inbox-data";
import type { ActivityCategory, RequestBadgeType } from "@/data/inbox-data";
import {
  FileText, Receipt, Briefcase, Package, Calendar,
  CheckCircle2, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Inbox · BearingPro" }] }),
  component: InboxPage,
});

// ─── Display metadata (display-layer only, not shared) ───────────────────────

const categoryMeta: Record<ActivityCategory, { icon: typeof FileText; border: string; iconColor: string }> = {
  quote:     { icon: FileText,  border: "border-l-blue-500",   iconColor: "text-blue-500"   },
  invoice:   { icon: Receipt,   border: "border-l-green-500",  iconColor: "text-green-500"  },
  project:   { icon: Briefcase, border: "border-l-purple-500", iconColor: "text-purple-500" },
  inventory: { icon: Package,   border: "border-l-orange-500", iconColor: "text-orange-500" },
  schedule:  { icon: Calendar,  border: "border-l-yellow-500", iconColor: "text-yellow-500" },
};

const badgeStyle: Record<RequestBadgeType, string> = {
  "Inventory Pull":  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "Quote Approval":  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Purchase Order":  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Schedule Change": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
};

// ─── Page ────────────────────────────────────────────────────────────────────

function InboxPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Inbox" }); }, [setMeta]);

  return (
    <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
      <section>
        <div className="mb-3 px-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">Requests</div>
        <RequestsPanel />
      </section>
      <section>
        <div className="mb-3 px-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">Activity</div>
        <ActivityFeed />
      </section>
    </div>
  );
}

// ─── Activity Feed panel ──────────────────────────────────────────────────────

function ActivityFeed() {
  return (
    <ul className="space-y-3">
        {activityItems.map((item) => {
          const { icon: Icon, border, iconColor } = categoryMeta[item.category];
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 border-l-2 min-h-[72px]",
                border,
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium">{item.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
              </div>
              <span className="shrink-0 font-mono text-2xs text-muted-foreground">{item.time}</span>
            </li>
          );
        })}
    </ul>
  );
}

// ─── Requests panel ───────────────────────────────────────────────────────────

type RequestStatus = "pending" | "complete" | "flagged";

type RequestCardState = {
  status: RequestStatus;
  flagNoteOpen: boolean;
  flagNote: string;
};

function RequestsPanel() {
  const [states, setStates] = useState<Record<number, RequestCardState>>(() =>
    Object.fromEntries(
      requestItems.map((r) => [r.id, { status: "pending", flagNoteOpen: false, flagNote: "" }]),
    ),
  );

  const update = (id: number, patch: Partial<RequestCardState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <div className="space-y-3">
      {requestItems.map((req) => {
        const s = states[req.id];
        const done = s.status !== "pending";
        return (
          <div
            key={req.id}
            className={cn(
              "flex flex-col rounded-lg border border-border bg-card p-4 transition-opacity min-h-[156px]",
              done && "opacity-50",
            )}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-2xs font-semibold mb-1.5", badgeStyle[req.badge])}>
                  {req.badge}
                </span>
                <div className="text-base font-medium leading-snug">{req.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{req.description}</div>
              </div>
              {s.status === "complete" && (
                <span className="shrink-0 flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-2xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> Complete
                </span>
              )}
              {s.status === "flagged" && (
                <span className="shrink-0 flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-2xs font-medium text-destructive">
                  <Flag className="h-3 w-3" /> Issue Flagged
                </span>
              )}
            </div>

            {/* Requester + actions */}
            <div className="mt-auto pt-3 flex items-center gap-3">
              <Avatar initials={req.initials} />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{req.requester}</span>
                <span className="text-2xs text-muted-foreground">{req.time}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  disabled={done}
                  onClick={() => update(req.id, { status: "complete", flagNoteOpen: false })}
                  className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3 w-3" /> Mark Complete
                </button>
                <button
                  disabled={done}
                  onClick={() => update(req.id, { flagNoteOpen: !s.flagNoteOpen })}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-destructive/50 bg-transparent px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Flag className="h-3 w-3" /> Flag Issue
                </button>
              </div>
            </div>

            {/* Inline flag note */}
            {s.flagNoteOpen && !done && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={s.flagNote}
                  onChange={(e) => update(req.id, { flagNote: e.target.value })}
                  placeholder="Describe the issue…"
                  rows={2}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => update(req.id, { flagNoteOpen: false, flagNote: "" })}
                    className="h-7 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => update(req.id, { status: "flagged", flagNoteOpen: false })}
                    className="h-7 px-3 rounded-md bg-destructive text-xs font-medium text-destructive-foreground hover:opacity-90"
                  >
                    Submit Flag
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

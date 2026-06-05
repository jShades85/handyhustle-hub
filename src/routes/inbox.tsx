import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tab, Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import {
  FileText, Receipt, Briefcase, Package, Calendar,
  CheckCircle2, AlertTriangle, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Inbox · Port City Sound & Security" }] }),
  component: InboxPage,
});

// ─── Activity Feed ───────────────────────────────────────────────────────────

type ActivityCategory = "quote" | "invoice" | "project" | "inventory" | "schedule";

type ActivityItem = {
  id: number;
  category: ActivityCategory;
  title: string;
  description: string;
  time: string;
};

const categoryMeta: Record<ActivityCategory, { icon: typeof FileText; border: string; iconColor: string }> = {
  quote:     { icon: FileText,  border: "border-l-blue-500",   iconColor: "text-blue-500"   },
  invoice:   { icon: Receipt,   border: "border-l-green-500",  iconColor: "text-green-500"  },
  project:   { icon: Briefcase, border: "border-l-purple-500", iconColor: "text-purple-500" },
  inventory: { icon: Package,   border: "border-l-orange-500", iconColor: "text-orange-500" },
  schedule:  { icon: Calendar,  border: "border-l-yellow-500", iconColor: "text-yellow-500" },
};

const activityItems: ActivityItem[] = [
  { id: 1, category: "quote",     title: "Quote #1042 accepted",                           description: "Harborview Hotel accepted the lobby AV proposal — $76,400.",          time: "12m ago"  },
  { id: 2, category: "invoice",   title: "Invoice #887 paid",                              description: "$12,400 received from Riverside Medical Center.",                      time: "1h ago"   },
  { id: 3, category: "schedule",  title: "Site visit scheduled — June 10",                 description: "Riverside Medical: pre-install walkthrough confirmed with Damon Reyes.", time: "2h ago"   },
  { id: 4, category: "project",   title: "Project moved to In Progress",                   description: "Harborview AV Install (AV-2026-014) phase updated by Marcus Bell.",     time: "3h ago"   },
  { id: 5, category: "inventory", title: "Low stock alert: Cat6 Cable",                    description: "23 ft remaining. Reorder threshold is 100 ft. Vendor: Anixter.",        time: "5h ago"   },
  { id: 6, category: "quote",     title: "Quote #1038 viewed by client",                   description: "Helio Health Systems opened Q-2026-0412 ($148,000) — first view.",      time: "Yesterday" },
  { id: 7, category: "project",   title: "Budget burn-rate alert",                         description: "Downtown Office Retrofit (AV-2026-009) spent 88% of budget at 71% complete.", time: "Yesterday" },
  { id: 8, category: "invoice",   title: "Invoice #881 overdue",                           description: "Pinecrest Hospitality owes $34,200 — 12 days past due.",                time: "2d ago"   },
];

// ─── Requests ────────────────────────────────────────────────────────────────

type RequestStatus = "pending" | "complete" | "flagged";

type RequestBadgeType = "Inventory Pull" | "Quote Approval" | "Purchase Order" | "Schedule Change";

type Request = {
  id: number;
  badge: RequestBadgeType;
  title: string;
  description: string;
  requester: string;
  initials: string;
  time: string;
};

const badgeStyle: Record<RequestBadgeType, string> = {
  "Inventory Pull":  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "Quote Approval":  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Purchase Order":  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Schedule Change": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
};

const requestItems: Request[] = [
  {
    id: 1,
    badge: "Inventory Pull",
    title: "Cable & hardware pull — Harborview AV Install",
    description: "Need 200 ft Cat6, 4x wall plates, and 2x HDMI wall brackets staged by June 9.",
    requester: "Marcus Bell",
    initials: "MB",
    time: "30m ago",
  },
  {
    id: 2,
    badge: "Quote Approval",
    title: "Owner approval on Riverside Medical quote",
    description: "Q-2026-0421 totals $84,200. Margin at 38%. Client deadline is June 12.",
    requester: "Audrey Chen",
    initials: "AC",
    time: "2h ago",
  },
  {
    id: 3,
    badge: "Purchase Order",
    title: "Axis camera order — 8 units for Northbeam project",
    description: "8x Axis P3245-V cameras from Anixter at $610/unit. Total PO: $4,880.",
    requester: "Damon Reyes",
    initials: "DR",
    time: "4h ago",
  },
  {
    id: 4,
    badge: "Schedule Change",
    title: "Reschedule June 8 site visit — Riverside Medical",
    description: "Tech has a van maintenance conflict. Requesting to move to June 10 AM.",
    requester: "Iris Wang",
    initials: "IW",
    time: "Yesterday",
  },
  {
    id: 5,
    badge: "Inventory Pull",
    title: "Rack equipment pull — Downtown Office Retrofit",
    description: "1x Middle Atlantic rack, 2x Crestron MX-150, patch panel, and 1U blank panels.",
    requester: "Marcus Bell",
    initials: "MB",
    time: "2d ago",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

function InboxPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Inbox" }); }, [setMeta]);

  const [activeTab, setActiveTab] = useState<"activity" | "requests">("activity");

  return (
    <div>
      <div className="border-b border-border px-5 pt-3 pb-0 flex gap-1">
        <Tab active={activeTab === "activity"} onClick={() => setActiveTab("activity")}>Activity</Tab>
        <Tab active={activeTab === "requests"} onClick={() => setActiveTab("requests")}>Requests</Tab>
      </div>

      {activeTab === "activity" ? <ActivityFeed /> : <RequestsPanel />}
    </div>
  );
}

// ─── Activity Feed panel ──────────────────────────────────────────────────────

function ActivityFeed() {
  return (
    <div className="p-4 max-w-3xl">
      <ul className="space-y-2">
        {activityItems.map((item) => {
          const { icon: Icon, border, iconColor } = categoryMeta[item.category];
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 border-l-2",
                border,
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{item.title}</div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">{item.description}</div>
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{item.time}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Requests panel ───────────────────────────────────────────────────────────

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
    <div className="p-4 max-w-3xl space-y-3">
      {requestItems.map((req) => {
        const s = states[req.id];
        const done = s.status !== "pending";
        return (
          <div
            key={req.id}
            className={cn(
              "rounded-lg border border-border bg-card p-4 transition-opacity",
              done && "opacity-50",
            )}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold mb-1.5", badgeStyle[req.badge])}>
                  {req.badge}
                </span>
                <div className="text-[13px] font-medium leading-snug">{req.title}</div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">{req.description}</div>
              </div>
              {/* Status pill */}
              {s.status === "complete" && (
                <span className="shrink-0 flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-[10.5px] font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> Complete
                </span>
              )}
              {s.status === "flagged" && (
                <span className="shrink-0 flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-[10.5px] font-medium text-destructive">
                  <Flag className="h-3 w-3" /> Issue Flagged
                </span>
              )}
            </div>

            {/* Requester + actions */}
            <div className="mt-3 flex items-center gap-3">
              <Avatar initials={req.initials} />
              <div className="flex flex-col leading-tight">
                <span className="text-[12px] font-medium">{req.requester}</span>
                <span className="text-[10.5px] text-muted-foreground">{req.time}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  disabled={done}
                  onClick={() => update(req.id, { status: "complete", flagNoteOpen: false })}
                  className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[11.5px] font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3 w-3" /> Mark Complete
                </button>
                <button
                  disabled={done}
                  onClick={() => update(req.id, { flagNoteOpen: !s.flagNoteOpen })}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-destructive/50 bg-transparent px-2.5 text-[11.5px] font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => update(req.id, { flagNoteOpen: false, flagNote: "" })}
                    className="h-7 px-3 rounded-md border border-border text-[11.5px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => update(req.id, { status: "flagged", flagNoteOpen: false })}
                    className="h-7 px-3 rounded-md bg-destructive text-[11.5px] font-medium text-destructive-foreground hover:opacity-90"
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

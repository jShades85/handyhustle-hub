export type ActivityCategory = "quote" | "invoice" | "project" | "inventory" | "schedule";

export type ActivityItem = {
  id: number;
  category: ActivityCategory;
  title: string;
  description: string;
  time: string;
};

export const activityItems: ActivityItem[] = [
  { id: 1, category: "quote",     title: "Quote #1042 accepted",             description: "Harborview Hotel accepted the lobby AV proposal — $76,400.",                          time: "12m ago"   },
  { id: 2, category: "invoice",   title: "Invoice #887 paid",                description: "$12,400 received from Riverside Medical Center.",                                      time: "1h ago"    },
  { id: 3, category: "schedule",  title: "Site visit scheduled — June 10",   description: "Riverside Medical: pre-install walkthrough confirmed with Damon Reyes.",               time: "2h ago"    },
  { id: 4, category: "project",   title: "Project moved to In Progress",     description: "Harborview AV Install (AV-2026-014) phase updated by Marcus Bell.",                    time: "3h ago"    },
  { id: 5, category: "inventory", title: "Low stock alert: Cat6 Cable",      description: "23 ft remaining. Reorder threshold is 100 ft. Vendor: Anixter.",                      time: "5h ago"    },
  { id: 6, category: "quote",     title: "Quote #1038 viewed by client",     description: "Helio Health Systems opened Q-2026-0412 ($148,000) — first view.",                    time: "Yesterday" },
  { id: 7, category: "project",   title: "Budget burn-rate alert",           description: "Downtown Office Retrofit (AV-2026-009) spent 88% of budget at 71% complete.",         time: "Yesterday" },
  { id: 8, category: "invoice",   title: "Invoice #881 overdue",             description: "Pinecrest Hospitality owes $34,200 — 12 days past due.",                              time: "2d ago"    },
];

export type RequestBadgeType = "Inventory Pull" | "Quote Approval" | "Purchase Order" | "Schedule Change";

export type Request = {
  id: number;
  badge: RequestBadgeType;
  title: string;
  description: string;
  requester: string;
  initials: string;
  time: string;
};

export const requestItems: Request[] = [
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

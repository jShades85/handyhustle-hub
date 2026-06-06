import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import { BarChart2, GanttChart, Users2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/planner/")({
  head: () => ({ meta: [{ title: "Planner · Crosscurrent" }] }),
  component: PlannerPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "gantt" | "resource" | "capacity";

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
  description: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  {
    id: "gantt",
    label: "Gantt",
    icon: GanttChart,
    description: "Timeline view across all active projects — available once projects have scheduled phases",
  },
  {
    id: "resource",
    label: "Resource View",
    icon: Users2,
    description: "See who is assigned to what and when — available once team assignments are active",
  },
  {
    id: "capacity",
    label: "Capacity",
    icon: BarChart2,
    description: "Track budgeted vs committed hours across your team — available once time tracking is live",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function PlannerPage() {
  const { setMeta } = useMeta();
  const [tab, setTab] = useState<TabId>("gantt");

  useEffect(() => {
    setMeta({ title: "Planner", subtitle: "Operations" });
  }, [setMeta]);

  const active = TABS.find((t) => t.id === tab)!;
  const Icon = active.icon;

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative h-9 rounded-md px-2.5 text-[12.5px] transition-colors",
              tab === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <Icon className="h-9 w-9 text-muted-foreground/30 mb-3" />
        <p className="text-[13px] font-medium">{active.label}</p>
        <p className="mt-1.5 max-w-sm text-[12px] text-muted-foreground leading-relaxed">
          {active.description}
        </p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { projects, phaseLabels, currency, ownerNames } from "@/lib/demo-data";
import { Tab, Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus, Calendar } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects · Crosscurrent" }] }),
  component: ProjectsPage,
});

const phaseColor: Record<string, string> = {
  design: "bg-status-lead/20 text-status-lead",
  procurement: "bg-status-qualified/20 text-status-qualified",
  install: "bg-status-proposal/20 text-status-proposal",
  commission: "bg-chart-4/20 text-chart-4",
  closeout: "bg-status-won/20 text-status-won",
};

function ProjectsPage() {
  const { setMeta } = useMeta();
  useEffect(() => {
    setMeta({
      title: "Projects",
      subtitle: "6 active · $752,200 in flight",
      onNew: () => console.log("New project"),
      newLabel: "New Project",
    });
  }, [setMeta]);

  return (
    <div>
      <div className="p-4 space-y-3">
        {projects.map((p) => {
          const spentPct = (p.spent / p.budget) * 100;
          const over = spentPct > p.progress + 10;
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] text-muted-foreground">{p.code}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${phaseColor[p.phase]}`}>{phaseLabels[p.phase]}</span>
                    {over && <span className="rounded bg-priority-urgent/20 text-priority-urgent px-1.5 py-0.5 text-[10px] font-medium">Burn-rate high</span>}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold">{p.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">{p.company}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Budget</div>
                    <div className="font-mono tabular-nums text-[13px] font-semibold">{currency(p.budget)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Spent</div>
                    <div className="font-mono tabular-nums text-[13px]">{currency(p.spent)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Due</div>
                    <div className="text-[12px] inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.due}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Avatar initials={p.pm} />
                    <span className="text-[11.5px] text-muted-foreground">{ownerNames[p.pm].split(" ")[0]}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-mono">{p.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                  <div className="h-full bg-primary/30" style={{ width: `${Math.max(0, spentPct - p.progress)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

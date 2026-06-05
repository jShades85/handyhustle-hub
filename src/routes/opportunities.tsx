import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { deals, stages, currency } from "@/lib/demo-data";
import { Tab, StageChip, Avatar, PriorityDot } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, ArrowDownUp, LayoutGrid, List, Plus } from "lucide-react";

export const Route = createFileRoute("/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities · Crosscurrent" }] }),
  component: Opportunities,
});

function Opportunities() {
  const { setMeta } = useMeta();
  useEffect(() => {
    setMeta({
      title: "Opportunities",
      subtitle: "12 deals · $1,848,800 pipeline",
      onNew: () => console.log("New opportunity"),
      newLabel: "New Opportunity",
    });
  }, [setMeta]);

  const [view, setView] = useState<"board" | "list">("board");

  return (
    <div>

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto p-4">
          {stages.map((s) => {
            const items = deals.filter((d) => d.stage === s.id);
            const total = items.reduce((sum, d) => sum + d.value, 0);
            return (
              <div key={s.id} className="w-[300px] shrink-0 rounded-lg border border-border bg-surface/40">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StageChip stage={s.id} />
                    <span className="font-mono text-[10.5px] text-muted-foreground">{items.length}</span>
                  </div>
                  <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{currency(total)}</span>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {items.map((d) => (
                    <div key={d.id} className="group rounded-md border border-border bg-card p-3 hover:border-primary/40 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between text-[10.5px] text-muted-foreground font-mono">
                        <span>{d.id}</span>
                        <PriorityDot p={d.priority} />
                      </div>
                      <div className="mt-1 text-[12.5px] font-medium leading-snug">{d.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground truncate">{d.company}</div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="font-mono tabular-nums text-[12px] font-semibold">{currency(d.value)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] text-muted-foreground">{d.closeDate}</span>
                          <Avatar initials={d.owner} />
                        </div>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary/70" style={{ width: `${d.probability}%` }} />
                      </div>
                    </div>
                  ))}
                  <button className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-3">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium py-2 w-16">ID</th>
                <th className="text-left font-medium py-2">Title</th>
                <th className="text-left font-medium py-2">Company</th>
                <th className="text-left font-medium py-2">Stage</th>
                <th className="text-left font-medium py-2">Priority</th>
                <th className="text-right font-medium py-2">Value</th>
                <th className="text-left font-medium py-2 pl-3">Close</th>
                <th className="text-left font-medium py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="row-hover border-b border-border/60">
                  <td className="py-2 font-mono text-[10.5px] text-muted-foreground">{d.id}</td>
                  <td className="py-2 font-medium">{d.title}</td>
                  <td className="py-2 text-muted-foreground">{d.company}</td>
                  <td className="py-2"><StageChip stage={d.stage} /></td>
                  <td className="py-2"><PriorityDot p={d.priority} /></td>
                  <td className="py-2 font-mono tabular-nums text-right">{currency(d.value)}</td>
                  <td className="py-2 pl-3 text-muted-foreground">{d.closeDate}</td>
                  <td className="py-2"><Avatar initials={d.owner} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

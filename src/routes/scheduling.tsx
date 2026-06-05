import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { workOrders, ownerNames } from "@/lib/demo-data";
import { Tab, Avatar, PriorityDot } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/scheduling")({
  head: () => ({ meta: [{ title: "Scheduling · Crosscurrent" }] }),
  component: Scheduling,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 11 }, (_, i) => i + 7); // 7am - 5pm

const typeColor: Record<string, string> = {
  install: "border-l-primary bg-primary/10",
  service: "border-l-chart-2 bg-chart-2/10",
  "site-visit": "border-l-chart-4 bg-chart-4/10",
  training: "border-l-status-won bg-status-won/10",
};

function Scheduling() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Scheduling" }); }, [setMeta]);

  const byDay = days.map((_, dayIdx) =>
    workOrders.filter((w) => {
      const d = new Date(w.start);
      const wd = (d.getDay() + 6) % 7;
      return wd === dayIdx;
    }),
  );

  return (
    <div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[920px] rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-surface">
            <div />
            {days.map((d, i) => (
              <div key={d} className="px-3 py-2 text-[11px] font-medium text-muted-foreground border-l border-border">
                {d} <span className="text-foreground ml-1">{new Date(Date.now() + ((i - ((new Date().getDay() + 6) % 7)) * 86400000)).getDate()}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
            <div className="border-r border-border">
              {hours.map((h) => (
                <div key={h} className="h-14 px-2 text-[10px] text-muted-foreground font-mono pt-1 border-b border-border/40">{h}:00</div>
              ))}
            </div>
            {byDay.map((items, i) => (
              <div key={i} className="relative border-l border-border">
                {hours.map((h) => <div key={h} className="h-14 border-b border-border/40" />)}
                {items.map((w) => {
                  const start = new Date(w.start);
                  const end = new Date(w.end);
                  const top = ((start.getHours() + start.getMinutes() / 60) - 7) * 56;
                  const height = ((end.getTime() - start.getTime()) / 3600000) * 56 - 2;
                  return (
                    <div
                      key={w.id}
                      className={`absolute left-1 right-1 rounded-md border-l-2 px-2 py-1 text-[10.5px] cursor-pointer ${typeColor[w.type]}`}
                      style={{ top, height }}
                    >
                      <div className="flex items-center justify-between">
                        <PriorityDot p={w.priority} />
                        <Avatar initials={w.tech} className="!h-4 !w-4 !text-[8px]" />
                      </div>
                      <div className="mt-0.5 font-medium leading-tight truncate text-foreground">{w.title}</div>
                      <div className="text-[9.5px] text-muted-foreground truncate">{w.address}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/40 border-l-2 border-primary" /> Install</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-2/40 border-l-2 border-chart-2" /> Service</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-4/40 border-l-2 border-chart-4" /> Site visit</div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-status-won/40 border-l-2 border-status-won" /> Training</div>
          <div className="ml-auto flex items-center gap-3">
            {Object.entries(ownerNames).slice(0,5).map(([id, name]) => (
              <div key={id} className="flex items-center gap-1.5"><Avatar initials={id} /> <span>{name.split(" ")[0]}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

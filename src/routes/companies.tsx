import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { companies, currency } from "@/lib/demo-data";
import { Tab } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus, Building2, MapPin } from "lucide-react";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Companies · Crosscurrent" }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Companies" }); }, [setMeta]);

  return (
    <div>
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <div key={c.id} className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary/30 to-chart-2/30 border border-border">
                <Building2 className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.industry}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {c.city}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Open</div>
                <div className="text-[13px] font-semibold tabular-nums">{currency(c.openValue)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Contacts</div>
                <div className="text-[13px] font-semibold">{c.contacts}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Size</div>
                <div className="text-[13px] font-semibold">{c.size}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

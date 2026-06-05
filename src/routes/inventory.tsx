import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { catalog, currency } from "@/lib/demo-data";
import { Tab } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus, AlertTriangle, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Crosscurrent" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Parts & Materials" }); }, [setMeta]);

  const physical = catalog.filter((c) => c.category !== "Labor");
  const totalValue = physical.reduce((s, c) => s + c.cost * c.stock, 0);
  const lowStock = physical.filter((c) => c.stock <= 4);

  return (
    <div>
      <div className="p-4 grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground bg-surface/50">
              <tr className="border-b border-border">
                <th className="text-left font-medium py-2 px-3">SKU</th>
                <th className="text-left font-medium py-2">Item</th>
                <th className="text-right font-medium py-2">On hand</th>
                <th className="text-right font-medium py-2">Unit cost</th>
                <th className="text-right font-medium py-2 pr-3">Ext. value</th>
              </tr>
            </thead>
            <tbody>
              {physical.map((i) => {
                const low = i.stock <= 4;
                return (
                  <tr key={i.id} className="row-hover border-b border-border/60">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{i.sku}</td>
                    <td className="py-2.5">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-[10.5px] text-muted-foreground">{i.vendor} · {i.category}</div>
                    </td>
                    <td className={`py-2.5 text-right font-mono tabular-nums ${low ? "text-priority-urgent" : ""}`}>
                      {low && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                      {i.stock}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-muted-foreground">{currency(i.cost)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-medium">{currency(i.cost * i.stock)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-priority-urgent" /> Low stock alerts
            </div>
            <ul className="mt-3 space-y-2.5 text-[12px]">
              {lowStock.map((i) => (
                <li key={i.id} className="flex items-start gap-2">
                  <Package className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{i.name}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">{i.sku}</div>
                  </div>
                  <span className="rounded bg-priority-urgent/15 text-priority-urgent px-1.5 py-0.5 text-[10.5px] font-mono">{i.stock} left</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[12px] font-medium mb-3">Recent movements</div>
            <ul className="space-y-2 text-[11.5px]">
              {[
                { type: "out", item: "CRE-MX-150", qty: 2, project: "AV-2026-014" },
                { type: "in", item: "POL-X70", qty: 4, project: "PO-1182" },
                { type: "out", item: "MID-CAB-44U", qty: 1, project: "AV-2026-009" },
                { type: "in", item: "EXT-DTP3-T", qty: 8, project: "PO-1180" },
              ].map((m, i) => (
                <li key={i} className="flex items-center gap-2">
                  {m.type === "in"
                    ? <ArrowDownToLine className="h-3 w-3 text-status-won" />
                    : <ArrowUpFromLine className="h-3 w-3 text-status-qualified" />}
                  <span className="font-mono text-[10.5px]">{m.item}</span>
                  <span className="text-muted-foreground ml-auto font-mono">{m.type === "in" ? "+" : "−"}{m.qty}</span>
                  <span className="text-muted-foreground text-[10.5px]">{m.project}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

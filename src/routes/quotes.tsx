import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { quotes, currency, catalog } from "@/lib/demo-data";
import { Tab } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus, FileText, Eye, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/quotes")({
  head: () => ({ meta: [{ title: "Quotes · Crosscurrent" }] }),
  component: QuotesPage,
});

const statusStyle = {
  draft: { icon: FileText, cls: "text-muted-foreground" },
  sent: { icon: Clock, cls: "text-status-qualified" },
  viewed: { icon: Eye, cls: "text-status-proposal" },
  accepted: { icon: CheckCircle2, cls: "text-status-won" },
  expired: { icon: XCircle, cls: "text-status-lost" },
} as const;

function QuotesPage() {
  const { setMeta } = useMeta();
  useEffect(() => {
    setMeta({
      title: "Quotes & Estimates",
      onNew: () => console.log("New quote"),
      newLabel: "New Quote",
    });
  }, [setMeta]);

  // Featured quote detail (Boardroom AV refresh)
  const featured = quotes[0];
  const lineItems = [
    { ...catalog[0], qty: 2 },
    { ...catalog[10], qty: 1 },
    { ...catalog[3], qty: 4 },
    { ...catalog[4], qty: 6 },
    { ...catalog[8], qty: 8 },
    { ...catalog[11], qty: 32 }, // labor hours
  ];
  const subtotal = lineItems.reduce((s, l) => s + l.price * l.qty, 0);
  const cost = lineItems.reduce((s, l) => s + l.cost * l.qty, 0);
  const margin = ((subtotal - cost) / subtotal) * 100;

  return (
    <div>
      <div className="grid lg:grid-cols-[1fr_440px] gap-0">
        <div className="px-4 py-3 border-r border-border">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium py-2">Number</th>
                <th className="text-left font-medium py-2">Project</th>
                <th className="text-left font-medium py-2">Company</th>
                <th className="text-left font-medium py-2">Status</th>
                <th className="text-right font-medium py-2">Margin</th>
                <th className="text-right font-medium py-2">Total</th>
                <th className="text-right font-medium py-2 pr-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const s = statusStyle[q.status];
                return (
                  <tr key={q.id} className="row-hover border-b border-border/60">
                    <td className="py-2.5 font-mono text-[11px]">{q.number}</td>
                    <td className="py-2.5 font-medium">{q.project}</td>
                    <td className="py-2.5 text-muted-foreground">{q.company}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-[11.5px] capitalize ${s.cls}`}>
                        <s.icon className="h-3 w-3" /> {q.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{q.margin}%</td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{currency(q.total)}</td>
                    <td className="py-2.5 pr-2 text-right text-muted-foreground">{q.sent}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quote detail */}
        <aside className="bg-surface/40">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">{featured.number}</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-status-qualified/15 px-2 py-0.5 text-[10.5px] font-medium text-status-qualified">
                <Clock className="h-3 w-3" /> Sent
              </span>
            </div>
            <h2 className="mt-2 text-[15px] font-semibold tracking-tight">{featured.project}</h2>
            <div className="text-[11.5px] text-muted-foreground">{featured.company}</div>
          </div>
          <div className="px-5 py-3 max-h-[480px] overflow-y-auto">
            <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-2">Line items</div>
            <ul className="space-y-0">
              {lineItems.map((l, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 border-b border-border/50 text-[12px]">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.name}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">{l.sku} · {l.vendor}</div>
                  </div>
                  <div className="text-right text-muted-foreground font-mono text-[11px] tabular-nums">×{l.qty}</div>
                  <div className="text-right font-mono tabular-nums w-20">{currency(l.price * l.qty)}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border px-5 py-4 space-y-2 text-[12px]">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono tabular-nums">{currency(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Cost</span><span className="font-mono tabular-nums">{currency(cost)}</span></div>
            <div className="flex justify-between"><span>Gross margin</span><span className="font-mono tabular-nums text-status-won">{margin.toFixed(1)}%</span></div>
            <div className="flex justify-between border-t border-border pt-2 mt-2 text-[14px] font-semibold"><span>Total</span><span className="font-mono tabular-nums">{currency(subtotal)}</span></div>
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-medium">Send to client</button>
            <button className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]">PDF</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

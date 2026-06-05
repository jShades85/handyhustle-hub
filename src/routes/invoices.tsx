import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { invoices, currency } from "@/lib/demo-data";
import { Tab, StatCard } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus } from "lucide-react";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices · Crosscurrent" }] }),
  component: InvoicesPage,
});

const statusCls: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-status-qualified/15 text-status-qualified",
  partial: "bg-chart-4/15 text-chart-4",
  paid: "bg-status-won/15 text-status-won",
  overdue: "bg-status-lost/15 text-status-lost",
};

function InvoicesPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Invoices" }); }, [setMeta]);

  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Outstanding" value={currency(outstanding)} delta="−$12k" accent="up" />
          <StatCard label="Overdue" value={currency(overdue)} delta="2 invoices" accent="down" />
          <StatCard label="Collected (MTD)" value={currency(collected)} delta="+14.1%" accent="up" />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground bg-surface/50">
              <tr className="border-b border-border">
                <th className="text-left font-medium py-2 px-3">Number</th>
                <th className="text-left font-medium py-2">Company</th>
                <th className="text-right font-medium py-2">Amount</th>
                <th className="text-left font-medium py-2 pl-4">Issued</th>
                <th className="text-left font-medium py-2">Due</th>
                <th className="text-left font-medium py-2">Status</th>
                <th className="text-right font-medium py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="row-hover border-b border-border/60">
                  <td className="py-2.5 px-3 font-mono text-[11px]">{i.number}</td>
                  <td className="py-2.5 font-medium">{i.company}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{currency(i.amount)}</td>
                  <td className="py-2.5 pl-4 text-muted-foreground">{i.issued}</td>
                  <td className={`py-2.5 ${i.status==="overdue"?"text-priority-urgent":"text-muted-foreground"}`}>{i.due}</td>
                  <td className="py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium capitalize ${statusCls[i.status]}`}>{i.status}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <button className="text-[11.5px] text-primary hover:underline">
                      {i.status === "paid" ? "View" : i.status === "draft" ? "Edit" : "Remind"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

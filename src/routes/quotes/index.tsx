import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import { quotes, currency } from "@/lib/demo-data";
import type { Quote } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Clock, Eye, FileText, XCircle,
} from "lucide-react";

export const Route = createFileRoute("/quotes/")({
  head: () => ({ meta: [{ title: "Quotes & Estimates · Port City Sound & Security" }] }),
  component: QuotesPage,
});

// ─── Config ──────────────────────────────────────────────────────────────────

type QuoteStatus = Quote["status"];

const statusStyle: Record<QuoteStatus, { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }> = {
  draft:    { icon: FileText,     cls: "text-muted-foreground",      label: "Draft" },
  sent:     { icon: Clock,        cls: "text-status-qualified",      label: "Sent" },
  viewed:   { icon: Eye,          cls: "text-status-proposal",       label: "Viewed" },
  accepted: { icon: CheckCircle2, cls: "text-status-won",            label: "Accepted" },
  expired:  { icon: XCircle,      cls: "text-status-lost",           label: "Expired" },
};

const DATE_RANGES = ["All Time", "This Month", "Last Month", "This Quarter"] as const;
type DateRange = typeof DATE_RANGES[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMonth(dateStr: string): { month: number; year: number } | null {
  if (!dateStr || dateStr === "—") return null;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const parts = dateStr.split(" ");
  if (parts.length < 3) return null;
  const m = months[parts[0]];
  const y = parseInt(parts[2], 10);
  if (m === undefined || isNaN(y)) return null;
  return { month: m, year: y };
}

function matchesDateRange(q: Quote, range: DateRange): boolean {
  if (range === "All Time") return true;
  const parsed = parseMonth(q.createdDate);
  if (!parsed) return false;
  const { month, year } = parsed;
  // Using June 2026 as "current" to match demo data
  const currentMonth = 5; // June
  const currentYear = 2026;
  if (range === "This Month") return month === currentMonth && year === currentYear;
  if (range === "Last Month") return month === 4 && year === currentYear; // May 2026
  if (range === "This Quarter") return year === currentYear && month >= 3 && month <= 5; // Q2
  return true;
}

function marginColor(m: number): string {
  if (m >= 30) return "text-status-won";
  if (m >= 20) return "text-amber-500";
  return "text-status-lost";
}

// ─── Main page ────────────────────────────────────────────────────────────────

function QuotesPage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("All Time");

  useEffect(() => {
    setMeta({
      title: "Quotes & Estimates",
      subtitle: `${quotes.length} quotes`,
      onNew: () => navigate({ to: "/quotes/new" }),
      newLabel: "+ New Quote",
    });
  }, [setMeta, navigate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return quotes.filter((qt) => {
      if (q && !qt.project.toLowerCase().includes(q) &&
          !qt.company.toLowerCase().includes(q) &&
          !qt.number.toLowerCase().includes(q) &&
          !qt.contactName.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && qt.status !== statusFilter) return false;
      if (!matchesDateRange(qt, dateRange)) return false;
      return true;
    });
  }, [search, statusFilter, dateRange]);

  const openDetail = useCallback(
    (id: string) => navigate({ to: "/quotes/$quoteId", params: { quoteId: id } }),
    [navigate],
  );

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quotes..."
          className="h-7 min-w-[180px] flex-1 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "all")} className={selectCls}>
          <option value="all">All Statuses</option>
          {(["draft", "sent", "viewed", "accepted", "expired"] as QuoteStatus[]).map((s) => (
            <option key={s} value={s}>{statusStyle[s].label}</option>
          ))}
        </select>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className={selectCls}>
          {DATE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-[11px] text-muted-foreground font-mono">
          {filtered.length} of {quotes.length}
        </span>
      </div>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[820px]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50">
              <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Number</th>
                <th className="py-2 px-3 text-left font-medium">Project</th>
                <th className="py-2 px-3 text-left font-medium">Company / Contact</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-right font-medium">Margin</th>
                <th className="py-2 px-3 text-right font-medium">Total</th>
                <th className="py-2 px-3 pr-3 text-right font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const s = statusStyle[q.status];
                return (
                  <tr
                    key={q.id}
                    onClick={() => openDetail(q.id)}
                    className="row-hover border-b border-border/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{q.number}</td>
                    <td className="py-2.5 px-3 font-medium">{q.project}</td>
                    <td className="py-2.5 px-3">
                      <div className="text-[12.5px]">{q.company}</div>
                      <div className="text-[11px] text-muted-foreground">{q.contactName}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] capitalize", s.cls)}>
                        <s.icon className="h-3 w-3" /> {s.label}
                      </span>
                    </td>
                    <td className={cn("py-2.5 px-3 text-right font-mono tabular-nums text-[12px]", marginColor(q.margin))}>
                      {q.margin}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">{currency(q.total)}</td>
                    <td className="py-2.5 px-3 pr-3 text-right text-muted-foreground text-[11.5px]">
                      {q.expiryDate === "—" ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        q.expiryDate
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted-foreground">
                    No quotes match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

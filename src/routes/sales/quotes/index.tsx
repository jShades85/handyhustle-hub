import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Clock, Eye, FileText, XCircle,
} from "lucide-react";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";

export const Route = createFileRoute("/sales/quotes/")({
  head: () => ({ meta: [{ title: "Quotes & Estimates · Port City Sound & Security" }] }),
  component: QuotesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "expired";

interface DbQuote {
  id: string;
  number: string;
  status: QuoteStatus;
  value: number | null;
  expiry_date: string | null;
  revision: number;
  created_at: string;
  opportunity: {
    id: string;
    title: string;
    company: { id: string; name: string } | null;
    contact: { id: string; full_name: string } | null;
  } | null;
}

const supabase = createClient();

async function fetchQuotesList(): Promise<DbQuote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select(`
      id, number, status, value, expiry_date, revision, created_at,
      opportunity:opportunities(
        id, title,
        company:companies(id, name),
        contact:contacts(id, full_name)
      )
    `)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DbQuote[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function matchesDateRange(createdAt: string, range: DateRange): boolean {
  if (range === "All Time") return true;
  const d = new Date(createdAt);
  const now = new Date();
  if (range === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === "Last Month") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
  }
  if (range === "This Quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q;
  }
  return true;
}

// ─── Main page ────────────────────────────────────────────────────────────────

function QuotesPage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("All Time");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes-list"],
    queryFn: fetchQuotesList,
  });

  useEffect(() => {
    setMeta({
      title: "Quotes & Estimates",
      subtitle: `${quotes.length} quotes`,
      onNew: () => navigate({ to: "/sales/quotes/new", search: { opportunityId: undefined } }),
      newLabel: "New Quote",
    });
  }, [setMeta, navigate, quotes.length]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return quotes.filter((qt) => {
      if (q) {
        const opp = qt.opportunity;
        const haystack = [
          qt.number,
          opp?.title ?? "",
          opp?.company?.name ?? "",
          opp?.contact?.full_name ?? "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== "all" && qt.status !== statusFilter) return false;
      if (!matchesDateRange(qt.created_at, dateRange)) return false;
      return true;
    });
  }, [quotes, search, statusFilter, dateRange]);

  const openDetail = useCallback(
    (id: string) => navigate({ to: "/sales/quotes/$quoteId", params: { quoteId: id } }),
    [navigate],
  );

  return (
    <div className="flex flex-col">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search quotes…" />
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as QuoteStatus | "all")}>
          <option value="all">All Statuses</option>
          {(["draft", "sent", "viewed", "accepted", "expired"] as QuoteStatus[]).map((s) => (
            <option key={s} value={s}>{statusStyle[s].label}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={dateRange} onChange={(v) => setDateRange(v as DateRange)}>
          {DATE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
        </FilterSelect>
        <span className="text-[11px] text-muted-foreground font-mono">
          {filtered.length} of {quotes.length}
        </span>
      </FilterBar>

      <div className="p-4 overflow-x-auto">
        <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[820px]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50">
              <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Number</th>
                <th className="py-2 px-3 text-left font-medium">Opportunity</th>
                <th className="py-2 px-3 text-left font-medium">Company / Contact</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-right font-medium">Rev</th>
                <th className="py-2 px-3 text-right font-medium">Total</th>
                <th className="py-2 px-3 pr-3 text-right font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted-foreground">
                    Loading quotes…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((q) => {
                const s = statusStyle[q.status] ?? statusStyle.draft;
                const opp = q.opportunity;
                return (
                  <tr
                    key={q.id}
                    onClick={() => openDetail(q.id)}
                    className="row-hover border-b border-border/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{q.number}</td>
                    <td className="py-2.5 px-3 font-medium">{opp?.title ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      <div className="text-[12.5px]">{opp?.company?.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{opp?.contact?.full_name ?? ""}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] capitalize", s.cls)}>
                        <s.icon className="h-3 w-3" /> {s.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-muted-foreground">
                      v{q.revision}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                      {q.value != null ? currency(q.value) : "—"}
                    </td>
                    <td className="py-2.5 px-3 pr-3 text-right text-muted-foreground text-[11.5px]">
                      {q.expiry_date ? fmtDate(q.expiry_date) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted-foreground">
                    {quotes.length === 0
                      ? "No quotes yet. Create one from an opportunity in Estimating or Negotiation."
                      : "No quotes match the current filters."}
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

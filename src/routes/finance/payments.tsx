import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Banknote, Check, CheckCircle2, ChevronsUpDown,
  CreditCard, DollarSign, FileText, Landmark, Link2, Mail,
  Receipt, TrendingUp, X,
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { INVOICES, type Invoice, type InvoiceStatus } from "@/data/invoices";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/finance/payments")({
  head: () => ({ meta: [{ title: "Payments · Port City Sound & Security" }] }),
  component: PaymentsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = "outstanding" | "all" | "collect";
type CollectMethod = "stripe" | "check" | "wire" | "cash";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: "bg-muted text-muted-foreground" },
  sent:    { label: "Sent",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  partial: { label: "Partial", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  paid:    { label: "Paid",    cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  overdue: { label: "Overdue", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  void:    { label: "Void",    cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const METHOD_META: Record<string, { label: string; cls: string }> = {
  check:       { label: "Check",       cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  ach:         { label: "ACH",         cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  credit_card: { label: "Credit Card", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  wire:        { label: "Wire",        cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  cash:        { label: "Cash",        cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const labelCls = "block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium mb-1";
const inputCls = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";

// ─── Derived data ─────────────────────────────────────────────────────────────

const OUTSTANDING = INVOICES
  .filter((i) => i.status === "sent" || i.status === "partial" || i.status === "overdue")
  .sort((a, b) => {
    const aOv = a.status === "overdue";
    const bOv = b.status === "overdue";
    if (aOv !== bOv) return aOv ? -1 : 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

const ALL_PAYMENTS = INVOICES.flatMap((inv) =>
  inv.payments.map((p) => ({
    ...p,
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    companyName: inv.companyName,
  }))
).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const TODAY = new Date("2026-06-08");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysOverdue(dueDateStr: string): number {
  const diff = Math.floor((TODAY.getTime() - new Date(dueDateStr).getTime()) / 86400000);
  return Math.max(0, diff);
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, cls } = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── MethodBadge ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const meta = METHOD_META[method] ?? { label: method, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", meta.cls)}>
      {meta.label}
    </span>
  );
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

interface StatItem {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}

function StatBar({ stats }: { stats: StatItem[] }) {
  return (
    <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
      {stats.map(({ icon: Icon, label, value, accent }) => (
        <div key={label} className="flex items-center gap-3 px-5 py-3 border-r border-border shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <Icon className={cn("h-3.5 w-3.5", accent ? "text-red-500" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn("text-[14px] font-semibold tabular-nums leading-tight", accent && "text-red-500")}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── InvoiceCombobox ──────────────────────────────────────────────────────────

function InvoiceCombobox({
  value, onChange, invoices, placeholder = "Select an outstanding invoice…",
}: {
  value: string;
  onChange: (id: string) => void;
  invoices: Invoice[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = invoices.find((i) => i.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-[12.5px] hover:bg-accent/30 transition-colors"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11.5px] shrink-0 text-muted-foreground">{selected.number}</span>
              <span className="font-medium truncate">{selected.companyName}</span>
              <StatusBadge status={selected.status} />
              <span className="text-muted-foreground shrink-0 tabular-nums">{currency(selected.balanceDue)} due</span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            if (itemValue === "__clear__") return 1;
            const inv = invoices.find((i) => i.id === itemValue);
            if (!inv) return 0;
            return `${inv.number} ${inv.companyName} ${inv.projectName ?? ""}`.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by invoice #, customer, project…" />
          <CommandList>
            <CommandEmpty>No invoices found.</CommandEmpty>
            {value && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => { onChange(""); setOpen(false); }}
                    className="text-[12.5px] text-muted-foreground gap-2"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" /> Clear selection
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Outstanding Invoices">
              {invoices.map((inv) => (
                <CommandItem
                  key={inv.id}
                  value={inv.id}
                  onSelect={(v) => { onChange(v); setOpen(false); }}
                  className="text-[12.5px] gap-2"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === inv.id ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">{inv.number}</span>
                  <span className="flex-1 truncate">{inv.companyName}</span>
                  <StatusBadge status={inv.status} />
                  <span className="text-[12px] font-semibold tabular-nums shrink-0">{currency(inv.balanceDue)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── OutstandingTab ───────────────────────────────────────────────────────────

function OutstandingTab({ onCollect }: { onCollect: (id: string) => void }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return OUTSTANDING;
    return OUTSTANDING.filter((i) =>
      i.number.toLowerCase().includes(q) ||
      i.companyName.toLowerCase().includes(q) ||
      (i.projectName ?? "").toLowerCase().includes(q)
    );
  }, [search]);

  const totalOutstanding = OUTSTANDING.reduce((s, i) => s + i.balanceDue, 0);
  const overdueList = OUTSTANDING.filter((i) => i.status === "overdue");
  const overdueTotal = overdueList.reduce((s, i) => s + i.balanceDue, 0);
  const partialBalance = OUTSTANDING.filter((i) => i.status === "partial").reduce((s, i) => s + i.balanceDue, 0);

  return (
    <>
      <StatBar stats={[
        { icon: DollarSign,  label: "Total Outstanding",               value: currency(totalOutstanding), accent: false },
        { icon: AlertCircle, label: `Overdue (${overdueList.length})`, value: currency(overdueTotal),     accent: overdueList.length > 0 },
        { icon: TrendingUp,  label: "Partial — Remaining",             value: currency(partialBalance),   accent: false },
        { icon: FileText,    label: "Open Invoices",                   value: String(OUTSTANDING.length), accent: false },
      ]} />

      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="text"
          placeholder="Search invoice #, customer, project…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 w-72 rounded-md border border-border bg-background px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Invoice #</th>
              <th className="text-left px-4 py-2.5 font-medium">Customer</th>
              <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Project</th>
              <th className="text-right px-4 py-2.5 font-medium">Total</th>
              <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Paid</th>
              <th className="text-right px-4 py-2.5 font-medium">Balance Due</th>
              <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Due Date</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const od = daysOverdue(inv.dueDate);
              return (
                <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] font-medium">{inv.number}</td>
                  <td className="px-4 py-3 font-medium">{inv.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate max-w-36">
                    {inv.projectName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{currency(inv.total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    {inv.amountPaid > 0 ? currency(inv.amountPaid) : "—"}
                  </td>
                  <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", inv.status === "overdue" && "text-red-500")}>
                    <span className="block">{currency(inv.balanceDue)}</span>
                    {od > 0 && (
                      <span className="text-[10px] font-normal text-red-400">{od}d overdue</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{inv.dueDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onCollect(inv.id)}
                      className="h-7 rounded-md bg-primary/10 px-3 text-[11.5px] font-medium text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
                    >
                      Collect →
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-[12.5px] text-muted-foreground">
                  No outstanding invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── AllPaymentsTab ───────────────────────────────────────────────────────────

function AllPaymentsTab() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return ALL_PAYMENTS.filter((p) => {
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (q &&
        !p.invoiceNumber.toLowerCase().includes(q) &&
        !p.companyName.toLowerCase().includes(q) &&
        !p.reference.toLowerCase().includes(q)
      ) return false;
      return true;
    });
  }, [search, methodFilter]);

  const totalCollected = ALL_PAYMENTS.reduce((s, p) => s + p.amount, 0);
  const thisMonth = ALL_PAYMENTS.filter((p) => p.date.startsWith("Jun")).reduce((s, p) => s + p.amount, 0);
  const lastMonth = ALL_PAYMENTS.filter((p) => p.date.startsWith("May")).reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <StatBar stats={[
        { icon: CheckCircle2, label: "Total Collected", value: currency(totalCollected), accent: false },
        { icon: TrendingUp,   label: "This Month",      value: currency(thisMonth),      accent: false },
        { icon: Receipt,      label: "Last Month",      value: currency(lastMonth),      accent: false },
        { icon: FileText,     label: "Payments",        value: String(ALL_PAYMENTS.length), accent: false },
      ]} />

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="text"
          placeholder="Search invoice #, customer, reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 w-72 rounded-md border border-border bg-background px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Methods</option>
          <option value="check">Check</option>
          <option value="ach">ACH</option>
          <option value="credit_card">Credit Card</option>
          <option value="wire">Wire</option>
          <option value="cash">Cash</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Date</th>
              <th className="text-left px-4 py-2.5 font-medium">Invoice #</th>
              <th className="text-left px-4 py-2.5 font-medium">Customer</th>
              <th className="text-left px-4 py-2.5 font-medium">Method</th>
              <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Reference</th>
              <th className="text-right px-4 py-2.5 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                <td className="px-4 py-3 font-mono text-[12px] font-medium">{p.invoiceNumber}</td>
                <td className="px-4 py-3 font-medium">{p.companyName}</td>
                <td className="px-4 py-3"><MethodBadge method={p.method} /></td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-[11.5px] hidden md:table-cell">
                  {p.reference || "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                  +{currency(p.amount)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[12.5px] text-muted-foreground">
                  No payments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── CollectTab ───────────────────────────────────────────────────────────────

function CollectTab({
  invoiceId, onInvoiceChange,
}: {
  invoiceId: string;
  onInvoiceChange: (id: string) => void;
}) {
  const [method, setMethod] = useState<CollectMethod>("stripe");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [dateReceived, setDateReceived] = useState("Jun 8, 2026");
  const [notes, setNotes] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const selectedInvoice = OUTSTANDING.find((i) => i.id === invoiceId) ?? null;

  useEffect(() => {
    if (invoiceId) {
      const inv = OUTSTANDING.find((i) => i.id === invoiceId);
      setAmount(inv ? inv.balanceDue.toFixed(2) : "");
    } else {
      setAmount("");
    }
    setLinkCopied(false);
    setLinkSent(false);
    setRecorded(false);
    setCheckNumber("");
    setBankRef("");
    setEmail("");
    setNotes("");
  }, [invoiceId]);

  const fakeStripeLink = selectedInvoice
    ? `https://buy.stripe.com/pcss_${selectedInvoice.number.toLowerCase().replace("-", "")}`
    : "";

  const amountNum = Number(amount);
  const isPartial = selectedInvoice && amountNum > 0 && amountNum < selectedInvoice.balanceDue;

  function handleCopyLink() {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  // ─ success states ─

  if (recorded && selectedInvoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold">Payment Recorded</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            {currency(amountNum)} applied to {selectedInvoice.number}
          </p>
        </div>
        <button
          onClick={() => { setRecorded(false); onInvoiceChange(""); }}
          className="h-8 rounded-md border border-border px-4 text-[12.5px] hover:bg-accent transition-colors mt-2"
        >
          Record Another Payment
        </button>
      </div>
    );
  }

  if (linkSent && selectedInvoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold">Payment Link Sent</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            {currency(amountNum)} link sent to {email || selectedInvoice.contactName}
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            The invoice will update to Paid once the customer completes checkout.
          </p>
        </div>
        <button
          onClick={() => { setLinkSent(false); onInvoiceChange(""); }}
          className="h-8 rounded-md border border-border px-4 text-[12.5px] hover:bg-accent transition-colors mt-2"
        >
          Send Another Link
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-6 py-8">
      <div className="w-full max-w-xl space-y-6">

        {/* Invoice selector */}
        <div>
          <label className={labelCls}>Invoice</label>
          <InvoiceCombobox
            value={invoiceId}
            onChange={onInvoiceChange}
            invoices={OUTSTANDING}
          />
        </div>

        {/* Invoice summary card */}
        {selectedInvoice && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  {selectedInvoice.number}
                </p>
                <p className="text-[15px] font-semibold mt-0.5">{selectedInvoice.companyName}</p>
                <p className="text-[12px] text-muted-foreground">{selectedInvoice.contactName}</p>
              </div>
              <StatusBadge status={selectedInvoice.status} />
            </div>
            <div className="h-px bg-border" />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Invoice Total</p>
                <p className="text-[13.5px] font-medium tabular-nums">{currency(selectedInvoice.total)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Paid</p>
                <p className="text-[13.5px] font-medium tabular-nums text-green-600 dark:text-green-400">
                  {selectedInvoice.amountPaid > 0 ? currency(selectedInvoice.amountPaid) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Balance Due</p>
                <p className={cn(
                  "text-[13.5px] font-semibold tabular-nums",
                  selectedInvoice.status === "overdue" ? "text-red-500" : "text-foreground",
                )}>
                  {currency(selectedInvoice.balanceDue)}
                </p>
              </div>
            </div>
            {selectedInvoice.projectName && (
              <p className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3 shrink-0" />
                {selectedInvoice.projectName}
              </p>
            )}
          </div>
        )}

        {selectedInvoice && (
          <>
            {/* Amount */}
            <div>
              <label className={labelCls}>Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] text-muted-foreground">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(inputCls, "pl-6 font-mono")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {isPartial && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Partial payment — {currency(selectedInvoice.balanceDue - amountNum)} will remain outstanding
                </p>
              )}
            </div>

            {/* Method selector */}
            <div>
              <label className={labelCls}>Payment Method</label>
              <div className="grid grid-cols-4 gap-2">

                {/* Stripe */}
                <button
                  type="button"
                  onClick={() => setMethod("stripe")}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                    method === "stripe"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground whitespace-nowrap">
                    Recommended
                  </span>
                  <CreditCard className={cn("h-4 w-4 mt-1", method === "stripe" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[12px] font-medium", method === "stripe" ? "text-foreground" : "")}>Stripe</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">Card or ACH</span>
                </button>

                {/* Check */}
                <button
                  type="button"
                  onClick={() => setMethod("check")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                    method === "check"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <Receipt className={cn("h-4 w-4", method === "check" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[12px] font-medium", method === "check" ? "text-foreground" : "")}>Check</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">Paper check</span>
                </button>

                {/* Wire */}
                <button
                  type="button"
                  onClick={() => setMethod("wire")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                    method === "wire"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <Landmark className={cn("h-4 w-4", method === "wire" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[12px] font-medium", method === "wire" ? "text-foreground" : "")}>Wire</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">Bank transfer</span>
                </button>

                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setMethod("cash")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                    method === "cash"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <Banknote className={cn("h-4 w-4", method === "cash" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[12px] font-medium", method === "cash" ? "text-foreground" : "")}>Cash</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">Cash receipt</span>
                </button>
              </div>
            </div>

            {/* Method-specific fields */}
            {method === "stripe" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#635BFF]/10">
                    <CreditCard className="h-4 w-4 text-[#635BFF]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">Stripe Payment Link</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      Customer pays by card or ACH bank transfer. 2.9% + 30¢ per card, 0.8% per ACH (capped at $5).
                    </p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Send to (email)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder={`${selectedInvoice.contactName.split(" ")[0].toLowerCase()}@example.com`}
                  />
                </div>

                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Payment link</p>
                  <p className="font-mono text-[11.5px] text-muted-foreground truncate">{fakeStripeLink}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-md border border-border bg-background text-[12.5px] hover:bg-accent transition-colors"
                  >
                    {linkCopied
                      ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied!</>
                      : <><Link2 className="h-3.5 w-3.5" /> Copy Link</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkSent(true)}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Mail className="h-3.5 w-3.5" /> Send via Email
                  </button>
                </div>
              </div>
            )}

            {method === "check" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date Received</label>
                  <input
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className={inputCls}
                    placeholder="Jun 8, 2026"
                  />
                </div>
                <div>
                  <label className={labelCls}>Check Number</label>
                  <input
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 4421"
                  />
                </div>
              </div>
            )}

            {method === "wire" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date Received</label>
                  <input
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className={inputCls}
                    placeholder="Jun 8, 2026"
                  />
                </div>
                <div>
                  <label className={labelCls}>Bank Reference</label>
                  <input
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. WIRE-2026-04421"
                  />
                </div>
              </div>
            )}

            {method === "cash" && (
              <div>
                <label className={labelCls}>Date Received</label>
                <input
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className={inputCls}
                  placeholder="Jun 8, 2026"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes…"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              />
            </div>

            {/* CTA — only for non-Stripe (Stripe has its own buttons above) */}
            {method !== "stripe" && (
              <button
                type="button"
                onClick={() => setRecorded(true)}
                className="w-full h-10 rounded-md bg-primary text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Record Payment
              </button>
            )}
          </>
        )}

        {!selectedInvoice && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-[12.5px] text-muted-foreground">
            Select an invoice above to begin collecting a payment
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PaymentsPage ─────────────────────────────────────────────────────────────

function PaymentsPage() {
  const { setMeta } = useMeta();
  const [tab, setTab] = useState<MainTab>("outstanding");
  const [collectInvoiceId, setCollectInvoiceId] = useState("");

  useEffect(() => {
    setMeta({ title: "Payments", subtitle: "Finance" });
  }, [setMeta]);

  function handleCollect(invoiceId: string) {
    setCollectInvoiceId(invoiceId);
    setTab("collect");
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {(["outstanding", "all", "collect"] as MainTab[]).map((key) => {
          const labels: Record<MainTab, string> = {
            outstanding: "Outstanding",
            all: "All Payments",
            collect: "Collect Payment",
          };
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {labels[key]}
            </button>
          );
        })}
      </div>

      {tab === "outstanding" && <OutstandingTab onCollect={handleCollect} />}
      {tab === "all"         && <AllPaymentsTab />}
      {tab === "collect"     && (
        <CollectTab invoiceId={collectInvoiceId} onInvoiceChange={setCollectInvoiceId} />
      )}
    </div>
  );
}

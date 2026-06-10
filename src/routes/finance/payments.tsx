import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Banknote, Check, CheckCircle2, ChevronsUpDown,
  CreditCard, DollarSign, FileText, Landmark, Link2, Mail,
  Receipt, TrendingUp, X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  StatBar, StatItem, FilterBar, SearchInput, FilterSelect,
  PageTabs, PageTab,
} from "@/components/ui/page-components";
import { createClient } from "@/lib/supabase/client";
import type { InvoiceStatus } from "./invoices";

export const Route = createFileRoute("/finance/payments")({
  head: () => ({ meta: [{ title: "Payments · BearingPro" }] }),
  component: PaymentsPage,
});

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = "outstanding" | "all" | "collect";
type CollectMethod = "stripe" | "check" | "wire" | "cash";

type DbLineItem = { id: string; sort_order: number; [key: string]: unknown };
type DbPaymentRow = {
  id: string;
  invoice_id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  created_at: string;
};

type DbInvoice = {
  id: string;
  invoice_number: string;
  status: string;
  company_name: string;
  contact_name: string;
  linked_project_id: string | null;
  linked_work_order_id: string | null;
  issued_date: string;
  due_date: string;
  payment_terms: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string;
  invoice_line_items: DbLineItem[];
  invoice_payments: DbPaymentRow[];
};

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  companyName: string;
  contactName: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

interface FlatPayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  companyName: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function daysOverdue(dueDateIso: string): number {
  const diff = Math.floor((Date.now() - new Date(dueDateIso).getTime()) / 86400000);
  return Math.max(0, diff);
}

function toInvoice(r: DbInvoice): Invoice {
  return {
    id:          r.id,
    number:      r.invoice_number,
    status:      r.status as InvoiceStatus,
    companyName: r.company_name,
    contactName: r.contact_name,
    dueDate:     r.due_date,
    total:       Number(r.total),
    amountPaid:  Number(r.amount_paid),
    balanceDue:  Number(r.balance_due),
  };
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
      <PopoverContent className="w-120 p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            if (itemValue === "__clear__") return 1;
            const inv = invoices.find((i) => i.id === itemValue);
            if (!inv) return 0;
            return `${inv.number} ${inv.companyName}`.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by invoice #, customer…" />
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

function OutstandingTab({
  outstanding, search, onCollect,
}: {
  outstanding: Invoice[];
  search: string;
  onCollect: (id: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return outstanding;
    return outstanding.filter((i) =>
      i.number.toLowerCase().includes(q) || i.companyName.toLowerCase().includes(q)
    );
  }, [outstanding, search]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium">Invoice #</th>
            <th className="text-left px-4 py-2.5 font-medium">Customer</th>
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
                <td className="px-4 py-3 text-right tabular-nums">{currency(inv.total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                  {inv.amountPaid > 0 ? currency(inv.amountPaid) : "—"}
                </td>
                <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", inv.status === "overdue" && "text-red-500")}>
                  <span className="block">{currency(inv.balanceDue)}</span>
                  {od > 0 && <span className="text-[10px] font-normal text-red-400">{od}d overdue</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(inv.dueDate)}</td>
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
              <td colSpan={8} className="px-4 py-16 text-center text-[12.5px] text-muted-foreground">
                No outstanding invoices found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── AllPaymentsTab ───────────────────────────────────────────────────────────

function AllPaymentsTab({
  allPayments, search, methodFilter,
}: {
  allPayments: FlatPayment[];
  search: string;
  methodFilter: string;
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allPayments.filter((p) => {
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (q && !p.invoiceNumber.toLowerCase().includes(q) && !p.companyName.toLowerCase().includes(q) && !p.reference.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allPayments, search, methodFilter]);

  return (
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
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.date)}</td>
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
  );
}

// ─── CollectTab ───────────────────────────────────────────────────────────────

function CollectTab({
  outstanding, invoiceId, onInvoiceChange,
}: {
  outstanding: Invoice[];
  invoiceId: string;
  onInvoiceChange: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<CollectMethod>("stripe");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [dateReceived, setDateReceived] = useState(today);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [recordedAmount, setRecordedAmount] = useState(0);

  const selectedInvoice = outstanding.find((i) => i.id === invoiceId) ?? null;

  useEffect(() => {
    if (invoiceId) {
      const inv = outstanding.find((i) => i.id === invoiceId);
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
    setDateReceived(today());
  }, [invoiceId, outstanding]);

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error("No invoice selected");
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      const amountNum = Number(amount);
      const dbMethod = method === "check" ? "check" : method === "wire" ? "wire" : "cash";
      const reference = method === "check" ? checkNumber : method === "wire" ? bankRef : "";

      const { error: pmtError } = await supabase
        .from("invoice_payments")
        .insert({
          tenant_id:  tenantId!,
          invoice_id: selectedInvoice.id,
          date:       dateReceived,
          amount:     amountNum,
          method:     dbMethod,
          reference:  reference,
        });
      if (pmtError) throw pmtError;

      const newAmountPaid = selectedInvoice.amountPaid + amountNum;
      const newBalanceDue = Math.max(0, selectedInvoice.total - newAmountPaid);
      const newStatus: InvoiceStatus = newBalanceDue <= 0 ? "paid" : "partial";

      const { data, error: invError } = await supabase
        .from("invoices")
        .update({ amount_paid: newAmountPaid, balance_due: newBalanceDue, status: newStatus })
        .eq("id", selectedInvoice.id)
        .select("*, invoice_line_items(*), invoice_payments(*)")
        .single();
      if (invError) throw invError;
      return data as unknown as DbInvoice;
    },
    onSuccess: (updatedInv) => {
      qc.setQueryData<DbInvoice[]>(["invoices"], (prev = []) =>
        prev.map((inv) => (inv.id === updatedInv.id ? updatedInv : inv)),
      );
      setRecordedAmount(Number(amount));
      setRecorded(true);
    },
  });

  const amountNum = Number(amount);
  const isPartial = selectedInvoice && amountNum > 0 && amountNum < selectedInvoice.balanceDue;
  const fakeStripeLink = selectedInvoice
    ? `https://buy.stripe.com/pcss_${selectedInvoice.number.toLowerCase().replace("-", "")}`
    : "";

  if (recorded && selectedInvoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold">Payment Recorded</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            {currency(recordedAmount)} applied to {selectedInvoice.number}
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

        <div>
          <label className={labelCls}>Invoice</label>
          <InvoiceCombobox value={invoiceId} onChange={onInvoiceChange} invoices={outstanding} />
        </div>

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
          </div>
        )}

        {selectedInvoice && (
          <>
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

            <div>
              <label className={labelCls}>Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {(["stripe", "check", "wire", "cash"] as CollectMethod[]).map((m) => {
                  const icons: Record<CollectMethod, React.ReactNode> = {
                    stripe: <CreditCard className={cn("h-4 w-4 mt-1", m === method ? "text-primary" : "text-muted-foreground")} />,
                    check:  <Receipt   className={cn("h-4 w-4", m === method ? "text-primary" : "text-muted-foreground")} />,
                    wire:   <Landmark  className={cn("h-4 w-4", m === method ? "text-primary" : "text-muted-foreground")} />,
                    cash:   <Banknote  className={cn("h-4 w-4", m === method ? "text-primary" : "text-muted-foreground")} />,
                  };
                  const labels: Record<CollectMethod, [string, string]> = {
                    stripe: ["Stripe", "Card or ACH"],
                    check:  ["Check", "Paper check"],
                    wire:   ["Wire", "Bank transfer"],
                    cash:   ["Cash", "Cash receipt"],
                  };
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                        method === m
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      {m === "stripe" && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground whitespace-nowrap">
                          Recommended
                        </span>
                      )}
                      {icons[m]}
                      <span className={cn("text-[12px] font-medium", method === m ? "text-foreground" : "")}>{labels[m][0]}</span>
                      <span className="text-[10px] leading-tight text-muted-foreground">{labels[m][1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
                    onClick={() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); }}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-md border border-border bg-background text-[12.5px] hover:bg-accent transition-colors"
                  >
                    {linkCopied ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied!</> : <><Link2 className="h-3.5 w-3.5" /> Copy Link</>}
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

            {(method === "check" || method === "wire") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date Received</label>
                  <input
                    type="date"
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{method === "check" ? "Check Number" : "Bank Reference"}</label>
                  <input
                    value={method === "check" ? checkNumber : bankRef}
                    onChange={(e) => method === "check" ? setCheckNumber(e.target.value) : setBankRef(e.target.value)}
                    className={inputCls}
                    placeholder={method === "check" ? "e.g. 4421" : "e.g. WIRE-2026-04421"}
                  />
                </div>
              </div>
            )}

            {method === "cash" && (
              <div>
                <label className={labelCls}>Date Received</label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            {method !== "stripe" && (
              <button
                type="button"
                onClick={() => collectMutation.mutate()}
                disabled={collectMutation.isPending || !amountNum || amountNum <= 0}
                className="w-full h-10 rounded-md bg-primary text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {collectMutation.isPending ? "Recording…" : "Record Payment"}
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
  const [outSearch, setOutSearch] = useState("");
  const [allSearch, setAllSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const { data: rawInvoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_line_items(*), invoice_payments(*)")
        .order("issued_date", { ascending: false });
      if (error) throw error;
      return data as unknown as DbInvoice[];
    },
  });

  const invoices = useMemo(() => rawInvoices.map(toInvoice), [rawInvoices]);

  const outstanding = useMemo(() =>
    invoices
      .filter((i) => i.status === "sent" || i.status === "partial" || i.status === "overdue")
      .sort((a, b) => {
        const aOv = a.status === "overdue";
        const bOv = b.status === "overdue";
        if (aOv !== bOv) return aOv ? -1 : 1;
        return a.dueDate.localeCompare(b.dueDate);
      }),
    [invoices],
  );

  const allPayments = useMemo((): FlatPayment[] =>
    rawInvoices.flatMap((inv) =>
      (inv.invoice_payments ?? []).map((p) => ({
        id:            p.id,
        invoiceId:     inv.id,
        invoiceNumber: inv.invoice_number,
        companyName:   inv.company_name,
        date:          p.date,
        amount:        Number(p.amount),
        method:        p.method,
        reference:     p.reference,
      }))
    ).sort((a, b) => b.date.localeCompare(a.date)),
    [rawInvoices],
  );

  // Stat aggregates — outstanding tab
  const totalOutstanding = useMemo(() => outstanding.reduce((s, i) => s + i.balanceDue, 0), [outstanding]);
  const overdueList      = useMemo(() => outstanding.filter((i) => i.status === "overdue"), [outstanding]);
  const overdueTotal     = useMemo(() => overdueList.reduce((s, i) => s + i.balanceDue, 0), [overdueList]);
  const partialBalance   = useMemo(() => outstanding.filter((i) => i.status === "partial").reduce((s, i) => s + i.balanceDue, 0), [outstanding]);

  // Stat aggregates — all payments tab
  const totalCollected = useMemo(() => allPayments.reduce((s, p) => s + p.amount, 0), [allPayments]);
  const now            = new Date();
  const thisMonthPfx   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPfx   = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth      = useMemo(() => allPayments.filter((p) => p.date.startsWith(thisMonthPfx)).reduce((s, p) => s + p.amount, 0), [allPayments, thisMonthPfx]);
  const lastMonth      = useMemo(() => allPayments.filter((p) => p.date.startsWith(lastMonthPfx)).reduce((s, p) => s + p.amount, 0), [allPayments, lastMonthPfx]);

  useEffect(() => {
    setMeta({ title: "Payments", subtitle: "Finance" });
  }, [setMeta]);

  function handleCollect(invoiceId: string) {
    setCollectInvoiceId(invoiceId);
    setTab("collect");
  }

  return (
    <div className="flex flex-col">
      {tab === "outstanding" && (
        <StatBar>
          <StatItem icon={DollarSign}  label="Total Outstanding"                value={currency(totalOutstanding)} />
          <StatItem icon={AlertCircle} label={`Overdue (${overdueList.length})`} value={currency(overdueTotal)} accent={overdueList.length > 0} />
          <StatItem icon={TrendingUp}  label="Partial — Remaining"              value={currency(partialBalance)} />
          <StatItem icon={FileText}    label="Open Invoices"                    value={String(outstanding.length)} />
        </StatBar>
      )}
      {tab === "all" && (
        <StatBar>
          <StatItem icon={CheckCircle2} label="Total Collected" value={currency(totalCollected)} />
          <StatItem icon={TrendingUp}   label="This Month"      value={currency(thisMonth)} />
          <StatItem icon={Receipt}      label="Last Month"      value={currency(lastMonth)} />
          <StatItem icon={FileText}     label="Payments"        value={String(allPayments.length)} />
        </StatBar>
      )}

      <PageTabs>
        <PageTab active={tab === "outstanding"} onClick={() => setTab("outstanding")}>Outstanding</PageTab>
        <PageTab active={tab === "all"}         onClick={() => setTab("all")}>All Payments</PageTab>
        <PageTab active={tab === "collect"}     onClick={() => setTab("collect")}>Collect Payment</PageTab>
      </PageTabs>

      {tab === "outstanding" && (
        <FilterBar>
          <SearchInput value={outSearch} onChange={setOutSearch} placeholder="Search invoice #, customer…" />
        </FilterBar>
      )}
      {tab === "all" && (
        <FilterBar>
          <SearchInput value={allSearch} onChange={setAllSearch} placeholder="Search invoice #, customer, reference…" />
          <FilterSelect value={methodFilter} onChange={setMethodFilter}>
            <option value="all">All Methods</option>
            <option value="check">Check</option>
            <option value="ach">ACH</option>
            <option value="credit_card">Credit Card</option>
            <option value="wire">Wire</option>
            <option value="cash">Cash</option>
          </FilterSelect>
        </FilterBar>
      )}

      {tab === "outstanding" && <OutstandingTab outstanding={outstanding} search={outSearch} onCollect={handleCollect} />}
      {tab === "all"         && <AllPaymentsTab allPayments={allPayments} search={allSearch} methodFilter={methodFilter} />}
      {tab === "collect"     && <CollectTab outstanding={outstanding} invoiceId={collectInvoiceId} onInvoiceChange={setCollectInvoiceId} />}
    </div>
  );
}

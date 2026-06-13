import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useNewIntent } from "@/hooks/use-new-intent";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/ui/form-select";
import {
  AlertCircle, Check, CheckCircle2, ChevronsUpDown,
  CreditCard, Download, FileText, Pencil, Plus, X,
} from "lucide-react";
import {
  StatBar, StatItem, FilterBar, SearchInput, FilterSelect,
  PageTabs, PageTab,
} from "@/components/ui/page-components";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate } from "@/lib/supabase/types";
import { SC } from "@/lib/status-colors";

export const Route = createFileRoute("/finance/invoices")({
  head: () => ({ meta: [{ title: "Invoices · BearingPro" }] }),
  validateSearch: (search: Record<string, unknown>): { invoice?: string; create?: string } => ({
    invoice: typeof search.invoice === "string" ? search.invoice : undefined,
    create: typeof search.create === "string" ? search.create : undefined,
  }),
  component: InvoicesPage,
});

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";

type DbLineItem = {
  id: string;
  invoice_id: string;
  description: string;
  qty: number;
  unit_price: number;
  total: number;
  sort_order: number;
};

type DbPayment = {
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
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string;
  invoice_line_items: DbLineItem[];
  invoice_payments: DbPayment[];
};

interface LineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  companyName: string;
  contactName: string;
  linkedProjectId: string | null;
  linkedWorkOrderId: string | null;
  issuedDate: string;
  dueDate: string;
  paymentTerms: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  lineItems: LineItem[];
  payments: Payment[];
}

type DbProject = {
  id: string; code: string; name: string;
  company: { id: string; name: string } | null;
  contact: { id: string; full_name: string } | null;
};
type DbWorkOrder = { id: string; code: string; name: string };

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: SC.neutral },
  sent:    { label: "Sent",    cls: SC.blue },
  partial: { label: "Partial", cls: SC.amber },
  paid:    { label: "Paid",    cls: SC.green },
  overdue: { label: "Overdue", cls: SC.red },
  void:    { label: "Void",    cls: SC.neutral },
};

const TABS: { key: InvoiceStatus | "all"; label: string }[] = [
  { key: "all",     label: "All"     },
  { key: "draft",   label: "Draft"   },
  { key: "sent",    label: "Sent"    },
  { key: "partial", label: "Partial" },
  { key: "overdue", label: "Overdue" },
  { key: "paid",    label: "Paid"    },
];

const METHOD_LABELS: Record<string, string> = {
  check:       "Check",
  ach:         "ACH",
  credit_card: "Credit Card",
  wire:        "Wire Transfer",
  cash:        "Cash",
};

const PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"];

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";
const labelCls = "block text-2xs uppercase tracking-wider text-muted-foreground font-medium mb-1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function toInvoice(r: DbInvoice): Invoice {
  return {
    id:                r.id,
    number:            r.invoice_number,
    status:            r.status as InvoiceStatus,
    companyName:       r.company_name,
    contactName:       r.contact_name,
    linkedProjectId:   r.linked_project_id,
    linkedWorkOrderId: r.linked_work_order_id,
    issuedDate:        r.issued_date,
    dueDate:           r.due_date,
    paymentTerms:      r.payment_terms,
    subtotal:          Number(r.subtotal),
    taxRate:           Number(r.tax_rate),
    taxAmount:         Number(r.tax_amount),
    total:             Number(r.total),
    amountPaid:        Number(r.amount_paid),
    balanceDue:        Number(r.balance_due),
    notes:             r.notes,
    lineItems: (r.invoice_line_items ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((li) => ({
        id:          li.id,
        description: li.description,
        qty:         Number(li.qty),
        unitPrice:   Number(li.unit_price),
        total:       Number(li.total),
      })),
    payments: (r.invoice_payments ?? [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        id:        p.id,
        date:      p.date,
        amount:    Number(p.amount),
        method:    p.method,
        reference: p.reference,
      })),
  };
}

// ─── Line item data functions ─────────────────────────────────────────────────

async function recalcInvoiceTotals(invoiceId: string) {
  const { data } = await supabase
    .from("invoices")
    .select("tax_rate, amount_paid, invoice_line_items(total)")
    .eq("id", invoiceId)
    .single();
  if (!data) return;
  const subtotal = (data.invoice_line_items as { total: number }[])
    .reduce((s, li) => s + Number(li.total), 0);
  const taxAmount = subtotal * Number(data.tax_rate ?? 0);
  const total = subtotal + taxAmount;
  const balanceDue = Math.max(0, total - Number(data.amount_paid ?? 0));
  const { error } = await supabase
    .from("invoices")
    .update({ subtotal, tax_amount: taxAmount, total, balance_due: balanceDue })
    .eq("id", invoiceId);
  if (error) throw error;
}

async function insertInvoiceLineItem(
  invoiceId: string,
  item: { description: string; qty: number; unit_price: number },
) {
  const total = item.qty * item.unit_price;
  const { error } = await supabase
    .from("invoice_line_items")
    .insert({ invoice_id: invoiceId, ...item, total });
  if (error) throw error;
  await recalcInvoiceTotals(invoiceId);
}

async function deleteInvoiceLineItem(invoiceId: string, lineItemId: string) {
  const { error } = await supabase.from("invoice_line_items").delete().eq("id", lineItemId);
  if (error) throw error;
  await recalcInvoiceTotals(invoiceId);
}

async function importProjectLineItems(invoiceId: string, projectId: string) {
  const { data: parts, error: fetchErr } = await supabase
    .from("project_line_items")
    .select("name, qty, unit_cost")
    .eq("project_id", projectId);
  if (fetchErr) throw fetchErr;
  if (!parts || parts.length === 0) return;
  const rows = parts.map((p) => ({
    invoice_id:  invoiceId,
    description: p.name,
    qty:         Number(p.qty),
    unit_price:  Number(p.unit_cost),
    total:       Number(p.qty) * Number(p.unit_cost),
  }));
  const { error: insertErr } = await supabase.from("invoice_line_items").insert(rows);
  if (insertErr) throw insertErr;
  await recalcInvoiceTotals(invoiceId);
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, cls } = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── JobCombobox ──────────────────────────────────────────────────────────────

function JobCombobox({
  value,
  onChange,
  projects,
  workOrders,
}: {
  value: string;
  onChange: (id: string) => void;
  projects: DbProject[];
  workOrders: DbWorkOrder[];
}) {
  const [open, setOpen] = useState(false);

  const selectedProject   = value.startsWith("p:") ? projects.find((p) => p.id === value.slice(2)) ?? null : null;
  const selectedWorkOrder = value.startsWith("w:") ? workOrders.find((w) => w.id === value.slice(2)) ?? null : null;
  const selected          = selectedProject ?? selectedWorkOrder;
  const selectedType      = selectedProject ? "project" : selectedWorkOrder ? "work-order" : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/30 transition-colors"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium",
                selectedType === "work-order"
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
              )}>
                {selectedType === "work-order" ? "WO" : "Proj"}
              </span>
              <span className="font-mono text-xs shrink-0">{selected.code}</span>
              <span className="text-muted-foreground truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">Search projects &amp; work orders…</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-110 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by code or name…" />
          <CommandList>
            <CommandEmpty>No jobs found.</CommandEmpty>
            {value && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => { onChange(""); setOpen(false); }}
                    className="text-sm text-muted-foreground gap-2"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" /> Clear selection
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {projects.length > 0 && (
              <CommandGroup heading="Projects">
                {projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`p:${p.id}`}
                    onSelect={(v) => { onChange(v); setOpen(false); }}
                    className="text-sm gap-2"
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === `p:${p.id}` ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{p.code}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {workOrders.length > 0 && (
              <CommandGroup heading="Work Orders">
                {workOrders.map((w) => (
                  <CommandItem
                    key={w.id}
                    value={`w:${w.id}`}
                    onSelect={(v) => { onChange(v); setOpen(false); }}
                    className="text-sm gap-2"
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === `w:${w.id}` ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{w.code}</span>
                    <span className="flex-1 truncate">{w.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── InvoiceDrawer ────────────────────────────────────────────────────────────

type DrawerMode = "view" | "edit";

function InvoiceDrawer({
  open,
  invoice,
  mode,
  projects,
  workOrders,
  onClose,
  onSwitchToEdit,
  onSave,
  isPending,
  onAddLineItem,
  onDeleteLineItem,
  onImportFromParts,
  isLineItemPending,
}: {
  open: boolean;
  invoice: Invoice | null;
  mode: DrawerMode;
  projects: DbProject[];
  workOrders: DbWorkOrder[];
  onClose: () => void;
  onSwitchToEdit: () => void;
  onSave: (patch: TablesUpdate<"invoices">) => void;
  isPending: boolean;
  onAddLineItem: (item: { description: string; qty: number; unit_price: number }) => void;
  onDeleteLineItem: (lineItemId: string) => void;
  onImportFromParts: () => void;
  isLineItemPending?: boolean;
}) {
  const [form, setForm] = useState<{
    status: InvoiceStatus;
    paymentTerms: string;
    issuedDate: string;
    dueDate: string;
    companyName: string;
    contactName: string;
    linkedJobId: string;
    notes: string;
  }>({
    status: "draft", paymentTerms: "Net 30",
    issuedDate: "", dueDate: "",
    companyName: "", contactName: "",
    linkedJobId: "", notes: "",
  });

  const initializedRef = useRef(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ description: "", qty: "1", unit_price: "" });

  useEffect(() => {
    if (!open || !invoice) { initializedRef.current = false; setAddingItem(false); return; }
    if (initializedRef.current) return;
    initializedRef.current = true;
    setForm({
      status:       invoice.status,
      paymentTerms: invoice.paymentTerms,
      issuedDate:   invoice.issuedDate,
      dueDate:      invoice.dueDate,
      companyName:  invoice.companyName,
      contactName:  invoice.contactName,
      linkedJobId:  invoice.linkedProjectId
        ? `p:${invoice.linkedProjectId}`
        : invoice.linkedWorkOrderId
          ? `w:${invoice.linkedWorkOrderId}`
          : "",
      notes: invoice.notes,
    });
  }, [open, invoice]);

  function field(key: keyof typeof form) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  function handleSave() {
    const patch: TablesUpdate<"invoices"> = {
      status:                form.status,
      payment_terms:         form.paymentTerms,
      issued_date:           form.issuedDate,
      due_date:              form.dueDate,
      company_name:          form.companyName,
      contact_name:          form.contactName,
      linked_project_id:     form.linkedJobId.startsWith("p:") ? form.linkedJobId.slice(2) : null,
      linked_work_order_id:  form.linkedJobId.startsWith("w:") ? form.linkedJobId.slice(2) : null,
      notes:                 form.notes,
    };
    onSave(patch);
  }

  if (!invoice) return null;

  const paidPct = invoice.total > 0 ? Math.round((invoice.amountPaid / invoice.total) * 100) : 0;

  const linkedProject   = invoice.linkedProjectId   ? projects.find((p) => p.id === invoice.linkedProjectId)   : null;
  const linkedWorkOrder = invoice.linkedWorkOrderId ? workOrders.find((w) => w.id === invoice.linkedWorkOrderId) : null;
  const linkedJob       = linkedProject ?? linkedWorkOrder;
  const linkedJobLabel  = linkedProject
    ? `${linkedProject.code} — ${linkedProject.name}`
    : linkedWorkOrder
      ? `${linkedWorkOrder.code} — ${linkedWorkOrder.name}`
      : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="flex w-full max-w-140 flex-col gap-0 p-0 overflow-hidden">

        <SheetHeader className="shrink-0 flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4 pr-12">
          <div>
            <p className="text-2xs uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
              {invoice.number}
            </p>
            <SheetTitle className="text-md font-semibold leading-snug">
              {invoice.companyName}
            </SheetTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{invoice.contactName}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </SheetHeader>

        {/* View mode */}
        {mode === "view" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Issued", value: fmtDate(invoice.issuedDate) },
                  { label: "Due",    value: fmtDate(invoice.dueDate) },
                  { label: "Terms",  value: invoice.paymentTerms },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-border bg-surface p-2.5">
                    <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className={cn("text-sm font-medium", label === "Due" && invoice.status === "overdue" && "text-red-500")}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {linkedJobLabel && (
                <div>
                  <p className={labelCls}>Linked Job</p>
                  <p className="text-sm text-primary font-medium">{linkedJobLabel}</p>
                </div>
              )}

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className={labelCls}>Line Items</p>
                  <div className="flex items-center gap-2">
                    {invoice.linkedProjectId && invoice.lineItems.length === 0 && (
                      <button
                        type="button"
                        onClick={onImportFromParts}
                        disabled={isLineItemPending}
                        className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" /> Import from Parts List
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAddingItem(true); setNewItem({ description: "", qty: "1", unit_price: "" }); }}
                      disabled={addingItem || isLineItemPending}
                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" /> Add Item
                    </button>
                  </div>
                </div>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left py-1.5 px-3 font-medium">Description</th>
                        <th className="text-right py-1.5 px-3 font-medium">Qty</th>
                        <th className="text-right py-1.5 px-3 font-medium">Unit</th>
                        <th className="text-right py-1.5 px-3 font-medium">Total</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems.length === 0 && !addingItem && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                            No line items yet
                          </td>
                        </tr>
                      )}
                      {invoice.lineItems.map((li, idx) => (
                        <tr key={li.id} className={cn("group border-t border-border/60", idx % 2 === 1 && "bg-muted/20")}>
                          <td className="py-2 px-3 text-foreground">{li.description}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{li.qty}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{currency(li.unitPrice)}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{currency(li.total)}</td>
                          <td className="py-1 pr-2 text-right">
                            <button
                              type="button"
                              onClick={() => onDeleteLineItem(li.id)}
                              disabled={isLineItemPending}
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-30"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {addingItem && (
                        <tr className="border-t border-border/60 bg-muted/10">
                          <td className="py-1.5 px-2">
                            <input
                              autoFocus
                              value={newItem.description}
                              onChange={(e) => setNewItem((n) => ({ ...n, description: e.target.value }))}
                              placeholder="Description"
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-16">
                            <input
                              type="number"
                              min="1"
                              value={newItem.qty}
                              onChange={(e) => setNewItem((n) => ({ ...n, qty: e.target.value }))}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-24">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={newItem.unit_price}
                              onChange={(e) => setNewItem((n) => ({ ...n, unit_price: e.target.value }))}
                              placeholder="0.00"
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground text-xs">
                            {newItem.qty && newItem.unit_price
                              ? currency(Number(newItem.qty) * Number(newItem.unit_price))
                              : "—"}
                          </td>
                          <td className="py-1 pr-2">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const qty = Number(newItem.qty);
                                  const unit_price = Number(newItem.unit_price);
                                  if (!newItem.description.trim() || qty <= 0 || unit_price < 0) return;
                                  onAddLineItem({ description: newItem.description.trim(), qty, unit_price });
                                  setAddingItem(false);
                                }}
                                disabled={!newItem.description.trim() || !newItem.qty || !newItem.unit_price || isLineItemPending}
                                className="h-5 px-1.5 rounded text-2xs bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingItem(false)}
                                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-accent"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-md border border-border bg-surface p-3 space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{currency(invoice.subtotal)}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({(invoice.taxRate * 100).toFixed(invoice.taxRate % 0.01 === 0 ? 0 : 2)}%)</span>
                    <span className="tabular-nums">{currency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold border-t border-border pt-1.5 mt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{currency(invoice.total)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Amount Paid</span>
                      <span className="tabular-nums">−{currency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-amber-600 dark:text-amber-400">
                      <span>Balance Due</span>
                      <span className="tabular-nums">{currency(invoice.balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>

              {invoice.status === "partial" && (
                <div>
                  <div className="flex justify-between text-2xs text-muted-foreground mb-1">
                    <span>Payment progress</span>
                    <span>{paidPct}% received</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${paidPct}%` }} />
                  </div>
                </div>
              )}

              {/* Payment history */}
              {invoice.payments.length > 0 && (
                <div>
                  <p className={labelCls}>Payment History</p>
                  <div className="space-y-2">
                    {invoice.payments.map((pmt) => (
                      <div key={pmt.id} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{currency(pmt.amount)}</p>
                          <p className="text-2xs text-muted-foreground">{fmtDate(pmt.date)} · {METHOD_LABELS[pmt.method] ?? pmt.method}</p>
                        </div>
                        <p className="text-2xs font-mono text-muted-foreground">{pmt.reference}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <p className={labelCls}>Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border px-5 py-3">
              <div className="text-xs text-muted-foreground">
                {invoice.status === "overdue" && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" /> {fmtDate(invoice.dueDate)} — overdue
                  </span>
                )}
                {invoice.status === "paid" && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Paid in full
                  </span>
                )}
              </div>
              <button
                onClick={onSwitchToEdit}
                className="flex items-center gap-1.5 h-8 rounded-md border border-border bg-surface px-3 text-sm hover:bg-accent transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {mode === "edit" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <FormSelect {...field("status")} className={cn(inputCls, "cursor-pointer")}>
                    {(Object.keys(STATUS_META) as InvoiceStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <label className={labelCls}>Payment Terms</label>
                  <FormSelect {...field("paymentTerms")} className={cn(inputCls, "cursor-pointer")}>
                    {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </FormSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Issued Date</label>
                  <input type="date" {...field("issuedDate")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input type="date" {...field("dueDate")} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Customer</label>
                  <input {...field("companyName")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contact</label>
                  <input {...field("contactName")} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Linked Job</label>
                <JobCombobox
                  value={form.linkedJobId}
                  onChange={(v) => setForm((f) => ({ ...f, linkedJobId: v }))}
                  projects={projects}
                  workOrders={workOrders}
                />
              </div>

              {/* Line items read-only in edit mode — editing happens in view mode */}
              {invoice.lineItems.length > 0 && (
                <div>
                  <p className={labelCls}>Line Items ({invoice.lineItems.length})</p>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-left py-1.5 px-3 font-medium">Description</th>
                          <th className="text-right py-1.5 px-3 font-medium">Qty</th>
                          <th className="text-right py-1.5 px-3 font-medium">Unit</th>
                          <th className="text-right py-1.5 px-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.lineItems.map((li, idx) => (
                          <tr key={li.id} className={cn("border-t border-border/60", idx % 2 === 1 && "bg-muted/20")}>
                            <td className="py-2 px-3">{li.description}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{li.qty}</td>
                            <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{currency(li.unitPrice)}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-medium">{currency(li.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Internal notes…"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => { initializedRef.current = false; onSwitchToEdit(); }}
                className="h-8 rounded-md border border-border bg-surface px-3 text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── NewInvoiceModal ──────────────────────────────────────────────────────────

const newInvoiceDefaults = {
  companyName: "", contactName: "",
  linkedJobId: "", issuedDate: "", dueDate: "",
  paymentTerms: "Net 30", notes: "",
};

function NewInvoiceModal({
  onClose,
  onCreate,
  isPending,
  projects,
  workOrders,
}: {
  onClose: () => void;
  onCreate: (form: typeof newInvoiceDefaults) => void;
  isPending: boolean;
  projects: DbProject[];
  workOrders: DbWorkOrder[];
}) {
  const [form, setForm] = useState({ ...newInvoiceDefaults, issuedDate: today() });

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-md font-semibold">New Invoice</h2>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Customer</label>
              <input {...field("companyName")} placeholder="Company name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact</label>
              <input {...field("contactName")} placeholder="Contact name" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Linked Job</label>
            <JobCombobox
              value={form.linkedJobId}
              onChange={(v) => {
                const update: Partial<typeof form> = { linkedJobId: v };
                if (v.startsWith("p:")) {
                  const proj = projects.find((p) => p.id === v.slice(2));
                  if (proj?.company?.name) update.companyName = proj.company.name;
                  if (proj?.contact?.full_name) update.contactName = proj.contact.full_name;
                }
                setForm((f) => ({ ...f, ...update }));
              }}
              projects={projects}
              workOrders={workOrders}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Issue Date</label>
              <input type="date" {...field("issuedDate")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Payment Terms</label>
              <FormSelect {...field("paymentTerms")} className={cn(inputCls, "cursor-pointer")}>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </FormSelect>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              {...field("notes")}
              rows={2}
              placeholder="Internal notes…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>
          <p className="text-2xs text-muted-foreground">Invoice is created as a draft. Add line items after creating.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-md border border-border bg-surface px-3 text-sm hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onCreate(form)}
            disabled={isPending || !form.companyName.trim() || !form.issuedDate}
            className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InvoicesPage ─────────────────────────────────────────────────────────────

function InvoicesPage() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const [tab, setTab] = useState<InvoiceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  useNewIntent(() => setNewOpen(true));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");

  const { data: rawInvoices = [], isLoading } = useQuery({
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

  const { data: rawProjects = [] } = useQuery({
    queryKey: ["projects-invoice-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, code, name, company:companies(id, name), contact:contacts(id, full_name)")
        .neq("status", "cancelled")
        .order("code");
      if (error) throw error;
      return data as unknown as DbProject[];
    },
  });

  const { data: rawWorkOrders = [] } = useQuery({
    queryKey: ["work-orders-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, code, name")
        .neq("status", "cancelled")
        .order("code");
      if (error) throw error;
      return data as DbWorkOrder[];
    },
  });

  const invoices = useMemo(() => rawInvoices.map(toInvoice), [rawInvoices]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"invoices"> }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(patch)
        .eq("id", id)
        .select("*, invoice_line_items(*), invoice_payments(*)")
        .single();
      if (error) throw error;
      return data as unknown as DbInvoice;
    },
    onSuccess: (updated) => {
      qc.setQueryData<DbInvoice[]>(["invoices"], (prev = []) =>
        prev.map((inv) => (inv.id === updated.id ? updated : inv)),
      );
      setDrawerMode("view");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof newInvoiceDefaults) => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      const maxNum = rawInvoices.reduce((max, inv) => {
        const n = parseInt(inv.invoice_number.replace(/[^0-9]/g, ""), 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 4815);
      const invoiceNumber = `INV-${String(maxNum + 1).padStart(5, "0")}`;

      const termsDays: Record<string, number> = {
        "Due on Receipt": 0, "Net 15": 15, "Net 30": 30, "Net 45": 45, "Net 60": 60,
      };
      const days = termsDays[form.paymentTerms] ?? 30;
      const issued = new Date(form.issuedDate);
      const due = new Date(issued);
      due.setDate(due.getDate() + days);
      const dueDate = due.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          tenant_id:           tenantId!,
          invoice_number:      invoiceNumber,
          status:              "draft",
          company_name:        form.companyName,
          contact_name:        form.contactName,
          linked_project_id:   form.linkedJobId.startsWith("p:") ? form.linkedJobId.slice(2) : null,
          linked_work_order_id: form.linkedJobId.startsWith("w:") ? form.linkedJobId.slice(2) : null,
          issued_date:         form.issuedDate,
          due_date:            dueDate,
          payment_terms:       form.paymentTerms,
          notes:               form.notes,
        })
        .select("*, invoice_line_items(*), invoice_payments(*)")
        .single();
      if (error) throw error;
      return data as unknown as DbInvoice;
    },
    onSuccess: (created) => {
      qc.setQueryData<DbInvoice[]>(["invoices"], (prev = []) => [created, ...prev]);
      setNewOpen(false);
    },
  });

  const addLineItemMutation = useMutation({
    mutationFn: ({ invoiceId, item }: { invoiceId: string; item: { description: string; qty: number; unit_price: number } }) =>
      insertInvoiceLineItem(invoiceId, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: ({ invoiceId, lineItemId }: { invoiceId: string; lineItemId: string }) =>
      deleteInvoiceLineItem(invoiceId, lineItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const importPartsMutation = useMutation({
    mutationFn: ({ invoiceId, projectId }: { invoiceId: string; projectId: string }) =>
      importProjectLineItems(invoiceId, projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((i) => {
      if (tab !== "all" && i.status !== tab) return false;
      if (customerFilter !== "all" && i.companyName !== customerFilter) return false;
      if (q && !i.number.toLowerCase().includes(q) && !i.companyName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invoices, tab, search, customerFilter]);

  const outstanding   = useMemo(() => invoices.filter((i) => ["sent","partial","overdue"].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0), [invoices]);
  const overdueTotal  = useMemo(() => invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.balanceDue, 0), [invoices]);
  const overdueCount  = useMemo(() => invoices.filter((i) => i.status === "overdue").length, [invoices]);
  const paidMTD       = useMemo(() => {
    const now = new Date();
    return invoices.filter((i) => {
      if (i.status !== "paid") return false;
      const d = new Date(i.issuedDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).reduce((s, i) => s + i.total, 0);
  }, [invoices]);

  const customers = useMemo(() => Array.from(new Set(invoices.map((i) => i.companyName))).sort(), [invoices]);

  const selected = useMemo(() => invoices.find((i) => i.id === selectedId) ?? null, [invoices, selectedId]);

  // Deep-link: ?invoice=<id> (e.g. from the command palette) opens that invoice's
  // drawer, then strips the param so it doesn't re-open.
  const navigate = useNavigate();
  const { invoice: invoiceParam } = Route.useSearch();
  useEffect(() => {
    if (!invoiceParam || !invoices.some((i) => i.id === invoiceParam)) return;
    setSelectedId(invoiceParam);
    setDrawerMode("view");
    navigate({ to: "/finance/invoices", replace: true });
  }, [invoiceParam, invoices, navigate]);

  useEffect(() => {
    setMeta({
      title: "Invoices",
      subtitle: `${invoices.length} invoices`,
      onNew: () => setNewOpen(true),
      newLabel: "New Invoice",
    });
  }, [setMeta, invoices.length]);

  return (
    <div className={cn("flex flex-col", isLoading && "opacity-50")}>
      <StatBar>
        <StatItem icon={CreditCard}   label="Outstanding"    value={currency(outstanding)} />
        <StatItem icon={AlertCircle}  label="Overdue"        value={`${currency(overdueTotal)} (${overdueCount})`} accent={overdueCount > 0} />
        <StatItem icon={CheckCircle2} label="Collected MTD"  value={currency(paidMTD)} />
        <StatItem icon={FileText}     label="Total Invoices" value={String(invoices.length)} />
      </StatBar>

      <PageTabs>
        {TABS.map(({ key, label }) => {
          const count = key === "all" ? invoices.length : invoices.filter((i) => i.status === key).length;
          return (
            <PageTab key={key} active={tab === key} onClick={() => setTab(key)} count={count}>
              {label}
            </PageTab>
          );
        })}
      </PageTabs>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices…" />
        <FilterSelect value={customerFilter} onChange={setCustomerFilter}>
          <option value="all">All Customers</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
      </FilterBar>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 text-2xs uppercase tracking-wide text-muted-foreground bg-surface border-b border-border">
            <tr>
              <th className="text-left font-medium py-2 px-4">Number</th>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-right font-medium py-2">Total</th>
              <th className="text-right font-medium py-2 hidden sm:table-cell">Balance Due</th>
              <th className="text-left font-medium py-2 pl-4">Due Date</th>
              <th className="text-left font-medium py-2">Status</th>
              <th className="text-right font-medium py-2 pr-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                  No invoices match your filters.
                </td>
              </tr>
            )}
            {filtered.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-border/60 hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => { setSelectedId(inv.id); setDrawerMode("view"); }}
              >
                <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{inv.number}</td>
                <td className="py-2.5 font-medium">{inv.companyName}</td>
                <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{currency(inv.total)}</td>
                <td className="py-2.5 text-right font-mono tabular-nums hidden sm:table-cell">
                  {inv.balanceDue > 0
                    ? <span className={inv.status === "overdue" ? "text-red-500 font-semibold" : ""}>{currency(inv.balanceDue)}</span>
                    : <span className="text-green-600 dark:text-green-400">Paid</span>
                  }
                </td>
                <td className={cn("py-2.5 pl-4", inv.status === "overdue" ? "text-red-500 font-medium" : "text-muted-foreground")}>
                  {fmtDate(inv.dueDate)}
                </td>
                <td className="py-2.5"><StatusBadge status={inv.status} /></td>
                <td className="py-2.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setSelectedId(inv.id); setDrawerMode("view"); }}
                    className="text-xs text-primary hover:underline"
                  >
                    {inv.status === "draft" ? "Edit" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InvoiceDrawer
        open={selectedId !== null}
        invoice={selected}
        mode={drawerMode}
        projects={rawProjects}
        workOrders={rawWorkOrders}
        onClose={() => setSelectedId(null)}
        onSwitchToEdit={() => setDrawerMode(drawerMode === "view" ? "edit" : "view")}
        onSave={(patch) => { if (selectedId) saveMutation.mutate({ id: selectedId, patch }); }}
        isPending={saveMutation.isPending}
        onAddLineItem={(item) => { if (selectedId) addLineItemMutation.mutate({ invoiceId: selectedId, item }); }}
        onDeleteLineItem={(lineItemId) => { if (selectedId) deleteLineItemMutation.mutate({ invoiceId: selectedId, lineItemId }); }}
        onImportFromParts={() => { if (selectedId && selected?.linkedProjectId) importPartsMutation.mutate({ invoiceId: selectedId, projectId: selected.linkedProjectId }); }}
        isLineItemPending={addLineItemMutation.isPending || deleteLineItemMutation.isPending || importPartsMutation.isPending}
      />

      {newOpen && (
        <NewInvoiceModal
          onClose={() => setNewOpen(false)}
          onCreate={(form) => createMutation.mutate(form)}
          isPending={createMutation.isPending}
          projects={rawProjects}
          workOrders={rawWorkOrders}
        />
      )}
    </div>
  );
}

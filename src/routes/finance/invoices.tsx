import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Check, CheckCircle2, ChevronsUpDown, CreditCard,
  FileText, Pencil, X,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { INVOICES, type Invoice, type InvoiceStatus } from "@/data/invoices";
import { PROJECTS } from "@/data/projects";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/finance/invoices")({
  head: () => ({ meta: [{ title: "Invoices · Port City Sound & Security" }] }),
  component: InvoicesPage,
});

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: "bg-muted text-muted-foreground" },
  sent:    { label: "Sent",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  partial: { label: "Partial", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  paid:    { label: "Paid",    cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  overdue: { label: "Overdue", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  void:    { label: "Void",    cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const inputCls  = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
const labelCls  = "block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium mb-1";

const JOB_PROJECTS   = PROJECTS.filter((p) => p.type === "project"    && p.status !== "cancelled");
const JOB_WORKORDERS = PROJECTS.filter((p) => p.type === "work-order" && p.status !== "cancelled");

// ─── ProjectCombobox ──────────────────────────────────────────────────────────

interface ProjectComboboxProps {
  value: string;
  onChange: (id: string) => void;
}

function ProjectCombobox({ value, onChange }: ProjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? PROJECTS.find((p) => p.id === value) ?? null : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-[12.5px] hover:bg-accent/30 transition-colors"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                selected.type === "work-order"
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
              )}>
                {selected.type === "work-order" ? "WO" : "Proj"}
              </span>
              <span className="font-mono text-[11.5px] shrink-0">{selected.code}</span>
              <span className="text-muted-foreground truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">Search projects &amp; work orders…</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-110 p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            if (itemValue === "__clear__") return 1;
            const job = PROJECTS.find((p) => p.id === itemValue);
            if (!job) return 0;
            return `${job.code} ${job.name} ${job.customer}`.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by code, name, or customer…" />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
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
            <CommandGroup heading="Projects">
              {JOB_PROJECTS.map((job) => (
                <CommandItem
                  key={job.id}
                  value={job.id}
                  onSelect={(v) => { onChange(v); setOpen(false); }}
                  className="text-[12.5px] gap-2"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === job.id ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">{job.code}</span>
                  <span className="flex-1 truncate">{job.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 max-w-28 truncate">{job.customer}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Work Orders">
              {JOB_WORKORDERS.map((job) => (
                <CommandItem
                  key={job.id}
                  value={job.id}
                  onSelect={(v) => { onChange(v); setOpen(false); }}
                  className="text-[12.5px] gap-2"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === job.id ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">{job.code}</span>
                  <span className="flex-1 truncate">{job.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 max-w-28 truncate">{job.customer}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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

// ─── InvoiceDrawer ────────────────────────────────────────────────────────────

type DrawerMode = "view" | "edit";

interface DrawerProps {
  open: boolean;
  invoice: Invoice | null;
  mode: DrawerMode;
  onClose: () => void;
  onSwitchToEdit: () => void;
  onSave: (updated: Invoice) => void;
}

function InvoiceDrawer({ open, invoice, mode, onClose, onSwitchToEdit, onSave }: DrawerProps) {
  const [form, setForm] = useState<Partial<Invoice>>({});

  useEffect(() => {
    if (invoice) setForm({ ...invoice });
  }, [invoice]);

  if (!invoice) return null;

  function field(key: keyof Invoice) {
    return {
      value: (form[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function handleSave() {
    onSave({ ...invoice!, ...form } as Invoice);
  }

  const paidPct = invoice.total > 0 ? Math.round((invoice.amountPaid / invoice.total) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="flex w-full max-w-140 flex-col gap-0 p-0 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="shrink-0 flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4 pr-12">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
              {invoice.number}
            </p>
            <SheetTitle className="text-[15px] font-semibold leading-snug">
              {invoice.companyName}
            </SheetTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">{invoice.contactName}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </SheetHeader>

        {/* View mode */}
        {mode === "view" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Key dates / terms */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Issued",  value: invoice.issuedDate   },
                  { label: "Due",     value: invoice.dueDate       },
                  { label: "Terms",   value: invoice.paymentTerms  },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-border bg-surface p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className={cn("text-[12.5px] font-medium", label === "Due" && invoice.status === "overdue" && "text-red-500")}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Project link */}
              {invoice.projectName && (
                <div>
                  <p className={labelCls}>Linked Project</p>
                  <p className="text-[12.5px] text-primary font-medium">{invoice.projectName}</p>
                </div>
              )}

              {/* Line items */}
              <div>
                <p className={labelCls}>Line Items</p>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
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
                          <td className="py-2 px-3 text-foreground">{li.description}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{li.qty}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{currency(li.unitPrice)}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{currency(li.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-md border border-border bg-surface p-3 space-y-1.5">
                <div className="flex justify-between text-[12px] text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{currency(invoice.subtotal)}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between text-[12px] text-muted-foreground">
                    <span>Tax ({(invoice.taxRate * 100).toFixed(invoice.taxRate % 0.01 === 0 ? 0 : 2)}%)</span>
                    <span className="tabular-nums">{currency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] font-semibold border-t border-border pt-1.5 mt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{currency(invoice.total)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-[12px] text-green-600 dark:text-green-400">
                      <span>Amount Paid</span>
                      <span className="tabular-nums">−{currency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                      <span>Balance Due</span>
                      <span className="tabular-nums">{currency(invoice.balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Payment progress for partial */}
              {invoice.status === "partial" && (
                <div>
                  <div className="flex justify-between text-[10.5px] text-muted-foreground mb-1">
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
                          <p className="text-[12px] font-medium">{currency(pmt.amount)}</p>
                          <p className="text-[10.5px] text-muted-foreground">{pmt.date} · {METHOD_LABELS[pmt.method]}</p>
                        </div>
                        <p className="text-[10.5px] font-mono text-muted-foreground">{pmt.reference}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div>
                  <p className={labelCls}>Notes</p>
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border px-5 py-3">
              <div className="text-[11px] text-muted-foreground">
                {invoice.status === "overdue" && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" /> {invoice.dueDate} — overdue
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
                className="flex items-center gap-1.5 h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors"
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
                  <select {...field("status")} className={cn(inputCls, "cursor-pointer")}>
                    {(Object.keys(STATUS_META) as InvoiceStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Payment Terms</label>
                  <select {...field("paymentTerms")} className={cn(inputCls, "cursor-pointer")}>
                    {["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Issued Date</label>
                  <input {...field("issuedDate")} className={inputCls} placeholder="Jun 1, 2026" />
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input {...field("dueDate")} className={inputCls} placeholder="Jul 1, 2026" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Customer</label>
                <input {...field("companyName")} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Contact</label>
                <input {...field("contactName")} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Linked Project</label>
                <input {...field("projectName")} className={inputCls} placeholder="— none —" />
              </div>

              {/* Line items (read-only in edit for now) */}
              <div>
                <p className={labelCls}>Line Items</p>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
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
                <p className="text-[10.5px] text-muted-foreground mt-1.5">Line item editing coming in the quote builder integration.</p>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  value={(form.notes as string) ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Internal notes…"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={onSwitchToEdit}
                className="h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="h-8 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── NewInvoiceModal ──────────────────────────────────────────────────────────

function NewInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [linkedProjectId, setLinkedProjectId] = useState("");

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[14px] font-semibold">New Invoice</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Customer</label>
              <input className={inputCls} placeholder="Company name" />
            </div>
            <div>
              <label className={labelCls}>Contact</label>
              <input className={inputCls} placeholder="Contact name" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Linked Project</label>
            <ProjectCombobox value={linkedProjectId} onChange={setLinkedProjectId} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Issue Date</label>
              <input className={inputCls} placeholder="Jun 7, 2026" />
            </div>
            <div>
              <label className={labelCls}>Payment Terms</label>
              <select className={cn(inputCls, "cursor-pointer")}>
                {["Net 30", "Net 15", "Net 45", "Due on Receipt"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" placeholder="Internal notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors">
            Cancel
          </button>
          <button onClick={onClose} className="h-8 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InvoicesPage ─────────────────────────────────────────────────────────────

function InvoicesPage() {
  const { setMeta } = useMeta();
  const [invoices, setInvoices] = useState<Invoice[]>(INVOICES);
  const [tab, setTab] = useState<InvoiceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");

  useEffect(() => {
    setMeta({
      title: "Invoices",
      subtitle: `${invoices.length} invoices`,
      onNew: () => setNewOpen(true),
      newLabel: "+ New Invoice",
    });
  }, [setMeta, invoices.length]);

  // Stat aggregates
  const outstanding = useMemo(
    () => invoices.filter((i) => i.status === "sent" || i.status === "partial" || i.status === "overdue").reduce((s, i) => s + i.balanceDue, 0),
    [invoices],
  );
  const overdueTotal = useMemo(
    () => invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.balanceDue, 0),
    [invoices],
  );
  const paidMTD = useMemo(
    () => invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
    [invoices],
  );
  const overdueCount = useMemo(() => invoices.filter((i) => i.status === "overdue").length, [invoices]);

  // Unique customers for filter
  const customers = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.companyName))).sort(),
    [invoices],
  );

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((i) => {
      if (tab !== "all" && i.status !== tab) return false;
      if (customerFilter !== "all" && i.companyName !== customerFilter) return false;
      if (q && !i.number.toLowerCase().includes(q) && !i.companyName.toLowerCase().includes(q) && !(i.projectName ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invoices, tab, search, customerFilter]);

  function openView(inv: Invoice) {
    setSelected(inv);
    setDrawerMode("view");
  }
  function handleSave(updated: Invoice) {
    setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelected(updated);
    setDrawerMode("view");
  }

  return (
    <div className="flex flex-col">
      {/* Stat bar */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {[
          { icon: CreditCard,   label: "Outstanding",   value: currency(outstanding),          accent: false },
          { icon: AlertCircle,  label: "Overdue",        value: `${currency(overdueTotal)} (${overdueCount})`, accent: overdueCount > 0 },
          { icon: CheckCircle2, label: "Collected MTD",  value: currency(paidMTD),              accent: false },
          { icon: FileText,     label: "Total Invoices", value: String(invoices.length),        accent: false },
        ].map(({ icon: Icon, label, value, accent }) => (
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

      {/* Status tabs */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const count = key === "all" ? invoices.length : invoices.filter((i) => i.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                tab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoices…"
          className="h-7 min-w-40 flex-1 rounded-md border border-border bg-surface px-2.5 text-[12px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">All Customers</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 z-10 text-[10.5px] uppercase tracking-wide text-muted-foreground bg-surface border-b border-border">
            <tr>
              <th className="text-left font-medium py-2 px-4">Number</th>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-left font-medium py-2 hidden md:table-cell">Project</th>
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
                <td colSpan={8} className="py-12 text-center text-muted-foreground text-[12px]">
                  No invoices match your filters.
                </td>
              </tr>
            )}
            {filtered.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-border/60 hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => openView(inv)}
              >
                <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">{inv.number}</td>
                <td className="py-2.5 font-medium">{inv.companyName}</td>
                <td className="py-2.5 text-muted-foreground hidden md:table-cell max-w-45 truncate">
                  {inv.projectName ?? <span className="italic text-muted-foreground/50">—</span>}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{currency(inv.total)}</td>
                <td className="py-2.5 text-right font-mono tabular-nums hidden sm:table-cell">
                  {inv.balanceDue > 0
                    ? <span className={inv.status === "overdue" ? "text-red-500 font-semibold" : ""}>{currency(inv.balanceDue)}</span>
                    : <span className="text-green-600 dark:text-green-400">Paid</span>
                  }
                </td>
                <td className={cn("py-2.5 pl-4", inv.status === "overdue" ? "text-red-500 font-medium" : "text-muted-foreground")}>
                  {inv.dueDate}
                </td>
                <td className="py-2.5">
                  <StatusBadge status={inv.status} />
                </td>
                <td
                  className="py-2.5 pr-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openView(inv)}
                    className="text-[11.5px] text-primary hover:underline"
                  >
                    {inv.status === "draft" ? "Edit" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <InvoiceDrawer
        open={!!selected}
        invoice={selected}
        mode={drawerMode}
        onClose={() => setSelected(null)}
        onSwitchToEdit={() => setDrawerMode(drawerMode === "view" ? "edit" : "view")}
        onSave={handleSave}
      />

      {/* New Invoice modal */}
      <NewInvoiceModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

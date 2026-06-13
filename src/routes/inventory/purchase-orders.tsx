import { createFileRoute } from "@tanstack/react-router";
import { useNewIntent } from "@/hooks/use-new-intent";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormSelect } from "@/components/ui/form-select";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Briefcase, Check, CheckCircle2, ChevronsUpDown, Circle, Clock,
  DollarSign, ExternalLink, FileText, Package, PackageCheck, Pencil, Plus, Truck, X,
} from "lucide-react";
import {
  StatBar, StatItem, FilterBar, SearchInput, FilterSelect,
  PageTabs, PageTab,
} from "@/components/ui/page-components";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/ui/drawer-header";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate } from "@/lib/supabase/types";

export const Route = createFileRoute("/inventory/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders · BearingPro" }] }),
  component: PurchaseOrdersPage,
});

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

interface LineItem {
  id: string;
  catalogItemId: string | null;
  description: string;
  sku: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
  sortOrder: number;
}

interface PO {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  status: POStatus;
  orderDate: string;            // ISO "2026-06-07"
  expectedDate: string | null;  // ISO or null
  receivedDate: string | null;  // ISO or null
  vendorOrderNumber: string | null;
  trackingNumber: string | null;
  linkedJobId: string;          // "" | "p:uuid" | "w:uuid"
  linkedJobCode: string | null;
  linkedJobName: string | null;
  linkedJobType: "project" | "work-order" | null;
  notes: string;
  lineItems: LineItem[];
}

interface POSavePayload {
  id?: string;
  poNumber: string;
  vendorId: string;
  status: POStatus;
  orderDate: string;
  expectedDate: string | null;
  vendorOrderNumber: string | null;
  trackingNumber: string | null;
  linkedJobId: string;
  notes: string;
  lineItems: LineItem[];
}

type DbPO = {
  id: string;
  po_number: string;
  vendor_id: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  vendor_order_number: string | null;
  tracking_number: string | null;
  linked_project_id: string | null;
  linked_work_order_id: string | null;
  notes: string;
  vendors: { name: string } | null;
  po_line_items: {
    id: string;
    catalog_item_id: string | null;
    description: string;
    sku: string;
    qty_ordered: number;
    qty_received: number;
    unit_cost: number;
    sort_order: number;
  }[];
  linked_project: { id: string; code: string; name: string } | null;
  linked_work_order: { id: string; code: string; name: string } | null;
};

function toPO(r: DbPO): PO {
  const linkedJobId = r.linked_project_id
    ? `p:${r.linked_project_id}`
    : r.linked_work_order_id
      ? `w:${r.linked_work_order_id}`
      : "";
  return {
    id: r.id,
    poNumber: r.po_number,
    vendorId: r.vendor_id,
    vendorName: r.vendors?.name ?? "",
    status: r.status as POStatus,
    orderDate: r.order_date,
    expectedDate: r.expected_date,
    receivedDate: r.received_date,
    vendorOrderNumber: r.vendor_order_number,
    trackingNumber: r.tracking_number,
    linkedJobId,
    linkedJobCode: r.linked_project?.code ?? r.linked_work_order?.code ?? null,
    linkedJobName: r.linked_project?.name ?? r.linked_work_order?.name ?? null,
    linkedJobType: r.linked_project_id ? "project" : r.linked_work_order_id ? "work-order" : null,
    notes: r.notes,
    lineItems: (r.po_line_items ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((li) => ({
        id: li.id,
        catalogItemId: li.catalog_item_id,
        description: li.description,
        sku: li.sku,
        qtyOrdered: li.qty_ordered,
        qtyReceived: li.qty_received,
        unitCost: Number(li.unit_cost),
        sortOrder: li.sort_order,
      })),
  };
}

interface VendorBasic  { id: string; name: string }
interface JobOption    { id: string; code: string; name: string; customer: string; type: "project" | "work-order" }
interface CatalogEntry { id: string; name: string; sku: string; unitCost: number }

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<POStatus, {
  label: string;
  badgeCls: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  draft:     { label: "Draft",     badgeCls: "bg-muted text-muted-foreground",                                  Icon: FileText     },
  sent:      { label: "Sent",      badgeCls: "bg-blue-500/15 text-blue-600 dark:text-blue-400",                 Icon: Truck        },
  partial:   { label: "Partial",   badgeCls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",              Icon: Package      },
  received:  { label: "Received",  badgeCls: "bg-green-500/15 text-green-600 dark:text-green-400",              Icon: PackageCheck },
  cancelled: { label: "Cancelled", badgeCls: "bg-red-500/15 text-red-600 dark:text-red-400",                    Icon: X            },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function today(): string { return new Date().toISOString().split("T")[0]; }

function isOverdue(po: PO): boolean {
  if (!po.expectedDate || po.status === "received" || po.status === "cancelled") return false;
  return po.expectedDate < today();
}

function poTotal(po: PO): number {
  return po.lineItems.reduce((s, li) => s + li.qtyOrdered * li.unitCost, 0);
}

function poReceivedValue(po: PO): number {
  return po.lineItems.reduce((s, li) => s + li.qtyReceived * li.unitCost, 0);
}

function poRemainingValue(po: PO): number {
  return po.lineItems.reduce((s, li) => s + (li.qtyOrdered - li.qtyReceived) * li.unitCost, 0);
}

function receivedPct(po: PO): number {
  const total = po.lineItems.reduce((s, li) => s + li.qtyOrdered, 0);
  if (total === 0) return 0;
  return Math.round((po.lineItems.reduce((s, li) => s + li.qtyReceived, 0) / total) * 100);
}

function nextPONumber(pos: PO[]): string {
  const nums = pos.map((p) => parseInt(p.poNumber.replace("PO-", ""), 10)).filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 1184;
  return `PO-${max + 1}`;
}

function trackingUrl(n: string): string {
  if (/^1Z/i.test(n)) return `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`;
  if (/^\d{12,22}$/.test(n)) return `https://www.fedex.com/fedextrack/?tracknumbers=${encodeURIComponent(n)}`;
  return `https://www.google.com/search?q=track+${encodeURIComponent(n)}`;
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, overdue }: { status: POStatus; overdue?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap",
      overdue && status !== "received" && status !== "cancelled"
        ? "bg-red-500/15 text-red-600 dark:text-red-400"
        : m.badgeCls,
    )}>
      <m.Icon className="h-3 w-3" />
      {overdue && status !== "received" && status !== "cancelled" ? "Overdue" : m.label}
    </span>
  );
}

// ─── StatusTimeline ───────────────────────────────────────────────────────────

function StatusTimeline({ status }: { status: POStatus }) {
  const steps: Array<{ key: POStatus; label: string }> = [
    { key: "draft",    label: "Draft"    },
    { key: "sent",     label: "Sent"     },
    { key: "partial",  label: "Partial"  },
    { key: "received", label: "Received" },
  ];
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
          <X className="h-3.5 w-3.5" /> Cancelled
        </span>
      </div>
    );
  }
  const order: Record<string, number> = { draft: 0, sent: 1, partial: 2, received: 3 };
  const currentIdx = order[status] ?? 0;
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const stepIdx = order[step.key];
        const done   = stepIdx < currentIdx;
        const active = stepIdx === currentIdx;
        const future = stepIdx > currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && <div className={cn("h-px w-8", done ? "bg-green-500" : "bg-border")} />}
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                done ? "border-green-500 bg-green-500" : active ? "border-primary bg-primary/15" : "border-border bg-background",
              )}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  : active ? <Circle className="h-2 w-2 fill-primary text-primary" />
                  : <Circle className="h-2 w-2 text-muted-foreground/30" />}
              </div>
              <span className={cn(
                "text-2xs whitespace-nowrap",
                active ? "text-foreground font-medium" : future ? "text-muted-foreground/50" : "text-muted-foreground",
              )}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── LineItemProgressBar ──────────────────────────────────────────────────────

function LineItemProgressBar({ received, ordered }: { received: number; ordered: number }) {
  if (ordered === 0) return null;
  const pct  = Math.min(100, Math.round((received / ordered) * 100));
  const done = received >= ordered;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", done ? "bg-green-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-2xs font-mono tabular-nums whitespace-nowrap", done ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
        {received}/{ordered}
      </span>
    </div>
  );
}

// ─── JobCombobox ─────────────────────────────────────────────────────────────

interface JobComboboxProps {
  value: string;
  onChange: (id: string) => void;
  projects: JobOption[];
  workOrders: JobOption[];
}

function JobCombobox({ value, onChange, projects, workOrders }: JobComboboxProps) {
  const [open, setOpen] = useState(false);

  const allJobs = useMemo(() => [...projects, ...workOrders], [projects, workOrders]);
  const selected = allJobs.find((j) => (j.type === "project" ? `p:${j.id}` : `w:${j.id}`) === value) ?? null;

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
                selected.type === "work-order" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
              )}>
                {selected.type === "work-order" ? "WO" : "Proj"}
              </span>
              <span className="font-mono text-xs shrink-0">{selected.code}</span>
              <span className="text-muted-foreground truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No linked job (general stock)</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-110 p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            if (itemValue === "__clear__") return 1;
            const encoded = itemValue;
            const job = allJobs.find((j) => (j.type === "project" ? `p:${j.id}` : `w:${j.id}`) === encoded);
            if (!job) return 0;
            const haystack = `${job.code} ${job.name} ${job.customer}`.toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by code, name, or customer…" />
          <CommandList>
            <CommandEmpty>No jobs found.</CommandEmpty>
            {value && (
              <>
                <CommandGroup>
                  <CommandItem value="__clear__" onSelect={() => { onChange(""); setOpen(false); }} className="text-sm text-muted-foreground gap-2">
                    <X className="h-3.5 w-3.5 shrink-0" />
                    Clear — general stock
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Projects">
              {projects.map((job) => {
                const enc = `p:${job.id}`;
                return (
                  <CommandItem key={job.id} value={enc} onSelect={(v) => { onChange(v); setOpen(false); }} className="text-sm gap-2">
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === enc ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{job.code}</span>
                    <span className="flex-1 truncate">{job.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 truncate max-w-28">{job.customer}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Work Orders">
              {workOrders.map((job) => {
                const enc = `w:${job.id}`;
                return (
                  <CommandItem key={job.id} value={enc} onSelect={(v) => { onChange(v); setOpen(false); }} className="text-sm gap-2">
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === enc ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{job.code}</span>
                    <span className="flex-1 truncate">{job.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 truncate max-w-28">{job.customer}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── CatalogCombobox ─────────────────────────────────────────────────────────

interface CatalogComboboxProps {
  catalog: CatalogEntry[];
  onSelect: (id: string) => void;
  onCustom: () => void;
}

function CatalogCombobox({ catalog, onSelect, onCustom }: CatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  function handleSelect(id: string) {
    if (id === "__custom__") { onCustom(); } else { onSelect(id); }
    setOpen(false);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full flex items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          Add from catalog…
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-110 p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            if (itemValue === "__custom__") return 1;
            const item = catalog.find((c) => c.id === itemValue);
            if (!item) return 0;
            return `${item.name} ${item.sku}`.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name or SKU…" />
          <CommandList>
            <CommandEmpty>No catalog items found.</CommandEmpty>
            <CommandGroup heading="Catalog">
              {catalog.map((item) => (
                <CommandItem key={item.id} value={item.id} onSelect={handleSelect} className="text-sm gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{item.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{item.sku}</span>
                  </span>
                  <span className="font-mono text-sm text-muted-foreground shrink-0">{currency(item.unitCost)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="__custom__" onSelect={handleSelect} className="text-sm text-muted-foreground gap-2">
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Add custom item…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── PODrawer ─────────────────────────────────────────────────────────────────

type DrawerMode = "view" | "edit" | "new";

interface PODrawerProps {
  open: boolean;
  po: PO | null;
  mode: DrawerMode;
  suggestedPONumber?: string;
  vendors: VendorBasic[];
  projects: JobOption[];
  workOrders: JobOption[];
  catalog: CatalogEntry[];
  onClose: () => void;
  onSwitchToEdit: () => void;
  onSave: (payload: POSavePayload) => void;
  onSendPO: () => void;
  onMarkAllReceived: () => void;
  isPending: boolean;
}

const POFormSchema = z.object({
  poNumber:          z.string().min(1, "Required"),
  vendorId:          z.string().min(1, "Select a vendor"),
  status:            z.enum(["draft", "sent", "partial", "received", "cancelled"]),
  orderDate:         z.string().min(1, "Required"),
  expectedDate:      z.string(),
  vendorOrderNumber: z.string(),
  trackingNumber:    z.string(),
  linkedJobId:       z.string(),
  notes:             z.string(),
});

type POFormValues = z.infer<typeof POFormSchema>;

function PODrawer({
  open, po, mode, suggestedPONumber,
  vendors, projects, workOrders, catalog,
  onClose, onSwitchToEdit, onSave, onSendPO, onMarkAllReceived, isPending,
}: PODrawerProps) {
  const idCounter = useRef(0);

  const defaultForm: POFormValues = {
    poNumber: "", vendorId: "", status: "draft",
    orderDate: today(), expectedDate: "",
    vendorOrderNumber: "", trackingNumber: "",
    linkedJobId: "", notes: "",
  };

  const form = useForm<POFormValues>({ resolver: zodResolver(POFormSchema), defaultValues: defaultForm });

  const [lineItems, setLineItems]     = useState<LineItem[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customItem, setCustomItem]   = useState({ description: "", sku: "", qtyOrdered: 1, unitCost: 0 });

  useEffect(() => {
    if (!open) return;
    if (po && (mode === "edit" || mode === "view")) {
      form.reset({
        poNumber:          po.poNumber,
        vendorId:          po.vendorId,
        status:            po.status,
        orderDate:         po.orderDate,
        expectedDate:      po.expectedDate ?? "",
        vendorOrderNumber: po.vendorOrderNumber ?? "",
        trackingNumber:    po.trackingNumber ?? "",
        linkedJobId:       po.linkedJobId,
        notes:             po.notes,
      });
      setLineItems([...po.lineItems]);
    } else {
      form.reset({ ...defaultForm, poNumber: suggestedPONumber ?? "" });
      setLineItems([]);
    }
    setAddingCustom(false);
    setCustomItem({ description: "", sku: "", qtyOrdered: 1, unitCost: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po, mode]);

  function addFromCatalog(catalogId: string) {
    const entry = catalog.find((c) => c.id === catalogId);
    if (!entry) return;
    idCounter.current += 1;
    setLineItems((prev) => [...prev, {
      id:            `new-li-${idCounter.current}`,
      catalogItemId: entry.id,
      description:   entry.name,
      sku:           entry.sku,
      qtyOrdered:    1,
      qtyReceived:   0,
      unitCost:      entry.unitCost,
      sortOrder:     prev.length,
    }]);
  }

  function addCustom() {
    if (!customItem.description.trim()) return;
    idCounter.current += 1;
    setLineItems((prev) => [...prev, {
      id:            `new-li-${idCounter.current}`,
      catalogItemId: null,
      description:   customItem.description,
      sku:           customItem.sku,
      qtyOrdered:    customItem.qtyOrdered,
      qtyReceived:   0,
      unitCost:      customItem.unitCost,
      sortOrder:     prev.length,
    }]);
    setCustomItem({ description: "", sku: "", qtyOrdered: 1, unitCost: 0 });
    setAddingCustom(false);
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => prev.map((li) => li.id === id ? { ...li, [field]: value } : li));
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  function onSubmit(values: POFormValues) {
    onSave({
      id:                po?.id,
      poNumber:          values.poNumber,
      vendorId:          values.vendorId,
      status:            values.status,
      orderDate:         values.orderDate,
      expectedDate:      values.expectedDate || null,
      vendorOrderNumber: values.vendorOrderNumber || null,
      trackingNumber:    values.trackingNumber || null,
      linkedJobId:       values.linkedJobId,
      notes:             values.notes,
      lineItems,
    });
  }

  const overdue  = po ? isOverdue(po) : false;
  const totalVal = lineItems.reduce((s, li) => s + li.qtyOrdered * li.unitCost, 0);

  // ── View mode ────────────────────────────────────────────────────────────────

  function renderView() {
    if (!po) return null;
    const pct       = receivedPct(po);
    const remaining = poRemainingValue(po);

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-base font-semibold">{po.vendorName}</span>
              <StatusBadge status={po.status} overdue={overdue} />
              {overdue && (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium bg-red-500/15 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" /> Overdue
                </span>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface/30 px-3 py-1 divide-y divide-border/50">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Order Date</span>
                <span className="text-sm font-medium">{fmtDate(po.orderDate)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Expected</span>
                <span className={cn("text-sm font-medium", overdue && "text-red-600 dark:text-red-400")}>
                  {fmtDate(po.expectedDate)}
                  {overdue && " · Overdue"}
                </span>
              </div>
              {po.receivedDate && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">Received</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{fmtDate(po.receivedDate)}</span>
                </div>
              )}
              {po.linkedJobType && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">Job</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium",
                      po.linkedJobType === "work-order"
                        ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                    )}>
                      {po.linkedJobType === "work-order" ? "WO" : "Project"}
                    </span>
                    <span className="text-sm font-mono font-medium">{po.linkedJobCode}</span>
                    <span className="text-sm text-muted-foreground truncate max-w-32">{po.linkedJobName}</span>
                  </div>
                </div>
              )}
              {po.vendorOrderNumber && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">Vendor Order #</span>
                  <span className="text-sm font-medium font-mono">{po.vendorOrderNumber}</span>
                </div>
              )}
              {po.trackingNumber && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">Tracking #</span>
                  <a
                    href={trackingUrl(po.trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-sm font-medium font-mono text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {po.trackingNumber}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">PO Total</span>
                <span className="text-sm font-medium font-mono">{currency(poTotal(po))}</span>
              </div>
            </div>
          </div>

          <fieldset>
            <legend className="text-2xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Status</legend>
            <StatusTimeline status={po.status} />
          </fieldset>

          {(po.status === "sent" || po.status === "partial") && (
            <div className="rounded-lg border border-border bg-surface/30 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Received</span>
                <span className="font-mono tabular-nums font-semibold">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-green-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{currency(poReceivedValue(po))} received</span>
                <span>{currency(remaining)} remaining</span>
              </div>
            </div>
          )}

          <fieldset>
            <legend className="text-2xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Line Items ({po.lineItems.length})
            </legend>
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50">
              {po.lineItems.map((li) => {
                const lineDone = li.qtyReceived >= li.qtyOrdered;
                return (
                  <div key={li.id} className="px-3.5 py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug truncate">{li.description}</p>
                        <p className="text-xs text-muted-foreground font-mono">{li.sku || "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono tabular-nums">{currency(li.qtyOrdered * li.unitCost)}</p>
                        <p className="text-xs text-muted-foreground">{li.qtyOrdered} × {currency(li.unitCost)}</p>
                      </div>
                    </div>
                    {(po.status === "sent" || po.status === "partial" || po.status === "received") && (
                      <LineItemProgressBar received={li.qtyReceived} ordered={li.qtyOrdered} />
                    )}
                    {po.status === "received" && lineDone && (
                      <p className="text-2xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Fully received
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          {po.notes && (
            <fieldset>
              <legend className="text-2xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Notes</legend>
              <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border border-border bg-surface/30 px-3.5 py-3">
                {po.notes}
              </p>
            </fieldset>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div className="flex gap-2">
            {po.status === "draft" && (
              <button type="button" onClick={onSendPO}
                className="h-8 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Send PO
              </button>
            )}
            {(po.status === "sent" || po.status === "partial") && (
              <button type="button" onClick={onMarkAllReceived}
                className="h-8 rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center gap-1.5">
                <PackageCheck className="h-3.5 w-3.5" /> Mark All Received
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="h-8 rounded-md border border-border bg-surface px-3 text-sm hover:bg-accent transition-colors">
              Close
            </button>
            {po.status !== "received" && po.status !== "cancelled" && (
              <button type="button" onClick={onSwitchToEdit}
                className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Edit / New mode ──────────────────────────────────────────────────────────

  const inputCls = "h-8 w-full rounded-md border border-border bg-background px-3 text-base focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";

  function renderEdit() {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <fieldset className="space-y-4">
              <legend className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">PO Details</legend>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="poNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">PO Number *</FormLabel>
                    <FormControl><Input {...field} placeholder="PO-1185" className="h-8 text-base" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status *</FormLabel>
                    <FormControl>
                      <FormSelect value={field.value} onChange={field.onChange} onBlur={field.onBlur} className={inputCls}>
                        {(Object.keys(STATUS_META) as POStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </FormSelect>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Vendor *</FormLabel>
                  <FormControl>
                    <FormSelect value={field.value} onChange={field.onChange} onBlur={field.onBlur} className={inputCls}>
                      <option value="">Select vendor…</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </FormSelect>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="orderDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Order Date *</FormLabel>
                    <FormControl><Input {...field} type="date" className="h-8 text-base" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expectedDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Expected Date</FormLabel>
                    <FormControl><Input {...field} type="date" className="h-8 text-base" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="vendorOrderNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Vendor Order #</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. ADI-SO-254001" className="h-8 text-base" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="trackingNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Tracking #</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 1Z999AA1…" className="h-8 text-base" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes</FormLabel>
                  <FormControl><Textarea {...field} rows={2} placeholder="Optional notes…" className="text-base resize-none" /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">Linked Job</legend>
              <FormField control={form.control} name="linkedJobId" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <JobCombobox value={field.value} onChange={field.onChange} projects={projects} workOrders={workOrders} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">
                Line Items {lineItems.length > 0 && (
                  <span className="ml-1 normal-case font-normal text-muted-foreground">· {currency(totalVal)} total</span>
                )}
              </legend>

              {lineItems.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50">
                  {lineItems.map((li) => (
                    <div key={li.id} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <input
                            value={li.description}
                            onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                            placeholder="Description"
                            className="h-7 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          />
                          <div className="grid grid-cols-3 gap-1.5">
                            <input
                              value={li.sku}
                              onChange={(e) => updateLineItem(li.id, "sku", e.target.value)}
                              placeholder="SKU"
                              className="h-7 rounded border border-border bg-background px-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Qty</span>
                              <input
                                type="number" min="0" value={li.qtyOrdered}
                                onChange={(e) => updateLineItem(li.id, "qtyOrdered", parseInt(e.target.value, 10) || 0)}
                                className="h-7 w-full rounded border border-border bg-background pl-7 pr-2 text-sm tabular-nums focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                              <input
                                type="number" min="0" step="0.01" value={li.unitCost}
                                onChange={(e) => updateLineItem(li.id, "unitCost", parseFloat(e.target.value) || 0)}
                                className="h-7 w-full rounded border border-border bg-background pl-5 pr-2 text-sm tabular-nums focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                          <p className="text-sm font-mono tabular-nums text-muted-foreground">
                            {currency(li.qtyOrdered * li.unitCost)}
                          </p>
                          <button type="button" onClick={() => removeLineItem(li.id)}
                            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!addingCustom && (
                <CatalogCombobox catalog={catalog} onSelect={addFromCatalog} onCustom={() => setAddingCustom(true)} />
              )}

              {addingCustom && (
                <div className="rounded-lg border border-border bg-surface/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Custom Item</p>
                  <input
                    value={customItem.description}
                    onChange={(e) => setCustomItem((v) => ({ ...v, description: e.target.value }))}
                    placeholder="Description *"
                    className="h-7 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      value={customItem.sku}
                      onChange={(e) => setCustomItem((v) => ({ ...v, sku: e.target.value }))}
                      placeholder="SKU"
                      className="h-7 rounded border border-border bg-background px-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Qty</span>
                      <input
                        type="number" min="1" value={customItem.qtyOrdered}
                        onChange={(e) => setCustomItem((v) => ({ ...v, qtyOrdered: parseInt(e.target.value, 10) || 1 }))}
                        className="h-7 w-full rounded border border-border bg-background pl-7 pr-2 text-sm tabular-nums focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <input
                        type="number" min="0" step="0.01" value={customItem.unitCost}
                        onChange={(e) => setCustomItem((v) => ({ ...v, unitCost: parseFloat(e.target.value) || 0 }))}
                        className="h-7 w-full rounded border border-border bg-background pl-5 pr-2 text-sm tabular-nums focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAddingCustom(false)}
                      className="h-7 rounded border border-border bg-surface px-3 text-xs hover:bg-accent transition-colors">Cancel</button>
                    <button type="button" onClick={addCustom}
                      className="h-7 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">Add Item</button>
                  </div>
                </div>
              )}
            </fieldset>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button type="button" onClick={onClose}
              className="h-8 rounded-md border border-border bg-surface px-3 text-sm hover:bg-accent transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {isPending ? "Saving…" : mode === "new" ? "Create PO" : "Save Changes"}
            </button>
          </div>
        </form>
      </Form>
    );
  }

  const title =
    mode === "new"  ? "New Purchase Order"
    : mode === "edit" ? `Edit ${po?.poNumber ?? "PO"}`
    : po?.poNumber ?? "Purchase Order";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent hideClose side="right" className="w-130 flex flex-col p-0 gap-0">
        <DrawerHeader title={title} />
        {mode === "view" ? renderView() : renderEdit()}
      </SheetContent>
    </Sheet>
  );
}

// ─── POTable ──────────────────────────────────────────────────────────────────

function POTable({ pos, onView, onEdit }: { pos: PO[]; onView: (po: PO) => void; onEdit: (po: PO) => void }) {
  if (pos.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/25 mb-3" />
        <p className="text-base font-medium">No purchase orders</p>
        <p className="mt-1 text-sm text-muted-foreground">No POs match the current filters.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface/50">
            <tr>
              <th className="text-left text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2 px-4">PO # / Vendor</th>
              <th className="text-left text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2">Status</th>
              <th className="text-left text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2">Job</th>
              <th className="text-left text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2">Order Date</th>
              <th className="text-left text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2">Expected</th>
              <th className="text-right text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2">Items</th>
              <th className="text-right text-2xs uppercase tracking-wide text-muted-foreground font-medium py-2 pr-4">Total</th>
              <th className="py-2 pr-4 w-24" />
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => {
              const overdue = isOverdue(po);
              const total   = poTotal(po);
              const pct     = receivedPct(po);
              const isOpen  = po.status === "sent" || po.status === "partial";
              return (
                <tr
                  key={po.id}
                  onClick={() => onView(po)}
                  className="group border-b border-border/60 last:border-0 hover:bg-surface/40 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4">
                    <p className="font-medium">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">{po.vendorName}</p>
                    {po.trackingNumber && (
                      <a
                        href={trackingUrl(po.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 mt-0.5 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Truck className="h-2.5 w-2.5" />
                        {po.trackingNumber}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </td>
                  <td className="py-2.5 pr-3"><StatusBadge status={po.status} overdue={overdue} /></td>
                  <td className="py-2.5 pr-4 max-w-44">
                    {po.linkedJobType ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                          <span className="text-xs font-mono text-muted-foreground">{po.linkedJobCode}</span>
                        </div>
                        <p className="text-sm leading-snug truncate">{po.linkedJobName}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">General stock</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">{fmtDate(po.orderDate)}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {po.expectedDate ? (
                      <span className={cn(overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {overdue && <AlertTriangle className="inline h-3 w-3 mr-1 mb-0.5" />}
                        {fmtDate(po.expectedDate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">{po.lineItems.length}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <p className="font-mono tabular-nums font-medium">{currency(total)}</p>
                    {isOpen && pct > 0 && pct < 100 && (
                      <p className="text-2xs text-muted-foreground">{pct}% received</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1 justify-end">
                      {po.status !== "received" && po.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(po); }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded border border-border bg-surface px-2 h-6 text-xs text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PurchaseOrdersPage ───────────────────────────────────────────────────────

type TabValue = "all" | POStatus;

function PurchaseOrdersPage() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();

  const [activeTab,    setActiveTab]    = useState<TabValue>("all");
  const [search,       setSearch]       = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [jobFilter,    setJobFilter]    = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPO,   setDrawerPO]   = useState<PO | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: rawPos = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendors(name),
          po_line_items(id, catalog_item_id, description, sku, qty_ordered, qty_received, unit_cost, sort_order),
          linked_project:projects!linked_project_id(id, code, name),
          linked_work_order:work_orders!linked_work_order_id(id, code, name)
        `)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data as unknown as DbPO[];
    },
  });

  const { data: rawVendors = [] } = useQuery({
    queryKey: ["vendors-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").order("name");
      if (error) throw error;
      return data as VendorBasic[];
    },
  });

  const { data: rawProjects = [] } = useQuery({
    queryKey: ["projects-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, code, name, companies(name)")
        .not("status", "in", "(cancelled)")
        .order("code");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id:       r.id,
        code:     r.code,
        name:     r.name,
        customer: r.companies?.name ?? "",
        type:     "project" as const,
      }));
    },
  });

  const { data: rawWorkOrders = [] } = useQuery({
    queryKey: ["work-orders-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, code, name, companies(name)")
        .not("status", "in", "(cancelled)")
        .order("code");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id:       r.id,
        code:     r.code,
        name:     r.name,
        customer: r.companies?.name ?? "",
        type:     "work-order" as const,
      }));
    },
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["catalog-items-po"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("id, name, sku, cost")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, sku: r.sku, unitCost: Number(r.cost) }));
    },
  });

  const pos: PO[] = useMemo(() => rawPos.map(toPO), [rawPos]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (payload: POSavePayload) => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id!;

      let linkedProjectId: string | null = null;
      let linkedWorkOrderId: string | null = null;
      if (payload.linkedJobId.startsWith("p:"))      linkedProjectId  = payload.linkedJobId.slice(2);
      else if (payload.linkedJobId.startsWith("w:")) linkedWorkOrderId = payload.linkedJobId.slice(2);

      const poFields = {
        po_number:            payload.poNumber,
        vendor_id:            payload.vendorId,
        status:               payload.status,
        order_date:           payload.orderDate,
        expected_date:        payload.expectedDate,
        vendor_order_number:  payload.vendorOrderNumber,
        tracking_number:      payload.trackingNumber,
        linked_project_id:    linkedProjectId,
        linked_work_order_id: linkedWorkOrderId,
        notes:                payload.notes,
      };

      let poId: string;

      if (!payload.id) {
        // INSERT new PO
        const { data: newPO, error } = await supabase
          .from("purchase_orders")
          .insert({ tenant_id: tenantId, ...poFields })
          .select("id")
          .single();
        if (error) throw error;
        poId = newPO.id;
      } else {
        // UPDATE existing PO header
        const { error } = await supabase
          .from("purchase_orders")
          .update(poFields)
          .eq("id", payload.id);
        if (error) throw error;
        poId = payload.id;

        // DELETE old line items
        const { error: delErr } = await supabase
          .from("po_line_items")
          .delete()
          .eq("po_id", poId);
        if (delErr) throw delErr;
      }

      // INSERT line items
      if (payload.lineItems.length > 0) {
        const { error: liErr } = await supabase
          .from("po_line_items")
          .insert(
            payload.lineItems.map((li, i) => ({
              tenant_id:       tenantId,
              po_id:           poId,
              catalog_item_id: li.catalogItemId,
              description:     li.description,
              sku:             li.sku,
              qty_ordered:     li.qtyOrdered,
              qty_received:    payload.id ? li.qtyReceived : 0,
              unit_cost:       li.unitCost,
              sort_order:      i,
            })),
          );
        if (liErr) throw liErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      setDrawerOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, markAllReceived }: { id: string; status: POStatus; markAllReceived?: boolean }) => {
      const patch: TablesUpdate<"purchase_orders"> = { status };
      if (status === "received") patch.received_date = today();

      const { error } = await supabase.from("purchase_orders").update(patch).eq("id", id);
      if (error) throw error;

      if (markAllReceived) {
        const po = pos.find((p) => p.id === id);
        if (po && po.lineItems.length > 0) {
          await Promise.all(
            po.lineItems.map((li) =>
              supabase.from("po_line_items").update({ qty_received: li.qtyOrdered }).eq("id", li.id),
            ),
          );
        }
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (variables.status === "sent") toast.success("PO sent to vendor");
      else if (variables.status === "received") toast.success("All items marked received");
    },
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const open         = pos.filter((p) => p.status === "draft" || p.status === "sent" || p.status === "partial");
    const openVal      = open.reduce((s, p) => s + poRemainingValue(p), 0);
    const awaiting     = pos.filter((p) => p.status === "sent" || p.status === "partial").length;
    const overdueCount = pos.filter(isOverdue).length;
    return { openCount: open.length, openVal, awaiting, overdueCount };
  }, [pos]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabValue, number> = { all: pos.length, draft: 0, sent: 0, partial: 0, received: 0, cancelled: 0 };
    pos.forEach((p) => { counts[p.status] += 1; });
    return counts;
  }, [pos]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pos.filter((p) => {
      if (activeTab !== "all" && p.status !== activeTab) return false;
      if (vendorFilter !== "all" && p.vendorId !== vendorFilter) return false;
      if (jobFilter === "none" && p.linkedJobId !== "") return false;
      if (jobFilter !== "all" && jobFilter !== "none" && p.linkedJobId !== jobFilter) return false;
      if (q && !p.poNumber.toLowerCase().includes(q) && !p.vendorName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pos, activeTab, search, vendorFilter, jobFilter]);

  const newPONumber = useMemo(() => nextPONumber(pos), [pos]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openNew = useCallback(() => {
    setDrawerPO(null);
    setDrawerMode("new");
    setDrawerOpen(true);
  }, []);
  useNewIntent(openNew);

  function handleView(po: PO) { setDrawerPO(po); setDrawerMode("view"); setDrawerOpen(true); }
  function handleEdit(po: PO) { setDrawerPO(po); setDrawerMode("edit"); setDrawerOpen(true); }

  useEffect(() => {
    setMeta({ title: "Purchase Orders", subtitle: "Inventory", newLabel: "New PO", onNew: openNew });
  }, [setMeta, openNew]);

  const TABS: Array<{ value: TabValue; label: string }> = [
    { value: "all",       label: "All"       },
    { value: "draft",     label: "Draft"     },
    { value: "sent",      label: "Sent"      },
    { value: "partial",   label: "Partial"   },
    { value: "received",  label: "Received"  },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className={cn("flex flex-col h-full min-h-0", isLoading && "opacity-50")}>
      <StatBar>
        <StatItem icon={Package}       label="Open POs"         value={String(stats.openCount)} />
        <StatItem icon={DollarSign}    label="Open Value"       value={currency(stats.openVal)} />
        <StatItem icon={Clock}         label="Awaiting Receipt" value={String(stats.awaiting)} />
        <StatItem icon={AlertTriangle} label="Overdue"          value={String(stats.overdueCount)} accent={stats.overdueCount > 0} />
      </StatBar>

      <PageTabs>
        {TABS.map((tab) => (
          <PageTab key={tab.value} active={activeTab === tab.value} onClick={() => setActiveTab(tab.value)} count={tabCounts[tab.value]}>
            {tab.label}
          </PageTab>
        ))}
      </PageTabs>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search PO # or vendor…" />
        <FilterSelect value={vendorFilter} onChange={setVendorFilter}>
          <option value="all">All Vendors</option>
          {rawVendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </FilterSelect>
        <FilterSelect value={jobFilter} onChange={setJobFilter}>
          <option value="all">All Jobs</option>
          <option value="none">General Stock</option>
          <optgroup label="── Projects ──">
            {rawProjects.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.code} — {p.name}</option>)}
          </optgroup>
          <optgroup label="── Work Orders ──">
            {rawWorkOrders.map((w) => <option key={w.id} value={`w:${w.id}`}>{w.code} — {w.name}</option>)}
          </optgroup>
        </FilterSelect>
        {(search || vendorFilter !== "all" || jobFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setSearch(""); setVendorFilter("all"); setJobFilter("all"); }}
            className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </FilterBar>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <POTable pos={filtered} onView={handleView} onEdit={handleEdit} />
      </div>

      <PODrawer
        open={drawerOpen}
        po={drawerPO}
        mode={drawerMode}
        suggestedPONumber={newPONumber}
        vendors={rawVendors}
        projects={rawProjects}
        workOrders={rawWorkOrders}
        catalog={catalogItems}
        onClose={() => setDrawerOpen(false)}
        onSwitchToEdit={() => setDrawerMode("edit")}
        onSave={(payload) => saveMutation.mutate(payload)}
        onSendPO={() => { if (drawerPO) statusMutation.mutate({ id: drawerPO.id, status: "sent" }); }}
        onMarkAllReceived={() => { if (drawerPO) statusMutation.mutate({ id: drawerPO.id, status: "received", markAllReceived: true }); }}
        isPending={saveMutation.isPending || statusMutation.isPending}
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Building2, ExternalLink, LayoutGrid, List, Mail, MapPin,
  Pencil, Phone, ShoppingCart, Star, Truck, User, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FormSelect } from "@/components/ui/form-select";
import { StatBar, StatItem, FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate } from "@/lib/supabase/types";
import type { VendorStatus, VendorCategory } from "@/data/vendors";

export const Route = createFileRoute("/inventory/vendors")({
  head: () => ({ meta: [{ title: "Vendors · BearingPro" }] }),
  component: VendorsPage,
});

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  accountNumber: string | null;
  paymentTerms: string;
  website: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  repName: string | null;
  repPhone: string | null;
  repEmail: string | null;
  notes: string;
  // derived from POs
  totalPOs: number;
  ytdSpend: number;
  activePOs: number;
  lastOrderDate: string | null;
}

type DbVendor = {
  id: string;
  name: string;
  category: string;
  status: string;
  account_number: string | null;
  payment_terms: string;
  website: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  rep_name: string | null;
  rep_phone: string | null;
  rep_email: string | null;
  notes: string;
};

type PurchaseOrderBasic = {
  id: string;
  vendor_id: string;
  status: string;
  order_date: string;
  po_line_items: { qty_ordered: number; unit_cost: number }[];
};

function toVendor(r: DbVendor): Omit<Vendor, "totalPOs" | "ytdSpend" | "activePOs" | "lastOrderDate"> {
  return {
    id:            r.id,
    name:          r.name,
    category:      r.category as VendorCategory,
    status:        r.status as VendorStatus,
    accountNumber: r.account_number,
    paymentTerms:  r.payment_terms,
    website:       r.website,
    phone:         r.phone,
    email:         r.email,
    city:          r.city,
    state:         r.state,
    repName:       r.rep_name,
    repPhone:      r.rep_phone,
    repEmail:      r.rep_email,
    notes:         r.notes,
  };
}

const CATEGORIES: VendorCategory[] = ["Security", "AV", "Networking", "Cabling", "Hardware", "Specialty"];
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prepay"];

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_META: Record<VendorStatus, { label: string; cls: string }> = {
  preferred: { label: "Preferred", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  active:    { label: "Active",    cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  inactive:  { label: "Inactive",  cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

function getInitials(name: string): string {
  const words = name.replace(/[/&]/g, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const { label, cls } = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      {status === "preferred" ? <Star className="h-2.5 w-2.5 fill-current" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: VendorCategory }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium bg-muted text-muted-foreground">
      {category}
    </span>
  );
}

function VendorAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = getInitials(name);
  return (
    <div className={cn(
      "shrink-0 flex items-center justify-center rounded-lg bg-linear-to-br from-primary/20 to-chart-2/20 font-semibold text-primary",
      size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-[12px]",
    )}>
      {initials}
    </div>
  );
}

// ─── VendorDrawer ─────────────────────────────────────────────────────────────

type DrawerMode = "view" | "edit";

function VendorDrawer({
  open,
  vendor,
  mode,
  onClose,
  onSwitchToEdit,
  onSave,
  isPending,
}: {
  open: boolean;
  vendor: Vendor | null;
  mode: DrawerMode;
  onClose: () => void;
  onSwitchToEdit: () => void;
  onSave: (patch: TablesUpdate<"vendors">) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<Partial<DbVendor>>({});

  useEffect(() => {
    if (!open || !vendor) return;
    setForm({
      name:           vendor.name,
      category:       vendor.category,
      status:         vendor.status,
      account_number: vendor.accountNumber,
      payment_terms:  vendor.paymentTerms,
      website:        vendor.website,
      phone:          vendor.phone,
      email:          vendor.email,
      city:           vendor.city,
      state:          vendor.state,
      rep_name:       vendor.repName,
      rep_phone:      vendor.repPhone,
      rep_email:      vendor.repEmail,
      notes:          vendor.notes,
    });
  }, [open, vendor]);

  function field(key: keyof DbVendor) {
    return {
      value: (form[key] ?? "") as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  const inputCls = "h-8 w-full rounded-md border border-border bg-background px-3 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const labelCls = "block text-[10.5px] font-medium text-muted-foreground mb-1";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-120 flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start gap-3 pr-6">
            {vendor && <VendorAvatar name={vendor.name} />}
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[14px] font-semibold leading-snug truncate">
                {vendor?.name ?? "Vendor"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {vendor && <CategoryBadge category={vendor.category} />}
                {vendor && <StatusBadge status={vendor.status} />}
              </div>
            </div>
          </div>
        </SheetHeader>

        {vendor && mode === "view" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "YTD Spend",  value: currency(vendor.ytdSpend),       sub: `${vendor.totalPOs} total POs` },
                  { label: "Active POs", value: String(vendor.activePOs),         sub: vendor.activePOs > 0 ? "In progress" : "None open" },
                  { label: "Last Order", value: vendor.lastOrderDate ? fmtDate(vendor.lastOrderDate) : "—", sub: "" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-lg border border-border bg-surface/30 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className="text-[13px] font-semibold tabular-nums">{value}</p>
                    {sub && <p className="text-[10.5px] text-muted-foreground mt-0.5">{sub}</p>}
                  </div>
                ))}
              </div>

              <fieldset className="space-y-0 rounded-lg border border-border overflow-hidden divide-y divide-border/50">
                {vendor.accountNumber && (
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <span className="text-[11.5px] text-muted-foreground">Account #</span>
                    <span className="text-[12.5px] font-mono font-medium">{vendor.accountNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-[11.5px] text-muted-foreground">Payment Terms</span>
                  <span className="text-[12.5px] font-medium">{vendor.paymentTerms}</span>
                </div>
                {vendor.website && (
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <span className="text-[11.5px] text-muted-foreground">Website</span>
                    <a
                      href={`https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[12.5px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {vendor.website}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> Phone
                    </span>
                    <span className="text-[12.5px]">{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> Email
                    </span>
                    <a href={`mailto:${vendor.email}`} className="text-[12.5px] text-blue-600 dark:text-blue-400 hover:underline">
                      {vendor.email}
                    </a>
                  </div>
                )}
                {(vendor.city || vendor.state) && (
                  <div className="flex items-center justify-between px-3.5 py-2">
                    <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> Location
                    </span>
                    <span className="text-[12.5px]">{vendor.city}{vendor.state && `, ${vendor.state}`}</span>
                  </div>
                )}
              </fieldset>

              {vendor.repName && (
                <fieldset>
                  <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Account Rep</legend>
                  <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50">
                    <div className="flex items-center justify-between px-3.5 py-2">
                      <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" /> Name</span>
                      <span className="text-[12.5px] font-medium">{vendor.repName}</span>
                    </div>
                    {vendor.repPhone && (
                      <div className="flex items-center justify-between px-3.5 py-2">
                        <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</span>
                        <span className="text-[12.5px]">{vendor.repPhone}</span>
                      </div>
                    )}
                    {vendor.repEmail && (
                      <div className="flex items-center justify-between px-3.5 py-2">
                        <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</span>
                        <a href={`mailto:${vendor.repEmail}`} className="text-[12.5px] text-blue-600 dark:text-blue-400 hover:underline">{vendor.repEmail}</a>
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {vendor.notes && (
                <fieldset>
                  <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Notes</legend>
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed rounded-lg border border-border bg-surface/30 px-3.5 py-3">
                    {vendor.notes}
                  </p>
                </fieldset>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button type="button" onClick={onClose}
                className="h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors">
                Close
              </button>
              <button type="button" onClick={onSwitchToEdit}
                className="h-8 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
          </div>
        )}

        {vendor && mode === "edit" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Vendor Details</legend>
                <div>
                  <label className={labelCls}>Vendor Name *</label>
                  <input {...field("name")} className={inputCls} placeholder="e.g. ADI Global Distribution" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Category</label>
                    <FormSelect {...field("category")} className={inputCls}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </FormSelect>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <FormSelect {...field("status")} className={inputCls}>
                      <option value="preferred">Preferred</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </FormSelect>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Account #</label>
                    <input {...field("account_number")} className={inputCls} placeholder="e.g. PCSS-ADI-4412" />
                  </div>
                  <div>
                    <label className={labelCls}>Payment Terms</label>
                    <FormSelect {...field("payment_terms")} className={inputCls}>
                      {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </FormSelect>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Contact</legend>
                <div>
                  <label className={labelCls}>Website</label>
                  <input {...field("website")} className={inputCls} placeholder="e.g. adisecurity.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input {...field("phone")} className={inputCls} type="tel" placeholder="(800) 000-0000" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input {...field("email")} className={inputCls} type="email" placeholder="orders@vendor.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input {...field("city")} className={inputCls} placeholder="City" />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input {...field("state")} className={inputCls} placeholder="ST" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Account Rep</legend>
                <div>
                  <label className={labelCls}>Rep Name</label>
                  <input {...field("rep_name")} className={inputCls} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Rep Phone</label>
                    <input {...field("rep_phone")} className={inputCls} type="tel" placeholder="(555) 000-0000" />
                  </div>
                  <div>
                    <label className={labelCls}>Rep Email</label>
                    <input {...field("rep_email")} className={inputCls} type="email" placeholder="rep@vendor.com" />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Notes</legend>
                <textarea
                  {...field("notes")}
                  rows={3}
                  placeholder="Internal notes about this vendor…"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </fieldset>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button type="button" onClick={onSwitchToEdit}
                className="h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onSave(form as TablesUpdate<"vendors">)}
                className="h-8 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

// ─── VendorsPage ──────────────────────────────────────────────────────────────

function VendorsPage() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "all">("all");
  const [view, setView] = useState<"cards" | "list">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");

  const { data: rawVendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DbVendor[];
    },
  });

  const { data: rawPos = [] } = useQuery({
    queryKey: ["purchase-orders-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, vendor_id, status, order_date, po_line_items(qty_ordered, unit_cost)");
      if (error) throw error;
      return data as unknown as PurchaseOrderBasic[];
    },
  });

  const vendorStats = useMemo(() => {
    const ytdYear = new Date().getFullYear();
    const map = new Map<string, { ytdSpend: number; totalPOs: number; activePOs: number; lastOrderDate: string | null }>();
    for (const po of rawPos) {
      const existing = map.get(po.vendor_id) ?? { ytdSpend: 0, totalPOs: 0, activePOs: 0, lastOrderDate: null };
      const lineTotal = (po.po_line_items ?? []).reduce((s, li) => s + li.qty_ordered * li.unit_cost, 0);
      const poYear = po.order_date ? Number(po.order_date.split("-")[0]) : 0;
      const isActive = po.status === "draft" || po.status === "sent" || po.status === "partial";
      map.set(po.vendor_id, {
        ytdSpend:    existing.ytdSpend + (po.status !== "cancelled" && poYear === ytdYear ? lineTotal : 0),
        totalPOs:    existing.totalPOs + 1,
        activePOs:   existing.activePOs + (isActive ? 1 : 0),
        lastOrderDate: !existing.lastOrderDate || po.order_date > existing.lastOrderDate
          ? po.order_date
          : existing.lastOrderDate,
      });
    }
    return map;
  }, [rawPos]);

  const vendors: Vendor[] = useMemo(() => rawVendors.map((r) => {
    const stats = vendorStats.get(r.id) ?? { ytdSpend: 0, totalPOs: 0, activePOs: 0, lastOrderDate: null };
    return { ...toVendor(r), ...stats };
  }), [rawVendors, vendorStats]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"vendors"> }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as DbVendor;
    },
    onSuccess: (updated) => {
      qc.setQueryData<DbVendor[]>(["vendors"], (prev = []) =>
        prev.map((v) => (v.id === updated.id ? updated : v)),
      );
      setDrawerMode("view");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof createFormDefaults) => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      const { data, error } = await supabase
        .from("vendors")
        .insert({
          tenant_id:      tenantId!,
          name:           payload.name,
          category:       payload.category,
          status:         payload.status,
          account_number: payload.accountNumber || null,
          payment_terms:  payload.paymentTerms,
          website:        payload.website,
          phone:          payload.phone,
          email:          payload.email,
          city:           payload.city,
          state:          payload.state,
          rep_name:       payload.repName || null,
          rep_phone:      payload.repPhone || null,
          rep_email:      payload.repEmail || null,
          notes:          payload.notes,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as DbVendor;
    },
    onSuccess: (created) => {
      qc.setQueryData<DbVendor[]>(["vendors"], (prev = []) => [...prev, created]);
      setNewOpen(false);
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return vendors.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q) && !v.city.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      return true;
    });
  }, [vendors, search, categoryFilter, statusFilter]);

  const totalYtdSpend  = useMemo(() => vendors.reduce((s, v) => s + v.ytdSpend, 0), [vendors]);
  const activePOCount  = useMemo(() => vendors.reduce((s, v) => s + v.activePOs, 0), [vendors]);
  const preferredCount = useMemo(() => vendors.filter((v) => v.status === "preferred").length, [vendors]);
  const selected       = useMemo(() => vendors.find((v) => v.id === selectedId) ?? null, [vendors, selectedId]);

  useEffect(() => {
    setMeta({
      title:    "Vendors",
      subtitle: `${vendors.length} vendors`,
      onNew:    () => setNewOpen(true),
      newLabel: "New Vendor",
    });
  }, [setMeta, vendors.length]);

  function openView(v: Vendor)  { setSelectedId(v.id); setDrawerMode("view"); }
  function openEdit(v: Vendor)  { setSelectedId(v.id); setDrawerMode("edit"); }

  return (
    <div className={cn("flex flex-col", vendorsLoading && "opacity-50")}>
      <StatBar>
        <StatItem icon={Truck}        label="Total Vendors" value={String(vendors.length)} />
        <StatItem icon={Star}         label="Preferred"     value={String(preferredCount)} />
        <StatItem icon={ShoppingCart} label="Active POs"    value={String(activePOCount)} />
        <StatItem icon={Building2}    label="YTD Spend"     value={currency(totalYtdSpend)} />
      </StatBar>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search vendors…" />
        <FilterSelect value={categoryFilter} onChange={(v) => setCategoryFilter(v as VendorCategory | "all")}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as VendorStatus | "all")}>
          <option value="all">All Statuses</option>
          <option value="preferred">Preferred</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
        {(search || categoryFilter !== "all" || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); }}
            className="flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center rounded-md border border-border overflow-hidden shrink-0">
          <button type="button" onClick={() => setView("cards")}
            className={cn("flex h-7 w-7 items-center justify-center transition-colors",
              view === "cards" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground")}
            aria-label="Card view">
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setView("list")}
            className={cn("flex h-7 w-7 items-center justify-center border-l border-border transition-colors",
              view === "list" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground")}
            aria-label="List view">
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </FilterBar>

      {view === "cards" && (
        <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              onClick={() => openView(v)}
              className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <VendorAvatar name={v.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate leading-snug">{v.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CategoryBadge category={v.category} />
                  </div>
                </div>
                <StatusBadge status={v.status} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{v.city}, {v.state}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">YTD Spend</div>
                  <div className="text-[12.5px] font-semibold tabular-nums">{currency(v.ytdSpend)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total POs</div>
                  <div className="text-[12.5px] font-semibold">{v.totalPOs}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Active POs</div>
                  <div className={cn("text-[12.5px] font-semibold", v.activePOs > 0 && "text-amber-600 dark:text-amber-400")}>
                    {v.activePOs}
                  </div>
                </div>
              </div>
              {v.repName && (
                <div className="mt-2.5 pt-2.5 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span>{v.repName}</span>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-[12.5px] text-muted-foreground">
              No vendors match the current filters.
            </div>
          )}
        </div>
      )}

      {view === "list" && (
        <div className="p-4 overflow-x-auto">
          <div className="rounded-lg border border-border bg-card overflow-hidden min-w-215">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface/50">
                <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3 text-left font-medium">Vendor</th>
                  <th className="py-2 px-3 text-left font-medium">Status</th>
                  <th className="py-2 px-3 text-left font-medium">Account #</th>
                  <th className="py-2 px-3 text-left font-medium">Terms</th>
                  <th className="py-2 px-3 text-left font-medium">Rep</th>
                  <th className="py-2 px-3 text-right font-medium">YTD Spend</th>
                  <th className="py-2 px-3 text-right font-medium">Active POs</th>
                  <th className="py-2 px-3 text-right font-medium">Last Order</th>
                  <th className="py-2 px-3 pr-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => openView(v)}
                    className="group row-hover border-b border-border/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <VendorAvatar name={v.name} size="sm" />
                        <div>
                          <div className="font-semibold leading-snug">{v.name}</div>
                          <div className="text-[11px] text-muted-foreground">{v.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><StatusBadge status={v.status} /></td>
                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-muted-foreground">{v.accountNumber ?? "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{v.paymentTerms}</td>
                    <td className="py-2.5 px-3">
                      {v.repName ? (
                        <div>
                          <div className="leading-snug">{v.repName}</div>
                          {v.repEmail && <div className="text-[11px] text-muted-foreground truncate max-w-36">{v.repEmail}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11.5px]">{currency(v.ytdSpend)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={cn("font-semibold", v.activePOs > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                        {v.activePOs}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground text-[12px]">
                      {v.lastOrderDate ? fmtDate(v.lastOrderDate) : "—"}
                    </td>
                    <td className="py-2.5 px-3 pr-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                        className="invisible group-hover:visible flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-auto"
                        aria-label="Edit vendor"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[12.5px] text-muted-foreground">
                      No vendors match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <VendorDrawer
        open={selectedId !== null}
        vendor={selected}
        mode={drawerMode}
        onClose={() => setSelectedId(null)}
        onSwitchToEdit={() => setDrawerMode(drawerMode === "edit" ? "view" : "edit")}
        onSave={(patch) => {
          if (selectedId) saveMutation.mutate({ id: selectedId, patch });
        }}
        isPending={saveMutation.isPending}
      />

      {newOpen && (
        <NewVendorModal
          onClose={() => setNewOpen(false)}
          onAdd={(form) => createMutation.mutate(form)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── NewVendorModal ───────────────────────────────────────────────────────────

const createFormDefaults = {
  name: "", category: "Hardware" as VendorCategory, status: "active" as VendorStatus,
  accountNumber: "", paymentTerms: "Net 30",
  website: "", phone: "", email: "", city: "", state: "",
  repName: "", repPhone: "", repEmail: "", notes: "",
};

function NewVendorModal({
  onClose,
  onAdd,
  isPending,
}: {
  onClose: () => void;
  onAdd: (form: typeof createFormDefaults) => void;
  isPending: boolean;
}) {
  const idRef = useRef(Date.now());
  void idRef; // suppress unused warning
  const [form, setForm] = useState({ ...createFormDefaults });

  function f(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  const inputCls = "h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-semibold">New Vendor</h2>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Vendor Name *</label>
            <input {...f("name")} className={inputCls} placeholder="e.g. Axis Communications" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <FormSelect {...f("category")} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <FormSelect {...f("status")} className={inputCls}>
              <option value="preferred">Preferred</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Account #</label>
            <input {...f("accountNumber")} className={inputCls} placeholder="Your account number" />
          </div>
          <div>
            <label className={labelCls}>Payment Terms</label>
            <FormSelect {...f("paymentTerms")} className={inputCls}>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Website</label>
            <input {...f("website")} className={inputCls} placeholder="e.g. vendor.com" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input {...f("phone")} className={inputCls} type="tel" placeholder="(800) 000-0000" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input {...f("email")} className={inputCls} type="email" placeholder="orders@vendor.com" />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input {...f("city")} className={inputCls} placeholder="City" />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input {...f("state")} className={inputCls} placeholder="ST" />
          </div>
          <div className="col-span-2 pt-1 border-t border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Account Rep (Optional)</p>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Rep Name</label>
            <input {...f("repName")} className={inputCls} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Rep Phone</label>
            <input {...f("repPhone")} className={inputCls} type="tel" placeholder="(555) 000-0000" />
          </div>
          <div>
            <label className={labelCls}>Rep Email</label>
            <input {...f("repEmail")} className={inputCls} type="email" placeholder="rep@vendor.com" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea {...f("notes")} rows={3} placeholder="Internal notes…"
              className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose}
            className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (form.name.trim()) onAdd(form); }}
            disabled={!form.name.trim() || isPending}
            className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Adding…" : "Add Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
}

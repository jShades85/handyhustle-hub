import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Pencil, Search } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Catalog · Crosscurrent" }] }),
  component: CatalogPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "equipment" | "material" | "labor" | "subcontractor" | "misc";
type StatusFilter = "all" | "active" | "inactive";

interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  category: Category;
  description: string;
  unitCost: number;
  unitOfMeasure: string;
  hasLabor: boolean;
  laborHours: number | null;
  laborRateOverride: number | null;
  isActive: boolean;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const ItemFormSchema = z
  .object({
    name:              z.string().min(1, "Name is required"),
    sku:               z.string(),
    category:          z.enum(["equipment", "material", "labor", "subcontractor", "misc"]),
    description:       z.string(),
    unitCost:          z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    unitOfMeasure:     z.string().min(1, "Unit is required"),
    isActive:          z.boolean(),
    hasLabor:          z.boolean(),
    // Kept as strings in the form; converted to number|null on submit
    laborHours:        z.string(),
    laborRateOverride: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.hasLabor) {
      const h = parseFloat(data.laborHours);
      if (!data.laborHours || isNaN(h) || h <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Labor hours required", path: ["laborHours"] });
      }
    }
    if (data.laborRateOverride) {
      const r = parseFloat(data.laborRateOverride);
      if (isNaN(r) || r <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be > 0", path: ["laborRateOverride"] });
      }
    }
  });

type ItemFormValues = z.infer<typeof ItemFormSchema>;

// ─── Config ──────────────────────────────────────────────────────────────────

const categoryMeta: Record<Category, { label: string; cls: string }> = {
  equipment:     { label: "Equipment",     cls: "bg-primary/10 text-primary" },
  material:      { label: "Material",      cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  labor:         { label: "Labor",         cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  subcontractor: { label: "Subcontractor", cls: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  misc:          { label: "Misc",          cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const CATEGORY_OPTIONS: Array<{ value: Category | "all"; label: string }> = [
  { value: "all",           label: "All Categories" },
  { value: "equipment",     label: "Equipment" },
  { value: "material",      label: "Material" },
  { value: "labor",         label: "Labor" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "misc",          label: "Misc" },
];

const UNIT_SUGGESTIONS = ["ea", "hr", "ft", "lot", "spl", "run", "box", "set"];

const DEFAULT_VALUES: ItemFormValues = {
  name: "", sku: "", category: "equipment", description: "",
  unitCost: 0, unitOfMeasure: "ea", isActive: true,
  hasLabor: false, laborHours: "", laborRateOverride: "",
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: CatalogItem[] = [
  {
    id: "ci-001",
    name: 'Samsung QM55B 55" Commercial Display',
    sku: "SAM-QM55B",
    category: "equipment",
    description: "55-inch UHD commercial monitor for digital signage and conference rooms. 24/7 rated, 500 nit brightness.",
    unitCost: 1299,
    unitOfMeasure: "ea",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-002",
    name: "Crestron DM-NVX-360 AV Encoder",
    sku: "CRE-NVX360",
    category: "equipment",
    description: "4K60 4:4:4 HDR AV over IP encoder/decoder with Dante/AES67 audio.",
    unitCost: 2450,
    unitOfMeasure: "ea",
    hasLabor: true,
    laborHours: 1.5,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-003",
    name: "Axis P3245-V Fixed Dome Camera",
    sku: "AXIS-P3245V",
    category: "equipment",
    description: "2MP indoor fixed dome IP camera, HDTV 1080p, ARTPEC-6, IR illumination to 10m.",
    unitCost: 299,
    unitOfMeasure: "ea",
    hasLabor: true,
    laborHours: 1.5,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-004",
    name: "Control4 EA-3 Automation Controller",
    sku: "C4-EA3",
    category: "equipment",
    description: "Entry-level home automation controller supporting up to 3 rooms and 100 connected devices.",
    unitCost: 1199,
    unitOfMeasure: "ea",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-005",
    name: "Cat6 Plenum Cable, 1000ft Spool",
    sku: "CAB-C6P-1000",
    category: "material",
    description: "23 AWG plenum-rated Cat6 UTP for in-wall structured cabling runs.",
    unitCost: 189,
    unitOfMeasure: "spl",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-006",
    name: "Structured Cable Drop (Terminated)",
    sku: "SVC-CABDROP",
    category: "material",
    description: "Single terminated cable run including pull, terminate, and certification test.",
    unitCost: 42,
    unitOfMeasure: "ea",
    hasLabor: true,
    laborHours: 0.75,
    laborRateOverride: 125,
    isActive: true,
  },
  {
    id: "ci-007",
    name: "AV Rack Build & Integration",
    sku: "SVC-RACKBLD",
    category: "labor",
    description: "Full rack design, equipment mounting, cable dressing, labeling, and final testing.",
    unitCost: 0,
    unitOfMeasure: "lot",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-008",
    name: "Control4 / Crestron Programming",
    sku: "SVC-PROG-C4",
    category: "labor",
    description: "System programming, driver configuration, UI design, and client walkthrough.",
    unitCost: 0,
    unitOfMeasure: "hr",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-009",
    name: "Subcontractor — Low-Voltage Electrician",
    sku: "SUB-LVE-HR",
    category: "subcontractor",
    description: "Licensed low-voltage electrician for conduit work, cable pulls, and terminations.",
    unitCost: 95,
    unitOfMeasure: "hr",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: true,
  },
  {
    id: "ci-010",
    name: "Keystone Wall Plate, 4-Port",
    sku: "ACC-KWP-4P",
    category: "material",
    description: "4-port keystone wall plate, decorator style. Available in white and ivory.",
    unitCost: 8.5,
    unitOfMeasure: "ea",
    hasLabor: false,
    laborHours: null,
    laborRateOverride: null,
    isActive: false,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: Category }) {
  const { label, cls } = categoryMeta[category];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium bg-status-won/10 text-status-won whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium bg-muted text-muted-foreground whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Inactive
    </span>
  );
}

// ─── Item Drawer ──────────────────────────────────────────────────────────────

interface ItemDrawerProps {
  open: boolean;
  item: CatalogItem | null;
  onSave: (item: CatalogItem) => void;
  onClose: () => void;
}

function ItemDrawer({ open, item, onSave, onClose }: ItemDrawerProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(ItemFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchHasLabor = form.watch("hasLabor");

  useEffect(() => {
    if (!open) return;
    form.reset(
      item
        ? {
            name:             item.name,
            sku:              item.sku,
            category:         item.category,
            description:      item.description,
            unitCost:         item.unitCost,
            unitOfMeasure:    item.unitOfMeasure,
            isActive:         item.isActive,
            hasLabor:         item.hasLabor,
            laborHours:       item.laborHours?.toString() ?? "",
            laborRateOverride: item.laborRateOverride?.toString() ?? "",
          }
        : DEFAULT_VALUES,
    );
  }, [open, item, form]);

  function onSubmit(values: ItemFormValues) {
    onSave({
      id: item?.id ?? `ci-${Date.now()}`,
      ...values,
      laborHours:        values.laborHours        ? parseFloat(values.laborHours)        : null,
      laborRateOverride: values.laborRateOverride ? parseFloat(values.laborRateOverride) : null,
    });
  }

  const fieldCls = "h-9 text-[12.5px]";
  const labelCls = "text-[11.5px] font-medium";
  const selectCls =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[12.5px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-[480px] flex flex-col p-0 gap-0">
        <SheetHeader className="border-b border-border px-5 py-4 shrink-0">
          <SheetTitle className="text-[15px]">
            {item ? "Edit Catalog Item" : "New Catalog Item"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            id="catalog-item-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Name *</FormLabel>
                    <FormControl>
                      <Input className={fieldCls} placeholder='e.g. Samsung QM55B Display' {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* SKU + Category */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>SKU</FormLabel>
                      <FormControl>
                        <Input className={fieldCls} placeholder="e.g. SAM-QM55B" {...field} />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Category *</FormLabel>
                      <FormControl>
                        <select className={selectCls} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} name={field.name}>
                          <option value="equipment">Equipment</option>
                          <option value="material">Material</option>
                          <option value="labor">Labor</option>
                          <option value="subcontractor">Subcontractor</option>
                          <option value="misc">Misc</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Description</FormLabel>
                    <FormControl>
                      <Textarea className="text-[12.5px] resize-none" rows={2} placeholder="Optional product description" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Unit Cost + Unit of Measure */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Unit Cost *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className={fieldCls}
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitOfMeasure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Unit *</FormLabel>
                      <FormControl>
                        <>
                          <Input
                            className={fieldCls}
                            placeholder="ea"
                            list="uom-suggestions"
                            {...field}
                          />
                          <datalist id="uom-suggestions">
                            {UNIT_SUGGESTIONS.map((u) => (
                              <option key={u} value={u} />
                            ))}
                          </datalist>
                        </>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Active toggle */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-lg border border-border p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className={cn(labelCls, "cursor-pointer")}>Active</FormLabel>
                      <p className="text-[11px] text-muted-foreground">
                        Inactive items are hidden from quote line item pickers
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* Labor section */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="hasLabor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-2.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div>
                        <FormLabel className={cn(labelCls, "cursor-pointer")}>Attach Labor</FormLabel>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          When added to a quote, this item will generate a separate labor line item.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {watchHasLabor && (
                  <div className="ml-6 space-y-3 rounded-lg border border-border bg-surface/40 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="laborHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelCls}>Labor Hours *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.25"
                                min="0.25"
                                className={fieldCls}
                                placeholder="e.g. 1.5"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? null : e.target.value)
                                }
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="laborRateOverride"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelCls}>Rate Override</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className={fieldCls}
                                placeholder="Tenant default"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? null : e.target.value)
                                }
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <p className="text-[10.5px] text-muted-foreground">
                              Leave blank to use tenant default
                            </p>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-8 rounded-md border border-border px-3.5 text-[12.5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { setMeta } = useMeta();
  const [items, setItems] = useState<CatalogItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    setMeta({
      title: "Catalog",
      subtitle: "Products & Services",
      newLabel: "New Item",
      onNew: () => { setEditingItem(null); setDrawerOpen(true); },
    });
  }, [setMeta]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const openEdit = useCallback((item: CatalogItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleSave = useCallback((saved: CatalogItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved];
    });
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const selectCls =
    "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or SKU…"
            className="h-7 w-full rounded-md border border-border bg-surface pl-7 pr-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
          className={selectCls}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={selectCls}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <span className="text-[11px] font-mono text-muted-foreground">
          {filtered.length} of {items.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50 border-b border-border">
              <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-left font-medium">SKU</th>
                <th className="py-2 px-3 text-left font-medium">Category</th>
                <th className="py-2 px-3 text-right font-medium">Unit Cost</th>
                <th className="py-2 px-3 text-right font-medium">Labor Hrs</th>
                <th className="py-2 px-3 text-left font-medium">Unit</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-center font-medium w-12">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="border-b border-border/60 cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium">{item.name}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {item.sku || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <CategoryBadge category={item.category} />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                    {item.unitCost > 0 ? currency(item.unitCost) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                    {item.hasLabor && item.laborHours !== null ? item.laborHours : "—"}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                    {item.unitOfMeasure}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge active={item.isActive} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      className="flex h-6 w-6 mx-auto items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[12.5px] text-muted-foreground">
                    No items match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ItemDrawer
        open={drawerOpen}
        item={editingItem}
        onSave={handleSave}
        onClose={handleClose}
      />
    </div>
  );
}

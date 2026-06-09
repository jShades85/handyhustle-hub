import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/types";
import { TRADE_TEMPLATES, COLOR_PALETTE } from "@/data/trade-templates";
import {
  Camera, ChevronRight, ImagePlus, LayoutGrid, List,
  Pencil, Plus, Shield, Thermometer, Droplets, Zap,
  Building2, Volume2, X, Check,
} from "lucide-react";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/inventory/catalog")({
  head: () => ({ meta: [{ title: "Catalog · BearingPro" }] }),
  component: CatalogPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type DbCategory   = Database["public"]["Tables"]["categories"]["Row"];
type DbCatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"] & {
  categories: { id: string; name: string; color: string } | null;
};

// ─── Zod schema ───────────────────────────────────────────────────────────────

const ItemFormSchema = z
  .object({
    name:               z.string().min(1, "Required"),
    categoryId:         z.string().min(1, "Required"),
    manufacturer:       z.string(),
    sku:                z.string(),
    description:        z.string(),
    cost:               z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    msrp:               z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    unitOfMeasure:      z.string().min(1, "Required"),
    isActive:           z.boolean(),
    hasLabor:           z.boolean(),
    laborHours:         z.string(),
    laborRateOverride:  z.string(),
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

const DEFAULT_FORM: ItemFormValues = {
  name: "", categoryId: "", manufacturer: "", sku: "", description: "",
  cost: 0, msrp: 0, unitOfMeasure: "ea",
  isActive: true, hasLabor: false, laborHours: "", laborRateOverride: "",
};

const UNIT_SUGGESTIONS = ["ea", "hr", "ft", "lot", "spl", "run", "box", "set"];

// ─── Template icons ───────────────────────────────────────────────────────────

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  av:       Volume2,
  security: Shield,
  hvac:     Thermometer,
  plumbing: Droplets,
  electrical: Zap,
  general:  Building2,
};

// ─── CategorySetupModal ───────────────────────────────────────────────────────

interface CategorySetupModalProps {
  open: boolean;
  onDone: () => void;
}

function CategorySetupModal({ open, onDone }: CategorySetupModalProps) {
  const qc = useQueryClient();
  const supabase = createClient();

  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [customInput, setCustomInput]     = useState("");
  const [customList, setCustomList]       = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (rows: { name: string; color: string; sort_order: number }[]) => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      const { error } = await supabase
        .from("categories")
        .insert(rows.map((r) => ({ ...r, tenant_id: tenantId! })));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      onDone();
    },
  });

  function toggleTemplate(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed || customList.includes(trimmed)) return;
    setCustomList((prev) => [...prev, trimmed]);
    setCustomInput("");
  }

  function removeCustom(name: string) {
    setCustomList((prev) => prev.filter((c) => c !== name));
  }

  function handleConfirm() {
    // Collect categories from selected templates (deduped)
    const names: string[] = [];
    for (const templateId of selected) {
      const tpl = TRADE_TEMPLATES.find((t) => t.id === templateId);
      if (tpl) {
        for (const cat of tpl.categories) {
          if (!names.includes(cat)) names.push(cat);
        }
      }
    }
    for (const cat of customList) {
      if (!names.includes(cat)) names.push(cat);
    }
    if (names.length === 0) return;

    mutation.mutate(
      names.map((name, i) => ({
        name,
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
        sort_order: i,
      })),
    );
  }

  const totalCats = useMemo(() => {
    const names = new Set<string>(customList);
    for (const id of selected) {
      const tpl = TRADE_TEMPLATES.find((t) => t.id === id);
      tpl?.categories.forEach((c) => names.add(c));
    }
    return names.size;
  }, [selected, customList]);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-[16px]">Set up your product catalog</DialogTitle>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            Choose the trades your business covers. You can select multiple — categories will be merged and deduplicated.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 py-5 space-y-6">

          {/* Trade template grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TRADE_TEMPLATES.map((tpl) => {
              const Icon = TEMPLATE_ICONS[tpl.id] ?? Building2;
              const isSelected = selected.has(tpl.id);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => toggleTemplate(tpl.id)}
                  className={cn(
                    "relative flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <Icon className={cn("h-5 w-5 mb-2.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <p className={cn("text-[13px] font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                    {tpl.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{tpl.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tpl.categories.slice(0, 4).map((c) => (
                      <span key={c} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground">
                        {c}
                      </span>
                    ))}
                    {tpl.categories.length > 4 && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground">
                        +{tpl.categories.length - 4} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom categories */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2.5">
              Add custom categories
            </p>
            <div className="flex gap-2">
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                placeholder="e.g. Fire Suppression"
                className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={addCustom}
                className="h-8 flex items-center gap-1 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {customList.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {customList.map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px]">
                    {cat}
                    <button type="button" onClick={() => removeCustom(cat)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <p className="text-[12px] text-muted-foreground">
            {totalCats > 0 ? `${totalCats} categor${totalCats === 1 ? "y" : "ies"} will be created` : "Select at least one trade or add a custom category"}
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={totalCats === 0 || mutation.isPending}
            className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {mutation.isPending ? "Setting up…" : "Set Up Catalog"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: DbCategory;
  itemCount: number;
  onClick: () => void;
}

function CategoryCard({ category, itemCount, onClick }: CategoryCardProps) {
  const initials = category.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden text-left hover:border-primary/40 hover:shadow-md transition-all duration-150"
    >
      {/* Color area */}
      <div
        className="flex items-center justify-center h-32 w-full relative"
        style={{ backgroundColor: `${category.color}18` }}
      >
        <span
          className="text-[36px] font-black select-none leading-none"
          style={{ color: `${category.color}60` }}
        >
          {initials}
        </span>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
      </div>

      {/* Info */}
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <p className="text-[13px] font-semibold truncate">{category.name}</p>
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-0.5 pl-4">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: DbCatalogItem;
  onView: () => void;
  onEdit: (e: React.MouseEvent) => void;
}

function ItemCard({ item, onView, onEdit }: ItemCardProps) {
  const color = item.categories?.color ?? "#6366f1";
  const mfrInitials = (item.manufacturer ?? "??").slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onView}
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-150"
    >
      {/* Image area */}
      <div
        className="relative flex items-center justify-center h-36 shrink-0 overflow-hidden"
        style={{ backgroundColor: `${color}12` }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <span
            className="text-[52px] font-black select-none leading-none"
            style={{ color: `${color}28` }}
          >
            {(item.categories?.name ?? "?").slice(0, 1)}
          </span>
        )}

        {/* Manufacturer badge */}
        <div
          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold tracking-tight"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {mfrInitials}
        </div>

        {/* Inactive overlay */}
        {!item.is_active && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
              Inactive
            </span>
          </div>
        )}

        {/* Edit on hover */}
        <button
          type="button"
          onClick={onEdit}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 h-6 rounded-md bg-background/90 border border-border px-2 text-[11px] text-foreground shadow-sm transition-opacity"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-col p-3 gap-1.5 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {item.categories?.name ?? "Uncategorized"}
          </span>
          {item.has_labor && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400">
              + Labor
            </span>
          )}
        </div>

        <p className="text-[13px] font-semibold leading-snug line-clamp-2 mt-0.5">{item.name}</p>
        <p className="text-[11px] font-mono text-muted-foreground/70">{item.sku || "—"}</p>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground truncate max-w-[55%]">
            {item.manufacturer || "—"}
          </span>
          <span className="text-[13px] font-semibold tabular-nums">{currency(item.msrp)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ItemsTable ───────────────────────────────────────────────────────────────

interface ItemsTableProps {
  items: DbCatalogItem[];
  showCategory?: boolean;
  onView: (item: DbCatalogItem) => void;
  onEdit: (item: DbCatalogItem) => void;
}

function ItemsTable({ items, showCategory = true, onView, onEdit }: ItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <ImagePlus className="h-8 w-8 text-muted-foreground/25 mb-3" />
        <p className="text-[13px] font-medium">No items</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Add items to populate this view.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-border bg-surface/50">
          <tr>
            <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2 px-3">Name</th>
            {showCategory && (
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Category</th>
            )}
            <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Manufacturer</th>
            <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">SKU</th>
            <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Cost</th>
            <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">MSRP</th>
            <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">UoM</th>
            <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Status</th>
            <th className="py-2 pr-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const color = item.categories?.color ?? "#6366f1";
            return (
              <tr
                key={item.id}
                onClick={() => onView(item)}
                className="group border-b border-border/60 last:border-0 hover:bg-surface/40 transition-colors cursor-pointer"
              >
                <td className="py-2.5 px-3">
                  <p className="font-medium leading-snug">{item.name}</p>
                  {item.description && (
                    <p className="text-[10.5px] text-muted-foreground truncate max-w-55">{item.description}</p>
                  )}
                </td>
                {showCategory && (
                  <td className="py-2.5 pr-3">
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {item.categories?.name ?? "—"}
                    </span>
                  </td>
                )}
                <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">{item.manufacturer || "—"}</td>
                <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">{item.sku || "—"}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted-foreground">{currency(item.cost)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{currency(item.msrp)}</td>
                <td className="py-2.5 pr-3 text-center text-muted-foreground">{item.unit_of_measure}</td>
                <td className="py-2.5 pr-3 text-center">
                  <span className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                    item.is_active ? "bg-status-won/15 text-status-won" : "bg-muted text-muted-foreground",
                  )}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded border border-border bg-surface px-2 h-6 text-[11px] text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── ItemDrawer ───────────────────────────────────────────────────────────────

interface ItemDrawerProps {
  open: boolean;
  item: DbCatalogItem | null;
  mode: "view" | "edit";
  categories: DbCategory[];
  manufacturerSuggestions: string[];
  onClose: () => void;
  onSwitchToEdit: () => void;
  onSave: (values: ItemFormValues, itemId: string | null) => void;
  isSaving: boolean;
}

function ItemDrawer({
  open, item, mode, categories, manufacturerSuggestions,
  onClose, onSwitchToEdit, onSave, isSaving,
}: ItemDrawerProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(ItemFormSchema),
    defaultValues: DEFAULT_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              name:              item.name,
              categoryId:        item.category_id,
              manufacturer:      item.manufacturer ?? "",
              sku:               item.sku ?? "",
              description:       item.description ?? "",
              cost:              item.cost,
              msrp:              item.msrp,
              unitOfMeasure:     item.unit_of_measure,
              isActive:          item.is_active,
              hasLabor:          item.has_labor,
              laborHours:        item.labor_hours?.toString() ?? "",
              laborRateOverride: item.labor_rate_override?.toString() ?? "",
            }
          : DEFAULT_FORM,
      );
    }
  }, [open, item, form]);

  const hasLabor = form.watch("hasLabor");

  function onSubmit(values: ItemFormValues) {
    onSave(values, item?.id ?? null);
  }

  // ── View mode ────────────────────────────────────────────────────────────────

  function renderViewContent() {
    if (!item) return null;
    const color = item.categories?.color ?? "#6366f1";
    const margin = item.msrp > 0 ? ((item.msrp - item.cost) / item.msrp * 100) : 0;

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Product image */}
          {item.image_url && (
            <div
              className="flex items-center justify-center h-40 rounded-lg overflow-hidden"
              style={{ backgroundColor: `${color}10` }}
            >
              <img src={item.image_url} alt={item.name} className="h-full w-full object-contain p-4" />
            </div>
          )}

          {/* Manufacturer + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {(item.manufacturer ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[12.5px] text-muted-foreground">{item.manufacturer || "—"}</span>
            <span
              className="ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {item.categories?.name ?? "Uncategorized"}
            </span>
            <span className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
              item.is_active ? "bg-status-won/15 text-status-won" : "bg-muted text-muted-foreground",
            )}>
              {item.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {item.description && (
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">{item.description}</p>
          )}

          <fieldset className="space-y-0">
            <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Details</legend>
            <div className="rounded-lg border border-border bg-surface/30 px-3 py-1">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-[11.5px] text-muted-foreground">SKU</span>
                <span className="text-[12.5px] font-medium font-mono">{item.sku || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11.5px] text-muted-foreground">Unit of Measure</span>
                <span className="text-[12.5px] font-medium">{item.unit_of_measure}</span>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Pricing</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Your Cost", value: currency(item.cost) },
                { label: "MSRP",      value: currency(item.msrp) },
                { label: "Margin",    value: `${margin.toFixed(1)}%`, highlight: margin > 0 },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex flex-col items-center rounded-lg border border-border bg-surface/50 py-3 px-2 gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
                  <span className={cn("text-[15px] font-semibold tabular-nums", highlight && "text-status-won")}>{value}</span>
                </div>
              ))}
            </div>
          </fieldset>

          {item.has_labor && (
            <fieldset className="space-y-2">
              <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Labor</legend>
              <div className="rounded-lg border border-border bg-surface/30 px-3 py-1">
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-[11.5px] text-muted-foreground">Labor Hours</span>
                  <span className="text-[12.5px] font-medium">{item.labor_hours != null ? `${item.labor_hours} hr` : "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11.5px] text-muted-foreground">Rate Override</span>
                  <span className="text-[12.5px] font-medium">{item.labor_rate_override ? `${currency(item.labor_rate_override)}/hr` : "Default rate"}</span>
                </div>
              </div>
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
            <Pencil className="h-3 w-3" />
            Edit Item
          </button>
        </div>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────

  function renderEditContent() {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            <fieldset className="space-y-4">
              <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Basic Info</legend>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11.5px]">Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Axis P3245-V Fixed Dome" className="h-8 text-[13px]" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Category *</FormLabel>
                    <FormControl>
                      <select {...field} className="h-8 w-full rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">Select category…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">SKU</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. AX-P3245-V" className="h-8 text-[13px]" /></FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="manufacturer" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11.5px]">Manufacturer</FormLabel>
                  <FormControl>
                    <Input {...field} list="mfr-suggestions" placeholder="e.g. Axis Communications" className="h-8 text-[13px]" />
                  </FormControl>
                  <datalist id="mfr-suggestions">
                    {manufacturerSuggestions.map((m) => <option key={m} value={m} />)}
                  </datalist>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11.5px]">Description</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Brief product description…" className="text-[13px] resize-none" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="text-[12.5px] font-normal cursor-pointer mt-0!">Active</FormLabel>
                </FormItem>
              )} />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pricing</legend>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Your Cost *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                        <Input {...field} type="number" min="0" step="0.01" className="h-8 pl-5 text-[13px]" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="msrp" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">MSRP / List Price</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                        <Input {...field} type="number" min="0" step="0.01" className="h-8 pl-5 text-[13px]" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="unitOfMeasure" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11.5px]">Unit of Measure *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ea" list="uom-suggestions" className="h-8 text-[13px] w-36" />
                  </FormControl>
                  <datalist id="uom-suggestions">
                    {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                  </datalist>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Product Image</legend>
              <div className="flex cursor-default items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface/50 px-6 py-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[12.5px] font-medium">Click to upload or drag & drop</p>
                  <p className="text-[10.5px] text-muted-foreground/60 italic">Image storage enabled when Supabase Storage is configured</p>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <div className="flex items-center gap-2">
                <FormField control={form.control} name="hasLabor" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} id="hasLabor" />
                    </FormControl>
                    <FormLabel htmlFor="hasLabor" className="text-[11.5px] font-medium cursor-pointer mt-0!">
                      Attach Labor
                    </FormLabel>
                  </FormItem>
                )} />
              </div>
              {hasLabor && (
                <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="laborHours" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11.5px]">Labor Hours *</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" step="0.25" placeholder="e.g. 1.5" className="h-8 text-[13px]" />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="laborRateOverride" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11.5px]">Rate Override</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                            <Input {...field} type="number" min="0" step="1" placeholder="85" className="h-8 pl-5 text-[13px]" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Leave Rate Override blank to use the tenant default ($85/hr). When added to a quote, this item generates a separate labor line.
                  </p>
                </div>
              )}
            </fieldset>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button type="button" onClick={onClose}
              className="h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              className="h-8 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {isSaving ? "Saving…" : item ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-120 flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-[15px] pr-8">
            {mode === "view" && item ? item.name : item ? "Edit Item" : "New Catalog Item"}
          </SheetTitle>
        </SheetHeader>
        {mode === "view" && item ? renderViewContent() : renderEditContent()}
      </SheetContent>
    </Sheet>
  );
}

// ─── CatalogPage ──────────────────────────────────────────────────────────────

function CatalogPage() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const supabase = createClient();

  // Navigation
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Filters
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView]                 = useState<"grid" | "list">("grid");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<DbCatalogItem | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: allItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["catalog-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("*, categories(id, name, color)")
        .order("name");
      if (error) throw error;
      return data as DbCatalogItem[];
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async ({ values, itemId }: { values: ItemFormValues; itemId: string | null }) => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      const payload = {
        category_id:         values.categoryId,
        name:                values.name,
        manufacturer:        values.manufacturer || null,
        sku:                 values.sku || null,
        description:         values.description || null,
        cost:                values.cost,
        msrp:                values.msrp,
        unit_of_measure:     values.unitOfMeasure,
        is_active:           values.isActive,
        has_labor:           values.hasLabor,
        labor_hours:         values.laborHours        ? parseFloat(values.laborHours)        : null,
        labor_rate_override: values.laborRateOverride ? parseFloat(values.laborRateOverride) : null,
      };

      if (itemId) {
        const { error } = await supabase.from("catalog_items").update(payload).eq("id", itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catalog_items").insert({ ...payload, tenant_id: tenantId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-items"] });
      setDrawerOpen(false);
    },
  });

  // ── Page meta ────────────────────────────────────────────────────────────────

  const openNew = useCallback(() => {
    setDrawerItem(null);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    setMeta({
      title: "Catalog",
      subtitle: "Products & Services",
      newLabel: "New Item",
      onNew: openNew,
    });
  }, [setMeta, openNew]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const manufacturerSuggestions = useMemo(() =>
    [...new Set(allItems.map((i) => i.manufacturer).filter(Boolean) as string[])].sort(),
    [allItems],
  );

  const itemCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of allItems) {
      map[item.category_id] = (map[item.category_id] ?? 0) + 1;
    }
    return map;
  }, [allItems]);

  // Derive current view: landing | category | search
  const isSearching = search.trim().length > 0;
  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? null;

  const visibleItems = useMemo(() => {
    let result = allItems;
    if (activeCategoryId && !isSearching) result = result.filter((i) => i.category_id === activeCategoryId);
    if (statusFilter === "active")   result = result.filter((i) => i.is_active);
    if (statusFilter === "inactive") result = result.filter((i) => !i.is_active);
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.sku ?? "").toLowerCase().includes(q) ||
      (i.description ?? "").toLowerCase().includes(q) ||
      (i.manufacturer ?? "").toLowerCase().includes(q),
    );
    return result;
  }, [allItems, activeCategoryId, isSearching, statusFilter, search]);

  function openView(item: DbCatalogItem) {
    setDrawerItem(item);
    setDrawerMode("view");
    setDrawerOpen(true);
  }

  function openEdit(item: DbCatalogItem) {
    setDrawerItem(item);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const showSetupModal = !catsLoading && categories.length === 0;
  const showLanding    = !isSearching && activeCategoryId === null;
  const isLoading      = catsLoading || itemsLoading;

  return (
    <div className="flex flex-col h-full">

      {/* ── Setup modal ──────────────────────────────────────────── */}
      <CategorySetupModal
        open={showSetupModal}
        onDone={() => qc.invalidateQueries({ queryKey: ["categories"] })}
      />

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <FilterBar>
        {/* Breadcrumb when drilled into a category */}
        {activeCategory && !isSearching && (
          <div className="flex items-center gap-1 text-[12.5px] shrink-0 mr-1">
            <button
              type="button"
              onClick={() => setActiveCategoryId(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Catalog
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium">{activeCategory.name}</span>
          </div>
        )}

        <SearchInput value={search} onChange={setSearch} placeholder="Search items, SKUs…" />

        {!showLanding && (
          <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FilterSelect>
        )}

        <span className="ml-auto text-[11.5px] text-muted-foreground">
          {showLanding
            ? `${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`
            : `${visibleItems.length} item${visibleItems.length !== 1 ? "s" : ""}`}
        </span>

        {!showLanding && (
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {(["grid", "list"] as const).map((v, i) => {
              const Icon = v === "grid" ? LayoutGrid : List;
              return (
                <button key={v} type="button" onClick={() => setView(v)}
                  className={cn(
                    "flex h-7 w-8 items-center justify-center transition-colors",
                    i > 0 && "border-l border-border",
                    view === v ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={v === "grid" ? "Grid view" : "List view"}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        )}
      </FilterBar>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          </div>

        ) : showLanding ? (
          /* ── Category landing ─────────────────────────────────── */
          categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  itemCount={itemCountByCategory[cat.id] ?? 0}
                  onClick={() => setActiveCategoryId(cat.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="text-[13px] font-medium">No categories yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Set up your catalog to get started.</p>
            </div>
          )

        ) : view === "grid" ? (
          /* ── Item card grid ───────────────────────────────────── */
          visibleItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {visibleItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onView={() => openView(item)}
                  onEdit={(e) => { e.stopPropagation(); openEdit(item); }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20 text-center">
              <ImagePlus className="h-8 w-8 text-muted-foreground/25 mb-3" />
              <p className="text-[13px] font-medium">No items found</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Try adjusting your filters or add a new item.</p>
            </div>
          )

        ) : (
          /* ── List view ────────────────────────────────────────── */
          <ItemsTable
            items={visibleItems}
            showCategory={isSearching}
            onView={openView}
            onEdit={openEdit}
          />
        )}
      </div>

      <ItemDrawer
        open={drawerOpen}
        item={drawerItem}
        mode={drawerMode}
        categories={categories}
        manufacturerSuggestions={manufacturerSuggestions}
        onClose={() => setDrawerOpen(false)}
        onSwitchToEdit={() => setDrawerMode("edit")}
        onSave={(values, itemId) => saveMutation.mutate({ values, itemId })}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
}

export default CatalogPage;

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Camera, ChevronRight, ImagePlus, LayoutGrid, List, Pencil,
  Search, X,
} from "lucide-react";
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

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/inventory/catalog")({
  head: () => ({ meta: [{ title: "Catalog · Crosscurrent" }] }),
  component: CatalogPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | "camera"
  | "access_control"
  | "networking"
  | "cable_hardware"
  | "audio_video"
  | "labor"
  | "misc";

interface Manufacturer {
  id: string;
  name: string;
  logoInitials: string;
  categories: string[];
}

interface CatalogItem {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  name: string;
  sku: string;
  category: Category;
  description: string;
  cost: number;
  msrp: number;
  unitOfMeasure: string;
  hasLabor: boolean;
  laborHours: number | null;
  laborRateOverride: number | null;
  imageUrl: string | null;
  isActive: boolean;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "camera", "access_control", "networking",
  "cable_hardware", "audio_video", "labor", "misc",
] as const;

const ItemFormSchema = z
  .object({
    name:                z.string().min(1, "Required"),
    manufacturerId:      z.string().min(1, "Required"),
    newManufacturerName: z.string(),
    sku:                 z.string(),
    category:            z.enum(CATEGORIES),
    description:         z.string(),
    cost:                z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    msrp:                z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    unitOfMeasure:       z.string().min(1, "Required"),
    isActive:            z.boolean(),
    hasLabor:            z.boolean(),
    laborHours:          z.string(),
    laborRateOverride:   z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.manufacturerId === "__new__" && !data.newManufacturerName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Manufacturer name required", path: ["newManufacturerName"] });
    }
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
  name: "", manufacturerId: "", newManufacturerName: "",
  sku: "", category: "camera", description: "",
  cost: 0, msrp: 0, unitOfMeasure: "ea",
  isActive: true, hasLabor: false, laborHours: "", laborRateOverride: "",
};

// ─── Config ───────────────────────────────────────────────────────────────────

const categoryMeta: Record<Category, { label: string; cls: string }> = {
  camera:        { label: "Camera",         cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  access_control:{ label: "Access Control", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  networking:    { label: "Networking",     cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  cable_hardware:{ label: "Cable/HW",       cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  audio_video:   { label: "Audio/Video",    cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  labor:         { label: "Labor",          cls: "bg-slate-500/15 text-slate-500" },
  misc:          { label: "Misc",           cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
};

const MFR_PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

function mfrColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return MFR_PALETTE[Math.abs(h) % MFR_PALETTE.length];
}

const UNIT_SUGGESTIONS = ["ea", "hr", "ft", "lot", "spl", "run", "box", "set"];

// ─── Demo data ────────────────────────────────────────────────────────────────

const INITIAL_MANUFACTURERS: Manufacturer[] = [
  { id: "m-1", name: "Axis Communications", logoInitials: "AX", categories: ["Cameras", "Access Control"] },
  { id: "m-2", name: "Verkada",             logoInitials: "VK", categories: ["Cameras", "Access Control"] },
  { id: "m-3", name: "Leviton",             logoInitials: "LV", categories: ["Networking", "Infrastructure"] },
  { id: "m-4", name: "Biamp",               logoInitials: "BA", categories: ["Audio/Video"] },
  { id: "m-5", name: "Internal / Custom",   logoInitials: "PC", categories: ["Labor", "Services", "Misc"] },
];

const INITIAL_ITEMS: CatalogItem[] = [
  {
    id: "ci-101", manufacturerId: "m-1", manufacturerName: "Axis Communications",
    name: "Axis P3245-V Fixed Dome Camera", sku: "AX-P3245-V", category: "camera",
    description: "Fixed dome 1080p camera with WDR, IR illumination to 10m. IP66/IK10 rated.",
    cost: 420, msrp: 549, unitOfMeasure: "ea",
    hasLabor: true, laborHours: 1.5, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-102", manufacturerId: "m-1", manufacturerName: "Axis Communications",
    name: "Axis A1001 Network Door Controller", sku: "AX-A1001", category: "access_control",
    description: "2-door network door controller, OSDP/Wiegand readers, PoE-powered.",
    cost: 680, msrp: 895, unitOfMeasure: "ea",
    hasLabor: true, laborHours: 2, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-103", manufacturerId: "m-1", manufacturerName: "Axis Communications",
    name: "Axis M3106-L MkII Mini Dome", sku: "AX-M3106L", category: "camera",
    description: "Compact 4MP fixed mini dome, indoor ceiling mount, 2.8mm lens.",
    cost: 180, msrp: 235, unitOfMeasure: "ea",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-201", manufacturerId: "m-2", manufacturerName: "Verkada",
    name: "Verkada CD52 Indoor Dome Camera", sku: "VK-CD52", category: "camera",
    description: "5MP IR dome camera, cloud-managed, 30-day onboard storage, PoE.",
    cost: 590, msrp: 749, unitOfMeasure: "ea",
    hasLabor: true, laborHours: 1.5, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-202", manufacturerId: "m-2", manufacturerName: "Verkada",
    name: "Verkada AD31 Access Controller", sku: "VK-AD31", category: "access_control",
    description: "Cloud-based door access controller, supports up to 2 readers, built-in Bluetooth.",
    cost: 890, msrp: 1150, unitOfMeasure: "ea",
    hasLabor: true, laborHours: 2, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-301", manufacturerId: "m-3", manufacturerName: "Leviton",
    name: "Leviton GigaMax 5e QuickPort Jack", sku: "LV-5G108-RW5", category: "networking",
    description: "Cat 5e QuickPort jack, 110-style termination, white. Pack of 25.",
    cost: 28, msrp: 42, unitOfMeasure: "box",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-302", manufacturerId: "m-3", manufacturerName: "Leviton",
    name: "Leviton 42\" 2-Post Open Frame Rack", sku: "LV-47612-FR", category: "cable_hardware",
    description: "42U two-post open frame rack, 19-inch, black powder coat, 400 lb capacity.",
    cost: 285, msrp: 415, unitOfMeasure: "ea",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-401", manufacturerId: "m-4", manufacturerName: "Biamp",
    name: "Biamp Tesira Forte AVB VT4", sku: "BA-TESIRA-VT4", category: "audio_video",
    description: "Network-based fixed I/O DSP, 4-in/4-out, AVB/DANTE, AEC, rackmount.",
    cost: 2240, msrp: 3150, unitOfMeasure: "ea",
    hasLabor: true, laborHours: 3, laborRateOverride: 95,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-402", manufacturerId: "m-4", manufacturerName: "Biamp",
    name: "Biamp Parlé TCM-1 Ceiling Mic", sku: "BA-PARLE-TCM1", category: "audio_video",
    description: "Beamtracking ceiling microphone, 360° coverage, PoE, white or black.",
    cost: 890, msrp: 1280, unitOfMeasure: "ea",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-501", manufacturerId: "m-5", manufacturerName: "Internal / Custom",
    name: "Camera Install — per drop", sku: "INT-CAM-DROP", category: "labor",
    description: "Per-drop labor rate for camera installation including mounting, cable termination, and basic commissioning.",
    cost: 55, msrp: 95, unitOfMeasure: "ea",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-502", manufacturerId: "m-5", manufacturerName: "Internal / Custom",
    name: "Low-Voltage Cable Run", sku: "INT-LV-RUN", category: "cable_hardware",
    description: "Per-run pricing for pulling and terminating Cat6/coax from panel to device, up to 150ft.",
    cost: 40, msrp: 85, unitOfMeasure: "run",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: true,
  },
  {
    id: "ci-503", manufacturerId: "m-5", manufacturerName: "Internal / Custom",
    name: "System Programming & Commissioning", sku: "INT-PROG-HR", category: "labor",
    description: "Hourly rate for system programming, configuration, and on-site commissioning.",
    cost: 75, msrp: 145, unitOfMeasure: "hr",
    hasLabor: false, laborHours: null, laborRateOverride: null,
    imageUrl: null, isActive: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryChip(cat: Category) {
  const m = categoryMeta[cat];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", m.cls)}>
      {m.label}
    </span>
  );
}

// ─── ItemDrawer ───────────────────────────────────────────────────────────────

interface ItemDrawerProps {
  open: boolean;
  item: CatalogItem | null;
  mfrPreset: string | null;
  manufacturers: Manufacturer[];
  onClose: () => void;
  onSave: (item: CatalogItem, newMfr: Manufacturer | null) => void;
}

function ItemDrawer({ open, item, mfrPreset, manufacturers, onClose, onSave }: ItemDrawerProps) {
  const idRef = useRef(0);

  const defaultValues: ItemFormValues = item
    ? {
        name:                item.name,
        manufacturerId:      item.manufacturerId,
        newManufacturerName: "",
        sku:                 item.sku,
        category:            item.category,
        description:         item.description,
        cost:                item.cost,
        msrp:                item.msrp,
        unitOfMeasure:       item.unitOfMeasure,
        isActive:            item.isActive,
        hasLabor:            item.hasLabor,
        laborHours:          item.laborHours?.toString() ?? "",
        laborRateOverride:   item.laborRateOverride?.toString() ?? "",
      }
    : { ...DEFAULT_FORM, manufacturerId: mfrPreset ?? "" };

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(ItemFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              name:                item.name,
              manufacturerId:      item.manufacturerId,
              newManufacturerName: "",
              sku:                 item.sku,
              category:            item.category,
              description:         item.description,
              cost:                item.cost,
              msrp:                item.msrp,
              unitOfMeasure:       item.unitOfMeasure,
              isActive:            item.isActive,
              hasLabor:            item.hasLabor,
              laborHours:          item.laborHours?.toString() ?? "",
              laborRateOverride:   item.laborRateOverride?.toString() ?? "",
            }
          : { ...DEFAULT_FORM, manufacturerId: mfrPreset ?? "" },
      );
    }
  }, [open, item, mfrPreset, form]);

  const mfrId = form.watch("manufacturerId");
  const hasLabor = form.watch("hasLabor");

  function onSubmit(values: ItemFormValues) {
    let mfrId = values.manufacturerId;
    let mfrName = manufacturers.find((m) => m.id === mfrId)?.name ?? "";
    let newMfr: Manufacturer | null = null;

    if (values.manufacturerId === "__new__") {
      const trimmed = values.newManufacturerName.trim();
      const newId = `m-${Date.now()}`;
      newMfr = {
        id: newId,
        name: trimmed,
        logoInitials: trimmed.slice(0, 2).toUpperCase(),
        categories: [],
      };
      mfrId = newId;
      mfrName = trimmed;
    }

    idRef.current += 1;
    onSave(
      {
        id: item?.id ?? `ci-${Date.now()}-${idRef.current}`,
        manufacturerId:   mfrId,
        manufacturerName: mfrName,
        name:             values.name,
        sku:              values.sku,
        category:         values.category,
        description:      values.description,
        cost:             values.cost,
        msrp:             values.msrp,
        unitOfMeasure:    values.unitOfMeasure,
        isActive:         values.isActive,
        hasLabor:         values.hasLabor,
        laborHours:       values.laborHours       ? parseFloat(values.laborHours)       : null,
        laborRateOverride: values.laborRateOverride ? parseFloat(values.laborRateOverride) : null,
        imageUrl:         item?.imageUrl ?? null,
      },
      newMfr,
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-[15px]">
            {item ? "Edit Item" : "New Catalog Item"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* ── Basic Info ─────────────────────────────────────── */}
              <fieldset className="space-y-4">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Basic Info</legend>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Axis P3245-V Fixed Dome" className="h-8 text-[13px]" /></FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="manufacturerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Manufacturer *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-8 w-full rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Select manufacturer…</option>
                        {manufacturers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                        <option value="__new__">+ Add new manufacturer…</option>
                      </select>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                {mfrId === "__new__" && (
                  <FormField control={form.control} name="newManufacturerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11.5px]">New Manufacturer Name *</FormLabel>
                      <FormControl><Input {...field} autoFocus placeholder="e.g. Hanwha Vision" className="h-8 text-[13px]" /></FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="sku" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11.5px]">SKU</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. AX-P3245-V" className="h-8 text-[13px]" /></FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11.5px]">Category *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="h-8 w-full rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{categoryMeta[c].label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Description</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="Brief product description…" className="text-[13px] resize-none" /></FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-[12.5px] font-normal cursor-pointer !mt-0">Active</FormLabel>
                  </FormItem>
                )} />
              </fieldset>

              {/* ── Pricing ──────────────────────────────────────────── */}
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

              {/* ── Product Image ─────────────────────────────────────── */}
              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Product Image</legend>
                <div className="flex cursor-default items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface/50 px-6 py-8">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-foreground">Click to upload or drag & drop</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground/60 italic">
                      Image storage will be enabled when Supabase is connected
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* ── Labor ──────────────────────────────────────────────── */}
              <fieldset className="space-y-3">
                <div className="flex items-center gap-2">
                  <FormField control={form.control} name="hasLabor" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="hasLabor"
                        />
                      </FormControl>
                      <FormLabel htmlFor="hasLabor" className="text-[11.5px] font-medium cursor-pointer !mt-0">
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
                      Leave Rate Override blank to use the tenant default ($85/hr). When added to a quote, this item will generate a separate labor line below it.
                    </p>
                  </div>
                )}
              </fieldset>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button type="button" onClick={onClose}
                className="h-8 rounded-md border border-border bg-surface px-3 text-[12.5px] hover:bg-accent transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="h-8 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                {item ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ─── ManufacturerCard ─────────────────────────────────────────────────────────

interface ManufacturerCardProps {
  mfr: Manufacturer;
  itemCount: number;
  onClick: () => void;
}

function ManufacturerCard({ mfr, itemCount, onClick }: ManufacturerCardProps) {
  const colorCls = mfrColor(mfr.id);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold tracking-tight", colorCls)}>
          {mfr.logoInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug truncate">{mfr.name}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
      </div>
      {mfr.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {mfr.categories.map((c) => (
            <span key={c} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground">
              {c}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── ItemsTable ───────────────────────────────────────────────────────────────

interface ItemsTableProps {
  items: CatalogItem[];
  showManufacturer: boolean;
  onEdit: (item: CatalogItem) => void;
}

function ItemsTable({ items, showManufacturer, onEdit }: ItemsTableProps) {
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
            {showManufacturer && (
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Manufacturer</th>
            )}
            <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">SKU</th>
            <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Category</th>
            <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Cost</th>
            <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">MSRP</th>
            <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Labor hrs</th>
            <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">UoM</th>
            <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Status</th>
            <th className="py-2 pr-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="group border-b border-border/60 last:border-0 hover:bg-surface/40 transition-colors">
              <td className="py-2.5 px-3">
                <p className="font-medium leading-snug">{item.name}</p>
                {item.description && (
                  <p className="text-[10.5px] text-muted-foreground truncate max-w-[220px]">{item.description}</p>
                )}
              </td>
              {showManufacturer && (
                <td className="py-2.5 text-muted-foreground whitespace-nowrap">{item.manufacturerName}</td>
              )}
              <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{item.sku || "—"}</td>
              <td className="py-2.5">{categoryChip(item.category)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-muted-foreground">{currency(item.cost)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums">{currency(item.msrp)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                {item.hasLabor && item.laborHours != null ? item.laborHours : "—"}
              </td>
              <td className="py-2.5 text-center text-muted-foreground">{item.unitOfMeasure}</td>
              <td className="py-2.5 text-center">
                <span className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                  item.isActive
                    ? "bg-status-won/15 text-status-won"
                    : "bg-muted text-muted-foreground",
                )}>
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded border border-border bg-surface px-2 h-6 text-[11px] text-muted-foreground hover:text-foreground transition-all"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CatalogPage ──────────────────────────────────────────────────────────────

function CatalogPage() {
  const { setMeta } = useMeta();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(INITIAL_MANUFACTURERS);
  const [items, setItems] = useState<CatalogItem[]>(INITIAL_ITEMS);

  // Navigation state
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drillMfr, setDrillMfr] = useState<string | null>(null);

  // Filters
  const [gridSearch,   setGridSearch]   = useState("");
  const [listSearch,   setListSearch]   = useState("");
  const [mfrFilter,    setMfrFilter]    = useState("all");
  const [catFilter,    setCatFilter]    = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Drawer
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [drawerItem,  setDrawerItem]  = useState<CatalogItem | null>(null);

  const openNew = useCallback(() => {
    setDrawerItem(null);
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

  function handleSave(saved: CatalogItem, newMfr: Manufacturer | null) {
    if (newMfr) {
      setManufacturers((prev) => [...prev, newMfr]);
    }
    setItems((prev) =>
      prev.some((i) => i.id === saved.id)
        ? prev.map((i) => (i.id === saved.id ? saved : i))
        : [...prev, saved],
    );
    setDrawerOpen(false);
  }

  // Derived counts
  const itemCountByMfr = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.manufacturerId] = (map[item.manufacturerId] ?? 0) + 1;
    }
    return map;
  }, [items]);

  // Filtered items for the current view
  const filteredItems = useMemo(() => {
    let result = items;
    if (drillMfr) result = result.filter((i) => i.manufacturerId === drillMfr);
    if (view === "list" && mfrFilter !== "all") result = result.filter((i) => i.manufacturerId === mfrFilter);
    if (catFilter !== "all") result = result.filter((i) => i.category === catFilter);
    if (statusFilter === "active")   result = result.filter((i) => i.isActive);
    if (statusFilter === "inactive") result = result.filter((i) => !i.isActive);
    const q = (drillMfr ? listSearch : listSearch).toLowerCase().trim();
    if (q) result = result.filter((i) =>
      i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
    );
    return result;
  }, [items, drillMfr, view, mfrFilter, catFilter, statusFilter, listSearch]);

  const filteredMfrs = useMemo(() => {
    const q = gridSearch.toLowerCase().trim();
    return manufacturers.filter((m) =>
      !q || m.name.toLowerCase().includes(q),
    );
  }, [manufacturers, gridSearch]);

  const activeMfr = manufacturers.find((m) => m.id === drillMfr);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">

        {/* Breadcrumb / drill-in label */}
        {drillMfr && activeMfr ? (
          <div className="flex items-center gap-1 text-[12.5px] mr-2">
            <button
              type="button"
              onClick={() => { setDrillMfr(null); setListSearch(""); setCatFilter("all"); setStatusFilter("all"); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Catalog
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{activeMfr.name}</span>
            <button
              type="button"
              onClick={() => { setDrillMfr(null); setListSearch(""); setCatFilter("all"); setStatusFilter("all"); }}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Clear manufacturer filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}

        {/* Search */}
        {(view === "grid" && !drillMfr) ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-7 w-48">
            <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
            <input
              value={gridSearch}
              onChange={(e) => setGridSearch(e.target.value)}
              placeholder="Search manufacturers…"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-7 w-48">
            <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
            <input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search items…"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* List-view filters */}
        {(view === "list" || drillMfr) && (
          <>
            {view === "list" && !drillMfr && (
              <select
                value={mfrFilter}
                onChange={(e) => setMfrFilter(e.target.value)}
                className="h-7 rounded-md border border-border bg-surface px-2 text-[12px] focus:outline-none"
              >
                <option value="all">All Manufacturers</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as Category | "all")}
              className="h-7 rounded-md border border-border bg-surface px-2 text-[12px] focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryMeta[c].label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="h-7 rounded-md border border-border bg-surface px-2 text-[12px] focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        )}

        <span className="ml-auto text-[11.5px] text-muted-foreground">
          {view === "grid" && !drillMfr
            ? `${filteredMfrs.length} manufacturer${filteredMfrs.length !== 1 ? "s" : ""}`
            : `${filteredItems.length} item${filteredItems.length !== 1 ? "s" : ""}`}
        </span>

        {/* View toggle */}
        {!drillMfr && (
          <div className="flex items-center rounded-md border border-border overflow-hidden ml-1">
            {(["grid", "list"] as const).map((v, i) => {
              const Icon = v === "grid" ? LayoutGrid : List;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setView(v); setListSearch(""); setCatFilter("all"); setStatusFilter("all"); setMfrFilter("all"); }}
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

        {/* New Item (when in drill view — topbar button also works) */}
        {drillMfr && (
          <button
            type="button"
            onClick={openNew}
            className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:opacity-90 transition-opacity ml-1"
          >
            + New Item
          </button>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Manufacturer grid */}
        {view === "grid" && !drillMfr && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMfrs.map((mfr) => (
              <ManufacturerCard
                key={mfr.id}
                mfr={mfr}
                itemCount={itemCountByMfr[mfr.id] ?? 0}
                onClick={() => { setDrillMfr(mfr.id); setListSearch(""); setCatFilter("all"); setStatusFilter("all"); }}
              />
            ))}
            {filteredMfrs.length === 0 && (
              <div className="col-span-3 flex flex-col items-center py-16 text-center">
                <p className="text-[13px] font-medium">No manufacturers match "{gridSearch}"</p>
              </div>
            )}
          </div>
        )}

        {/* Items table — list view or drill-in */}
        {(view === "list" || drillMfr) && (
          <ItemsTable
            items={filteredItems}
            showManufacturer={view === "list" && !drillMfr}
            onEdit={(item) => { setDrawerItem(item); setDrawerOpen(true); }}
          />
        )}
      </div>

      <ItemDrawer
        open={drawerOpen}
        item={drawerItem}
        mfrPreset={drillMfr}
        manufacturers={manufacturers}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default CatalogPage;

/*
  SCHEMA NOTES — catalog_items table
  id, tenant_id, manufacturer_id, name, sku, category, description,
  cost, msrp, unit_of_measure, has_labor, labor_hours, labor_rate_override,
  image_url, is_active, created_at, updated_at

  manufacturers table
  id, tenant_id, name, logo_url, created_at
*/

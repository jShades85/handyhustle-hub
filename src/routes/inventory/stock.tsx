import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Camera,
  ChevronRight, ImagePlus, Info, LayoutGrid, List, Lock, Pencil,
  RefreshCw, RotateCcw, Search, SlidersHorizontal, X,
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/inventory/stock")({
  head: () => ({ meta: [{ title: "Stock · Crosscurrent" }] }),
  component: StockPage,
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

type StockStatus = "out_of_stock" | "low_stock" | "in_stock" | "overstocked";
type MovementType = "received" | "consumed" | "adjusted" | "returned";
type AdjustType = "cycle_count" | "received" | "consumed" | "returned";

interface StockMovement {
  id: string;
  type: MovementType;
  qtyDelta: number;
  note: string | null;
  jobReference: string | null;
  createdAt: string;
  createdBy: string;
}

interface StockItem {
  id: string;
  catalogItemId: string | null;
  name: string;
  sku: string;
  category: Category;
  description: string;
  unitCost: number;
  unitOfMeasure: string;
  manufacturerName: string;
  locationBin: string;
  qtyOnHand: number;
  minStockLevel: number;
  maxStockLevel: number;
  imageUrl: string | null;
  isActive: boolean;
  movements: StockMovement[];
}

interface StockManufacturer {
  id: string;
  name: string;
  logoInitials: string;
  categories: string[];
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "camera", "access_control", "networking",
  "cable_hardware", "audio_video", "labor", "misc",
] as const;

const StockItemFormSchema = z
  .object({
    catalogItemId:  z.string().nullable(),
    name:           z.string().min(1, "Required"),
    sku:            z.string(),
    manufacturerName: z.string().min(1, "Required"),
    category:       z.enum(CATEGORIES),
    description:    z.string(),
    locationBin:    z.string().min(1, "Required"),
    isActive:       z.boolean(),
    unitCost:       z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    unitOfMeasure:  z.string().min(1, "Required"),
    qtyOnHand:      z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    minStockLevel:  z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
    maxStockLevel:  z.coerce.number({ invalid_type_error: "Required" }).min(0, "Must be ≥ 0"),
  })
  .superRefine((data, ctx) => {
    if (data.maxStockLevel <= data.minStockLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be greater than min stock level",
        path: ["maxStockLevel"],
      });
    }
  });

type StockItemFormValues = z.infer<typeof StockItemFormSchema>;

const DEFAULT_FORM: StockItemFormValues = {
  catalogItemId: null,
  name: "", sku: "", manufacturerName: "", category: "camera",
  description: "", locationBin: "", isActive: true,
  unitCost: 0, unitOfMeasure: "ea",
  qtyOnHand: 0, minStockLevel: 5, maxStockLevel: 50,
};

// ─── Config ───────────────────────────────────────────────────────────────────

const categoryMeta: Record<Category, { label: string; cls: string }> = {
  camera:         { label: "Camera",         cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  access_control: { label: "Access Control", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  networking:     { label: "Networking",     cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  cable_hardware: { label: "Cable/HW",       cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  audio_video:    { label: "Audio/Video",    cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  labor:          { label: "Labor",          cls: "bg-slate-500/15 text-slate-500" },
  misc:           { label: "Misc",           cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
};

const stockStatusMeta: Record<StockStatus, { label: string; badgeCls: string; qtyCls: string }> = {
  out_of_stock: { label: "Out of Stock", badgeCls: "bg-red-500/15 text-red-600 dark:text-red-400",     qtyCls: "text-red-600 dark:text-red-400"     },
  low_stock:    { label: "Low Stock",    badgeCls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", qtyCls: "text-amber-600 dark:text-amber-400" },
  in_stock:     { label: "In Stock",     badgeCls: "bg-green-500/15 text-green-600 dark:text-green-400", qtyCls: "text-green-700 dark:text-green-400" },
  overstocked:  { label: "Overstocked", badgeCls: "bg-blue-500/15 text-blue-600 dark:text-blue-400",   qtyCls: "text-blue-600 dark:text-blue-400"   },
};

const movementMeta: Record<MovementType, {
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}> = {
  received: { Icon: ArrowDownToLine, color: "text-green-600 dark:text-green-400", label: "Received" },
  consumed: { Icon: ArrowUpFromLine, color: "text-slate-500",                     label: "Consumed" },
  adjusted: { Icon: RefreshCw,       color: "text-blue-600 dark:text-blue-400",   label: "Adjusted" },
  returned: { Icon: RotateCcw,       color: "text-amber-600 dark:text-amber-400", label: "Returned" },
};

const MFR_PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

const UNIT_SUGGESTIONS = ["ea", "hr", "ft", "lot", "spl", "run", "box", "set"];

function mfrColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return MFR_PALETTE[Math.abs(h) % MFR_PALETTE.length];
}

// ─── Catalog lookup (for drawer's Catalog Link section) ───────────────────────

interface CatalogLookupItem {
  id: string;
  name: string;
  sku: string;
  manufacturerName: string;
  category: Category;
  unitCost: number;
}

const CATALOG_LOOKUP: CatalogLookupItem[] = [
  { id: "ci-101", name: "Axis P3245-V Fixed Dome Camera",       sku: "AX-P3245-V",    manufacturerName: "Axis Communications", category: "camera",         unitCost: 420  },
  { id: "ci-102", name: "Axis A1001 Network Door Controller",   sku: "AX-A1001",       manufacturerName: "Axis Communications", category: "access_control", unitCost: 680  },
  { id: "ci-103", name: "Axis M3106-L MkII Mini Dome",          sku: "AX-M3106L",      manufacturerName: "Axis Communications", category: "camera",         unitCost: 180  },
  { id: "ci-201", name: "Verkada CD52 Indoor Dome Camera",      sku: "VK-CD52",        manufacturerName: "Verkada",             category: "camera",         unitCost: 590  },
  { id: "ci-202", name: "Verkada AD31 Access Controller",       sku: "VK-AD31",        manufacturerName: "Verkada",             category: "access_control", unitCost: 890  },
  { id: "ci-301", name: "Leviton GigaMax 5e QuickPort Jack",    sku: "LV-5G108-RW5",   manufacturerName: "Leviton",             category: "networking",     unitCost: 28   },
  { id: "ci-302", name: 'Leviton 42" 2-Post Open Frame Rack',  sku: "LV-47612-FR",    manufacturerName: "Leviton",             category: "cable_hardware", unitCost: 285  },
  { id: "ci-401", name: "Biamp Tesira Forte AVB VT4",           sku: "BA-TESIRA-VT4",  manufacturerName: "Biamp",               category: "audio_video",    unitCost: 2240 },
  { id: "ci-402", name: "Biamp Parlé TCM-1 Ceiling Mic",        sku: "BA-PARLE-TCM1",  manufacturerName: "Biamp",               category: "audio_video",    unitCost: 890  },
  { id: "ci-501", name: "Camera Install — per drop",            sku: "INT-CAM-DROP",   manufacturerName: "Internal / Custom",   category: "labor",          unitCost: 55   },
  { id: "ci-502", name: "Low-Voltage Cable Run",                sku: "INT-LV-RUN",     manufacturerName: "Internal / Custom",   category: "cable_hardware", unitCost: 40   },
];

// ─── Demo data ────────────────────────────────────────────────────────────────

const INITIAL_MANUFACTURERS: StockManufacturer[] = [
  { id: "sm-1", name: "Axis Communications", logoInitials: "AX", categories: ["Camera", "Access Control"] },
  { id: "sm-2", name: "Verkada",             logoInitials: "VK", categories: ["Camera", "Access Control"] },
  { id: "sm-3", name: "Leviton",             logoInitials: "LV", categories: ["Networking", "Infrastructure"] },
  { id: "sm-4", name: "Biamp",               logoInitials: "BA", categories: ["Audio/Video"] },
  { id: "sm-5", name: "Misc / Consumables",  logoInitials: "MC", categories: ["Cable", "Hardware"] },
];

const INITIAL_ITEMS: StockItem[] = [
  // ── Axis Communications ──────────────────────────────────────────────────────
  {
    id: "si-1", catalogItemId: "ci-101", name: "Axis P3245-V Fixed Dome Camera",
    sku: "AX-P3245-V", category: "camera", manufacturerName: "Axis Communications",
    description: "Fixed dome 1080p, WDR, IR to 10m, IP66/IK10.",
    unitCost: 420, unitOfMeasure: "ea", locationBin: "Warehouse Shelf A1",
    qtyOnHand: 14, minStockLevel: 5, maxStockLevel: 25, imageUrl: null, isActive: true,
    movements: [
      { id: "m-1-5", type: "adjusted",  qtyDelta: +1,  note: "Cycle count — found one unit",        jobReference: null,                          createdAt: "Jun 8, 2026",  createdBy: "Justin Shader" },
      { id: "m-1-4", type: "consumed",  qtyDelta: -3,  note: null,                                  jobReference: "PRJ-0023 — Halcyon Schools Phase 1", createdAt: "Jun 5, 2026",  createdBy: "Tyler Brant" },
      { id: "m-1-3", type: "consumed",  qtyDelta: -4,  note: null,                                  jobReference: "PRJ-0021 — Vertex Capital 14F",      createdAt: "Jun 3, 2026",  createdBy: "Justin Shader" },
      { id: "m-1-2", type: "consumed",  qtyDelta: -3,  note: null,                                  jobReference: "PRJ-0019 — Pinecrest Hospitality",   createdAt: "May 22, 2026", createdBy: "Tyler Brant" },
      { id: "m-1-1", type: "received",  qtyDelta: +24, note: "Initial stock receipt",               jobReference: "PO-1178",                            createdAt: "Jun 1, 2026",  createdBy: "System" },
    ],
  },
  {
    id: "si-2", catalogItemId: "ci-103", name: "Axis M3106-L MkII Mini Dome",
    sku: "AX-M3106L", category: "camera", manufacturerName: "Axis Communications",
    description: "Compact 4MP fixed mini dome, 2.8mm lens, indoor ceiling.",
    unitCost: 180, unitOfMeasure: "ea", locationBin: "Warehouse Shelf A1",
    qtyOnHand: 3, minStockLevel: 8, maxStockLevel: 30, imageUrl: null, isActive: true,
    movements: [
      { id: "m-2-3", type: "consumed",  qtyDelta: -4, note: null, jobReference: "PRJ-0022 — Helio Health 3F",       createdAt: "Jun 2, 2026",  createdBy: "Elise Morales" },
      { id: "m-2-2", type: "consumed",  qtyDelta: -3, note: null, jobReference: "PRJ-0019 — Pinecrest Hospitality", createdAt: "May 22, 2026", createdBy: "Tyler Brant" },
      { id: "m-2-1", type: "received",  qtyDelta: +10, note: "Initial order receipt", jobReference: "PO-1176", createdAt: "May 15, 2026", createdBy: "System" },
    ],
  },
  {
    id: "si-3", catalogItemId: "ci-102", name: "Axis A1001 Network Door Controller",
    sku: "AX-A1001", category: "access_control", manufacturerName: "Axis Communications",
    description: "2-door network controller, OSDP/Wiegand, PoE-powered.",
    unitCost: 680, unitOfMeasure: "ea", locationBin: "Cage B",
    qtyOnHand: 0, minStockLevel: 2, maxStockLevel: 10, imageUrl: null, isActive: true,
    movements: [
      { id: "m-3-3", type: "consumed",  qtyDelta: -3, note: null, jobReference: "PRJ-0020 — Quay Residential Lobby", createdAt: "May 28, 2026", createdBy: "Tyler Brant" },
      { id: "m-3-2", type: "consumed",  qtyDelta: -2, note: null, jobReference: "PRJ-0017 — Vertex Capital Lobby",   createdAt: "Apr 18, 2026", createdBy: "Justin Shader" },
      { id: "m-3-1", type: "received",  qtyDelta: +5, note: "Initial stock receipt", jobReference: "PO-1172", createdAt: "Apr 10, 2026", createdBy: "System" },
    ],
  },
  // ── Verkada ──────────────────────────────────────────────────────────────────
  {
    id: "si-4", catalogItemId: "ci-201", name: "Verkada CD52 Indoor Dome Camera",
    sku: "VK-CD52", category: "camera", manufacturerName: "Verkada",
    description: "5MP IR dome, cloud-managed, 30-day onboard storage, PoE.",
    unitCost: 590, unitOfMeasure: "ea", locationBin: "Warehouse Shelf A2",
    qtyOnHand: 8, minStockLevel: 4, maxStockLevel: 20, imageUrl: null, isActive: true,
    movements: [
      { id: "m-4-2", type: "consumed", qtyDelta: -4, note: null, jobReference: "PRJ-0024 — Cinder & Oak", createdAt: "Jun 6, 2026", createdBy: "Elise Morales" },
      { id: "m-4-1", type: "received", qtyDelta: +12, note: "Verkada bulk order", jobReference: "PO-1179", createdAt: "Jun 3, 2026", createdBy: "System" },
    ],
  },
  {
    id: "si-5", catalogItemId: null, name: "Verkada AD31 Access Controller",
    sku: "VK-AD31", category: "access_control", manufacturerName: "Verkada",
    description: "Cloud-based door controller, 2 readers, built-in Bluetooth.",
    unitCost: 890, unitOfMeasure: "ea", locationBin: "Cage B",
    qtyOnHand: 5, minStockLevel: 2, maxStockLevel: 12, imageUrl: null, isActive: true,
    movements: [
      { id: "m-5-3", type: "adjusted",  qtyDelta: -1,  note: "RMA — defective unit",    jobReference: null,                           createdAt: "Jun 4, 2026",  createdBy: "Elise Morales" },
      { id: "m-5-2", type: "consumed",  qtyDelta: -2,  note: null,                       jobReference: "PRJ-0022 — Helio Health 3F",   createdAt: "Jun 1, 2026",  createdBy: "Justin Shader" },
      { id: "m-5-1", type: "received",  qtyDelta: +8,  note: "Verkada access order",    jobReference: "PO-1177",                      createdAt: "May 28, 2026", createdBy: "System" },
    ],
  },
  // ── Leviton ──────────────────────────────────────────────────────────────────
  {
    id: "si-6", catalogItemId: "ci-301", name: "Leviton GigaMax Cat5e QuickPort Jack",
    sku: "LV-5G108-RW5", category: "networking", manufacturerName: "Leviton",
    description: "Cat5e QuickPort jack, 110-style termination, white. Pack of 25.",
    unitCost: 28, unitOfMeasure: "box", locationBin: "Warehouse Shelf A3",
    qtyOnHand: 48, minStockLevel: 10, maxStockLevel: 40, imageUrl: null, isActive: true,
    movements: [
      { id: "m-6-3", type: "consumed", qtyDelta: -7,  note: "Terminations — various projects", jobReference: null,     createdAt: "Jun 5, 2026",  createdBy: "Tyler Brant" },
      { id: "m-6-2", type: "received", qtyDelta: +30, note: "Top-up order",                    jobReference: "PO-1180", createdAt: "May 20, 2026", createdBy: "System" },
      { id: "m-6-1", type: "received", qtyDelta: +25, note: "Bulk networking order",            jobReference: "PO-1175", createdAt: "Apr 5, 2026",  createdBy: "System" },
    ],
  },
  {
    id: "si-7", catalogItemId: "ci-302", name: 'Leviton 42" 2-Post Open Frame Rack',
    sku: "LV-47612-FR", category: "cable_hardware", manufacturerName: "Leviton",
    description: "42U two-post open frame rack, 19-inch, 400 lb capacity.",
    unitCost: 285, unitOfMeasure: "ea", locationBin: "Warehouse Shelf A4",
    qtyOnHand: 2, minStockLevel: 1, maxStockLevel: 6, imageUrl: null, isActive: true,
    movements: [
      { id: "m-7-3", type: "consumed", qtyDelta: -1, note: null, jobReference: "PRJ-0021 — Vertex Capital 14F",   createdAt: "Jun 4, 2026",  createdBy: "Tyler Brant" },
      { id: "m-7-2", type: "consumed", qtyDelta: -1, note: null, jobReference: "PRJ-0018 — Northbeam Architects", createdAt: "Apr 22, 2026", createdBy: "Justin Shader" },
      { id: "m-7-1", type: "received", qtyDelta: +4, note: "Rack order", jobReference: "PO-1171",                 createdAt: "Mar 12, 2026", createdBy: "System" },
    ],
  },
  // ── Biamp ─────────────────────────────────────────────────────────────────────
  {
    id: "si-8", catalogItemId: "ci-401", name: "Biamp Tesira Forte AVB VT4",
    sku: "BA-TESIRA-VT4", category: "audio_video", manufacturerName: "Biamp",
    description: "Fixed I/O DSP, 4-in/4-out, AVB/DANTE, AEC, rackmount.",
    unitCost: 2240, unitOfMeasure: "ea", locationBin: "Van 1",
    qtyOnHand: 1, minStockLevel: 2, maxStockLevel: 8, imageUrl: null, isActive: true,
    movements: [
      { id: "m-8-3", type: "consumed", qtyDelta: -1, note: null, jobReference: "PRJ-0021 — Vertex Capital 14F",  createdAt: "May 15, 2026", createdBy: "Elise Morales" },
      { id: "m-8-2", type: "consumed", qtyDelta: -1, note: null, jobReference: "PRJ-0019 — Pinecrest Boardroom", createdAt: "Apr 30, 2026", createdBy: "Justin Shader" },
      { id: "m-8-1", type: "received", qtyDelta: +3, note: "Biamp DSP order", jobReference: "PO-1173",           createdAt: "Mar 25, 2026", createdBy: "System" },
    ],
  },
  {
    id: "si-9", catalogItemId: "ci-402", name: "Biamp Parlé TCM-1 Ceiling Mic",
    sku: "BA-PARLE-TCM1", category: "audio_video", manufacturerName: "Biamp",
    description: "Beamtracking ceiling microphone, 360° coverage, PoE.",
    unitCost: 890, unitOfMeasure: "ea", locationBin: "Van 1",
    qtyOnHand: 6, minStockLevel: 3, maxStockLevel: 16, imageUrl: null, isActive: true,
    movements: [
      { id: "m-9-2", type: "consumed", qtyDelta: -2, note: null, jobReference: "PRJ-0019 — Pinecrest Boardroom", createdAt: "Apr 30, 2026", createdBy: "Justin Shader" },
      { id: "m-9-1", type: "received", qtyDelta: +8, note: "Biamp mic order", jobReference: "PO-1174",           createdAt: "Apr 1, 2026",  createdBy: "System" },
    ],
  },
  // ── Misc / Consumables ────────────────────────────────────────────────────────
  {
    id: "si-10", catalogItemId: null, name: "Cat6 Cable 1000ft Bulk Box",
    sku: "CAT6-BULK-1K", category: "networking", manufacturerName: "Misc / Consumables",
    description: "Cat6 UTP 1000ft pull box, 23AWG, CMR-rated, blue.",
    unitCost: 110, unitOfMeasure: "box", locationBin: "Warehouse Shelf A3",
    qtyOnHand: 2, minStockLevel: 3, maxStockLevel: 12, imageUrl: null, isActive: true,
    movements: [
      { id: "m-10-3", type: "consumed", qtyDelta: -1, note: "Additional drops", jobReference: "PRJ-0023 — Halcyon Schools",  createdAt: "Jun 3, 2026",  createdBy: "Tyler Brant" },
      { id: "m-10-2", type: "consumed", qtyDelta: -2, note: null,               jobReference: "PRJ-0022 — Helio Health 3F",  createdAt: "May 30, 2026", createdBy: "Tyler Brant" },
      { id: "m-10-1", type: "received", qtyDelta: +5, note: "Bulk cable order", jobReference: "PO-1176",                     createdAt: "May 15, 2026", createdBy: "System" },
    ],
  },
  {
    id: "si-11", catalogItemId: null, name: "HDMI 2.1 Cable 6ft",
    sku: "HDMI-2-6FT", category: "audio_video", manufacturerName: "Misc / Consumables",
    description: "HDMI 2.1 cable, 6ft, 48Gbps, supports 8K@60Hz.",
    unitCost: 22, unitOfMeasure: "ea", locationBin: "Van 2",
    qtyOnHand: 24, minStockLevel: 10, maxStockLevel: 50, imageUrl: null, isActive: true,
    movements: [
      { id: "m-11-4", type: "returned", qtyDelta: +1,  note: "Spare returned from site",  jobReference: "PRJ-0019",                     createdAt: "Jun 5, 2026",  createdBy: "Elise Morales" },
      { id: "m-11-3", type: "consumed", qtyDelta: -2,  note: null,                         jobReference: "PRJ-0021 — Vertex Capital 14F", createdAt: "Jun 4, 2026",  createdBy: "Tyler Brant" },
      { id: "m-11-2", type: "consumed", qtyDelta: -3,  note: null,                         jobReference: "PRJ-0019 — Pinecrest Boardroom",createdAt: "Apr 30, 2026", createdBy: "Justin Shader" },
      { id: "m-11-1", type: "received", qtyDelta: +28, note: "Initial cable stock",        jobReference: "PO-1170",                      createdAt: "Feb 28, 2026", createdBy: "System" },
    ],
  },
  {
    id: "si-12", catalogItemId: null, name: "Single-Gang Low-Voltage Mounting Plate",
    sku: "MISC-SGMNT", category: "misc", manufacturerName: "Misc / Consumables",
    description: "Low-voltage single-gang mounting bracket, ivory/white, clamshell pack of 10.",
    unitCost: 3, unitOfMeasure: "ea", locationBin: "Warehouse Shelf A4",
    qtyOnHand: 45, minStockLevel: 20, maxStockLevel: 100, imageUrl: null, isActive: true,
    movements: [
      { id: "m-12-2", type: "consumed", qtyDelta: -5,  note: "Various installs", jobReference: null,     createdAt: "Jun 5, 2026", createdBy: "Tyler Brant" },
      { id: "m-12-1", type: "received", qtyDelta: +50, note: "Bulk hardware order", jobReference: "PO-1175", createdAt: "Apr 5, 2026",  createdBy: "System" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockStatus(item: StockItem): StockStatus {
  if (item.qtyOnHand === 0) return "out_of_stock";
  if (item.qtyOnHand <= item.minStockLevel) return "low_stock";
  if (item.qtyOnHand > item.maxStockLevel) return "overstocked";
  return "in_stock";
}

function categoryChip(cat: Category) {
  const m = categoryMeta[cat];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", m.cls)}>
      {m.label}
    </span>
  );
}

function statusChip(status: StockStatus) {
  const m = stockStatusMeta[status];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", m.badgeCls)}>
      {m.label}
    </span>
  );
}

// ─── AdjustCell ───────────────────────────────────────────────────────────────

interface AdjustCellProps {
  item: StockItem;
  onAdjust: (itemId: string, delta: number, type: MovementType, jobRef: string, note: string) => void;
}

function AdjustCell({ item, onAdjust }: AdjustCellProps) {
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(item.qtyOnHand);
  const [adjType, setAdjType] = useState<AdjustType>("cycle_count");
  const [jobRef, setJobRef] = useState("");
  const [noteText, setNoteText] = useState("");

  function handleOpenChange(v: boolean) {
    if (v) {
      setNewQty(item.qtyOnHand);
      setAdjType("cycle_count");
      setJobRef("");
      setNoteText("");
    }
    setOpen(v);
  }

  function handleConfirm() {
    const delta = newQty - item.qtyOnHand;
    const movType: MovementType = adjType === "cycle_count" ? "adjusted" : adjType;
    onAdjust(item.id, delta, movType, jobRef, noteText);
    setOpen(false);
  }

  const delta = newQty - item.qtyOnHand;

  const fieldCls = "h-7 w-full rounded-md border border-border bg-surface px-2 text-[12px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded border border-border bg-surface px-2 h-6 text-[11px] text-muted-foreground hover:text-foreground transition-all"
        >
          <SlidersHorizontal className="h-3 w-3" />
          Adjust
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="end">
        {/* Header */}
        <div className="px-3.5 py-3 border-b border-border">
          <p className="text-[12.5px] font-semibold">Adjust Quantity</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.name}</p>
        </div>

        <div className="px-3.5 py-3 space-y-3">
          {/* Current qty */}
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Current</span>
            <span className="font-mono font-semibold tabular-nums">
              {item.qtyOnHand} {item.unitOfMeasure}
            </span>
          </div>

          {/* New qty stepper */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">New Quantity</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNewQty((q) => Math.max(0, q - 1))}
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-[13px] font-medium"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                value={newQty}
                onChange={(e) => setNewQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="h-7 w-14 rounded-md border border-border bg-surface text-center text-[13px] tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setNewQty((q) => q + 1)}
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-[13px] font-medium"
              >
                +
              </button>
              <span className={cn(
                "ml-1 text-[11px] font-mono tabular-nums",
                delta > 0 ? "text-green-600 dark:text-green-400"
                  : delta < 0 ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground",
              )}>
                {delta > 0 ? `+${delta}` : delta < 0 ? String(delta) : "—"}
              </span>
            </div>
          </div>

          {/* Adjustment type */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Type</p>
            <select
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as AdjustType)}
              className={fieldCls}
            >
              <option value="cycle_count">Cycle Count</option>
              <option value="received">Received</option>
              <option value="consumed">Consumed</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          {/* Job Reference */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Job Reference</p>
            <input
              value={jobRef}
              onChange={(e) => setJobRef(e.target.value)}
              placeholder="e.g. PRJ-0023"
              className={fieldCls}
            />
          </div>

          {/* Note */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Note</p>
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Optional note…"
              className={fieldCls}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-3.5 py-2.5 border-t border-border">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-7 rounded-md border border-border bg-surface px-3 text-[12px] hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-7 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Confirm
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Locked field display helpers ────────────────────────────────────────────

function LockedLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <Lock className="h-3 w-3 text-muted-foreground/50" />
    </span>
  );
}

function LockedValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-8 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-[13px] text-foreground/70 cursor-default select-text leading-[1.6]">
      {children}
    </div>
  );
}

// ─── StockItemDrawer ──────────────────────────────────────────────────────────

interface StockItemDrawerProps {
  open: boolean;
  item: StockItem | null;
  onClose: () => void;
  onSave: (item: StockItem) => void;
}

function StockItemDrawer({ open, item, onClose, onSave }: StockItemDrawerProps) {
  const idRef = useRef(0);

  const defaultValues: StockItemFormValues = item
    ? {
        catalogItemId:   item.catalogItemId,
        name:            item.name,
        sku:             item.sku,
        manufacturerName: item.manufacturerName,
        category:        item.category,
        description:     item.description,
        locationBin:     item.locationBin,
        isActive:        item.isActive,
        unitCost:        item.unitCost,
        unitOfMeasure:   item.unitOfMeasure,
        qtyOnHand:       item.qtyOnHand,
        minStockLevel:   item.minStockLevel,
        maxStockLevel:   item.maxStockLevel,
      }
    : DEFAULT_FORM;

  const form = useForm<StockItemFormValues>({
    resolver: zodResolver(StockItemFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              catalogItemId:   item.catalogItemId,
              name:            item.name,
              sku:             item.sku,
              manufacturerName: item.manufacturerName,
              category:        item.category,
              description:     item.description,
              locationBin:     item.locationBin,
              isActive:        item.isActive,
              unitCost:        item.unitCost,
              unitOfMeasure:   item.unitOfMeasure,
              qtyOnHand:       item.qtyOnHand,
              minStockLevel:   item.minStockLevel,
              maxStockLevel:   item.maxStockLevel,
            }
          : DEFAULT_FORM,
      );
    }
  }, [open, item, form]);

  const formValues = form.watch();
  const watchedCatalogId = formValues.catalogItemId;
  const isLinked = !!watchedCatalogId;

  function handleCatalogLink(id: string) {
    form.setValue("catalogItemId", id || null);
    if (id) {
      const cat = CATALOG_LOOKUP.find((c) => c.id === id);
      if (cat) {
        form.setValue("name",             cat.name);
        form.setValue("sku",              cat.sku);
        form.setValue("manufacturerName", cat.manufacturerName);
        form.setValue("category",         cat.category);
        form.setValue("unitCost",         cat.unitCost);
      }
    }
  }

  function handleUnlink() {
    form.setValue("catalogItemId", null);
    form.setValue("name", "");
    form.setValue("sku", "");
    form.setValue("manufacturerName", "");
    form.setValue("category", "camera");
    form.setValue("description", "");
    form.setValue("unitCost", 0);
    form.setValue("unitOfMeasure", "ea");
  }

  function onSubmit(values: StockItemFormValues) {
    idRef.current += 1;
    onSave({
      id:              item?.id ?? `si-${Date.now()}-${idRef.current}`,
      catalogItemId:   values.catalogItemId,
      name:            values.name,
      sku:             values.sku,
      manufacturerName: values.manufacturerName,
      category:        values.category,
      description:     values.description,
      locationBin:     values.locationBin,
      isActive:        values.isActive,
      unitCost:        values.unitCost,
      unitOfMeasure:   values.unitOfMeasure,
      qtyOnHand:       values.qtyOnHand,
      minStockLevel:   values.minStockLevel,
      maxStockLevel:   values.maxStockLevel,
      imageUrl:        item?.imageUrl ?? null,
      movements:       item?.movements ?? [],
    });
  }

  const sortedMovements = item
    ? [...item.movements].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : [];

  const linkedCatalogItem = watchedCatalogId
    ? CATALOG_LOOKUP.find((c) => c.id === watchedCatalogId)
    : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[520px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-[15px]">
            {item ? "Edit Stock Item" : "New Stock Item"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* ── 1. Catalog Link ──────────────────────────────────── */}
              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Catalog Link
                </legend>

                {watchedCatalogId && linkedCatalogItem ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium truncate">{linkedCatalogItem.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{linkedCatalogItem.sku}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlink}
                      className="shrink-0 flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Unlink
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11.5px] text-muted-foreground mb-1.5">
                      Link to Catalog Item <span className="text-muted-foreground/60 text-[10.5px]">(optional)</span>
                    </label>
                    <select
                      value={watchedCatalogId ?? ""}
                      onChange={(e) => handleCatalogLink(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select catalog item…</option>
                      {CATALOG_LOOKUP.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} — {c.sku}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Linking auto-fills and locks name, SKU, manufacturer, category, and cost.
                    </p>
                  </div>
                )}
              </fieldset>

              {/* ── 2. Basic Info ─────────────────────────────────────── */}
              <fieldset className="space-y-4">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Basic Info
                </legend>

                {isLinked && (
                  <div className="flex gap-2.5 rounded-md border border-blue-500/20 bg-blue-500/8 px-3 py-2.5">
                    <Info className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
                    <p className="text-[11.5px] text-muted-foreground leading-snug">
                      Fields marked with a lock are managed by the linked Catalog item. To edit them, update the item in Catalog.
                    </p>
                  </div>
                )}

                {isLinked ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11.5px] text-muted-foreground mb-1.5">
                        <LockedLabel>Name</LockedLabel>
                      </p>
                      <LockedValue>{formValues.name}</LockedValue>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11.5px] text-muted-foreground mb-1.5">
                          <LockedLabel>SKU</LockedLabel>
                        </p>
                        <LockedValue>
                          <span className="font-mono">{formValues.sku || "—"}</span>
                        </LockedValue>
                      </div>
                      <div>
                        <p className="text-[11.5px] text-muted-foreground mb-1.5">
                          <LockedLabel>Category</LockedLabel>
                        </p>
                        <LockedValue>{categoryMeta[formValues.category].label}</LockedValue>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11.5px] text-muted-foreground mb-1.5">
                        <LockedLabel>Manufacturer</LockedLabel>
                      </p>
                      <LockedValue>{formValues.manufacturerName}</LockedValue>
                    </div>

                    <div>
                      <p className="text-[11.5px] text-muted-foreground mb-1.5">
                        <LockedLabel>Description</LockedLabel>
                      </p>
                      <LockedValue>
                        {formValues.description
                          ? formValues.description
                          : <em className="text-muted-foreground/40 not-italic">No description</em>
                        }
                      </LockedValue>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11.5px]">Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Axis P3245-V Fixed Dome" className="h-8 text-[13px]" /></FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

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
                            <select {...field} className="h-8 w-full rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring">
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{categoryMeta[c].label}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="manufacturerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11.5px]">Manufacturer *</FormLabel>
                        <FormControl>
                          <Input {...field} list="mfr-suggestions" placeholder="e.g. Axis Communications" className="h-8 text-[13px]" />
                        </FormControl>
                        <datalist id="mfr-suggestions">
                          {INITIAL_MANUFACTURERS.map((m) => <option key={m.id} value={m.name} />)}
                        </datalist>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11.5px]">Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Brief item description…" className="text-[13px] resize-none" />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Location / Bin and Active toggle are always editable */}
                <FormField control={form.control} name="locationBin" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Location / Bin *</FormLabel>
                    <FormControl>
                      <Input {...field} list="bin-suggestions" placeholder="e.g. Warehouse Shelf A1" className="h-8 text-[13px]" />
                    </FormControl>
                    <datalist id="bin-suggestions">
                      {["Warehouse Shelf A1", "Warehouse Shelf A2", "Warehouse Shelf A3", "Warehouse Shelf A4", "Van 1", "Van 2", "Cage B"].map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
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

              {/* ── 3. Product Image ──────────────────────────────────── */}
              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                  Product Image
                  {isLinked && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                </legend>
                {isLinked ? (
                  <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/40 px-3 py-2.5">
                    <Camera className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <p className="text-[12px] text-muted-foreground/70">Managed by the linked Catalog item.</p>
                  </div>
                ) : (
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
                )}
              </fieldset>

              {/* ── 4. Pricing & Units ───────────────────────────────── */}
              <fieldset className="space-y-4">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Pricing & Units
                </legend>

                <div className="grid grid-cols-2 gap-3">
                  {isLinked ? (
                    <>
                      <div>
                        <p className="text-[11.5px] text-muted-foreground mb-1.5">
                          <LockedLabel>Unit Cost</LockedLabel>
                        </p>
                        <LockedValue>
                          <span className="text-muted-foreground/70 mr-0.5">$</span>
                          <span className="font-mono">{formValues.unitCost.toFixed(2)}</span>
                        </LockedValue>
                      </div>
                      <div>
                        <p className="text-[11.5px] text-muted-foreground mb-1.5">
                          <LockedLabel>Unit of Measure</LockedLabel>
                        </p>
                        <LockedValue>{formValues.unitOfMeasure}</LockedValue>
                      </div>
                    </>
                  ) : (
                    <>
                      <FormField control={form.control} name="unitCost" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11.5px]">Unit Cost *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                              <Input {...field} type="number" min="0" step="0.01" className="h-8 pl-5 text-[13px]" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="unitOfMeasure" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11.5px]">Unit of Measure *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ea" list="uom-suggestions-stock" className="h-8 text-[13px]" />
                          </FormControl>
                          <datalist id="uom-suggestions-stock">
                            {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                          </datalist>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                    </>
                  )}
                </div>
              </fieldset>

              {/* ── 5. Stock Levels ───────────────────────────────────── */}
              <fieldset className="space-y-4">
                <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Stock Levels
                </legend>

                <FormField control={form.control} name="qtyOnHand" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11.5px]">Current Qty on Hand *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" className="h-8 text-[13px] w-36" />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="minStockLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11.5px]">Low Stock Alert Below *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" className="h-8 text-[13px]" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="maxStockLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11.5px]">Overstocked Above *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" className="h-8 text-[13px]" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Stock status is calculated automatically from these values.
                </p>
              </fieldset>

              {/* ── 6. Movement Log (edit mode only) ─────────────────── */}
              {item && (
                <fieldset className="space-y-3">
                  <legend className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Movement Log
                  </legend>

                  {sortedMovements.length === 0 ? (
                    <p className="text-[11.5px] text-muted-foreground/60 italic">No movements recorded yet.</p>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50">
                      {sortedMovements.map((mov) => {
                        const meta = movementMeta[mov.type];
                        const MIcon = meta.Icon;
                        const positive = mov.qtyDelta > 0;
                        return (
                          <div key={mov.id} className="flex items-start gap-2.5 px-3.5 py-2.5 text-[12px]">
                            <div className={cn("mt-0.5 shrink-0", meta.color)}>
                              <MIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "font-mono font-semibold tabular-nums text-[12px]",
                                  positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                                )}>
                                  {positive ? `+${mov.qtyDelta}` : String(mov.qtyDelta)}
                                </span>
                                <span className="text-muted-foreground text-[11.5px]">{meta.label}</span>
                                {mov.jobReference && (
                                  <span className="text-[11px] text-blue-500 truncate max-w-[140px]">{mov.jobReference}</span>
                                )}
                              </div>
                              {mov.note && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{mov.note}</p>
                              )}
                              <p className="text-[10.5px] text-muted-foreground/70 mt-0.5 font-mono">
                                {mov.createdAt} · {mov.createdBy}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              )}
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
  mfr: StockManufacturer;
  itemCount: number;
  lowCount: number;
  outCount: number;
  onClick: () => void;
}

function ManufacturerCard({ mfr, itemCount, lowCount, outCount, onClick }: ManufacturerCardProps) {
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-0.5" />
          <div className="flex gap-1 mt-1">
            {outCount > 0 && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/15 text-red-600 dark:text-red-400">
                {outCount} out
              </span>
            )}
            {lowCount > 0 && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {lowCount} low
              </span>
            )}
          </div>
        </div>
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

// ─── ItemThumbnail ────────────────────────────────────────────────────────────

function ItemThumbnail({ item }: { item: StockItem }) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-8 w-8 rounded object-cover shrink-0"
      />
    );
  }
  const initials = item.name.slice(0, 2).toUpperCase();
  const colorCls = mfrColor(item.id);
  return (
    <div className={cn(
      "h-8 w-8 rounded flex items-center justify-center text-[9px] font-bold shrink-0 select-none",
      colorCls,
    )}>
      {initials}
    </div>
  );
}

// ─── StockItemsTable ──────────────────────────────────────────────────────────

interface StockItemsTableProps {
  items: StockItem[];
  showManufacturer: boolean;
  onEdit: (item: StockItem) => void;
  onAdjust: (itemId: string, delta: number, type: MovementType, jobRef: string, note: string) => void;
}

function StockItemsTable({ items, showManufacturer, onEdit, onAdjust }: StockItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <ImagePlus className="h-8 w-8 text-muted-foreground/25 mb-3" />
        <p className="text-[13px] font-medium">No items</p>
        <p className="mt-1 text-[12px] text-muted-foreground">No stock items match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[820px]">
          <thead className="border-b border-border bg-surface/50">
            <tr>
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2 px-3 w-10" />
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Name / SKU</th>
              {showManufacturer && (
                <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Manufacturer</th>
              )}
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Category</th>
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Location</th>
              <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Unit Cost</th>
              <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">On Hand</th>
              <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2">Min / Max</th>
              <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium py-2 pl-3">Status</th>
              <th className="py-2 pr-3 w-32" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const status = stockStatus(item);
              const sm = stockStatusMeta[status];
              return (
                <tr key={item.id} className="group border-b border-border/60 last:border-0 hover:bg-surface/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <ItemThumbnail item={item} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium leading-snug">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{item.sku || "—"}</p>
                  </td>
                  {showManufacturer && (
                    <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap text-[12px]">
                      {item.manufacturerName}
                    </td>
                  )}
                  <td className="py-2.5 pr-3">{categoryChip(item.category)}</td>
                  <td className="py-2.5 pr-3 text-[12px] text-muted-foreground whitespace-nowrap">{item.locationBin}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted-foreground">
                    {currency(item.unitCost)}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <span className={cn("font-mono font-semibold tabular-nums text-[13px]", sm.qtyCls)}>
                      {item.qtyOnHand}
                    </span>
                    <span className="text-muted-foreground text-[11px] ml-0.5">{item.unitOfMeasure}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted-foreground text-[11.5px]">
                    {item.minStockLevel} / {item.maxStockLevel}
                  </td>
                  <td className="py-2.5 pl-3">{statusChip(status)}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1 justify-end">
                      <AdjustCell item={item} onAdjust={onAdjust} />
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded border border-border bg-surface px-2 h-6 text-[11px] text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
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

// ─── StockPage ────────────────────────────────────────────────────────────────

type StatusFilterValue = "all" | StockStatus | "needs_attention";

function StockPage() {
  const { setMeta } = useMeta();

  const [manufacturers] = useState<StockManufacturer[]>(INITIAL_MANUFACTURERS);
  const [items, setItems] = useState<StockItem[]>(INITIAL_ITEMS);

  // Navigation state
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drillMfr, setDrillMfr] = useState<string | null>(null);

  // Filters
  const [gridSearch,   setGridSearch]   = useState("");
  const [listSearch,   setListSearch]   = useState("");
  const [mfrFilter,    setMfrFilter]    = useState("all");
  const [catFilter,    setCatFilter]    = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<StockItem | null>(null);

  // Alert banner
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const openNew = useCallback(() => {
    setDrawerItem(null);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    setMeta({
      title: "Stock",
      subtitle: "On-hand inventory and stock levels",
      newLabel: "New Stock Item",
      onNew: openNew,
    });
  }, [setMeta, openNew]);

  // ─── Derived stats ────────────────────────────────────────────────────────

  const alertItems = useMemo(
    () => items.filter((i) => stockStatus(i) === "out_of_stock" || stockStatus(i) === "low_stock"),
    [items],
  );
  const outCount = useMemo(() => items.filter((i) => stockStatus(i) === "out_of_stock").length, [items]);
  const lowCount = useMemo(() => items.filter((i) => stockStatus(i) === "low_stock").length, [items]);

  const mfrStats = useMemo(() => {
    const stats: Record<string, { lowCount: number; outCount: number }> = {};
    for (const item of items) {
      const s = stockStatus(item);
      if (s === "low_stock" || s === "out_of_stock") {
        if (!stats[item.manufacturerName]) stats[item.manufacturerName] = { lowCount: 0, outCount: 0 };
        if (s === "low_stock") stats[item.manufacturerName].lowCount++;
        else stats[item.manufacturerName].outCount++;
      }
    }
    return stats;
  }, [items]);

  const itemCountByMfr = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.manufacturerName] = (map[item.manufacturerName] ?? 0) + 1;
    }
    return map;
  }, [items]);

  // ─── Filtered data ────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let result = items;
    if (drillMfr) {
      const mfrName = manufacturers.find((m) => m.id === drillMfr)?.name ?? "";
      result = result.filter((i) => i.manufacturerName === mfrName);
    }
    if (view === "list" && mfrFilter !== "all") {
      const mfrName = manufacturers.find((m) => m.id === mfrFilter)?.name ?? "";
      result = result.filter((i) => i.manufacturerName === mfrName);
    }
    if (catFilter !== "all") result = result.filter((i) => i.category === catFilter);
    if (statusFilter === "needs_attention") {
      result = result.filter((i) => stockStatus(i) === "low_stock" || stockStatus(i) === "out_of_stock");
    } else if (statusFilter !== "all") {
      result = result.filter((i) => stockStatus(i) === statusFilter);
    }
    const q = listSearch.toLowerCase().trim();
    if (q) result = result.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.locationBin.toLowerCase().includes(q),
    );
    return result;
  }, [items, drillMfr, view, mfrFilter, catFilter, statusFilter, listSearch, manufacturers]);

  const filteredMfrs = useMemo(() => {
    const q = gridSearch.toLowerCase().trim();
    return manufacturers.filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [manufacturers, gridSearch]);

  const activeMfr = manufacturers.find((m) => m.id === drillMfr);

  // ─── Event handlers ───────────────────────────────────────────────────────

  function handleSave(saved: StockItem) {
    setItems((prev) =>
      prev.some((i) => i.id === saved.id)
        ? prev.map((i) => (i.id === saved.id ? saved : i))
        : [...prev, saved],
    );
    setDrawerOpen(false);
  }

  function handleAdjust(
    itemId: string,
    delta: number,
    type: MovementType,
    jobRef: string,
    note: string,
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newMovement: StockMovement = {
          id: `mov-${Date.now()}`,
          type,
          qtyDelta: delta,
          note: note.trim() || null,
          jobReference: jobRef.trim() || null,
          createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          createdBy: "Justin Shader",
        };
        return {
          ...item,
          qtyOnHand: Math.max(0, item.qtyOnHand + delta),
          movements: [newMovement, ...item.movements],
        };
      }),
    );
  }

  function clearDrill() {
    setDrillMfr(null);
    setListSearch("");
    setCatFilter("all");
    setStatusFilter("all");
  }

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[12px] focus:outline-none";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-2 border-b border-border px-4 py-2.5">

        {/* Breadcrumb */}
        {drillMfr && activeMfr && (
          <div className="flex items-center gap-1 text-[12.5px] mr-1">
            <button
              type="button"
              onClick={clearDrill}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Stock
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{activeMfr.name}</span>
            <button
              type="button"
              onClick={clearDrill}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Clear manufacturer filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-7 w-48">
          <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
          <input
            value={view === "grid" && !drillMfr ? gridSearch : listSearch}
            onChange={(e) =>
              view === "grid" && !drillMfr
                ? setGridSearch(e.target.value)
                : setListSearch(e.target.value)
            }
            placeholder={view === "grid" && !drillMfr ? "Search manufacturers…" : "Search items…"}
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        {/* List/drill filters */}
        {(view === "list" || drillMfr) && (
          <>
            {view === "list" && !drillMfr && (
              <select value={mfrFilter} onChange={(e) => setMfrFilter(e.target.value)} className={selectCls}>
                <option value="all">All Manufacturers</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as Category | "all")}
              className={selectCls}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryMeta[c].label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
              className={selectCls}
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstocked">Overstocked</option>
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
                  onClick={() => {
                    setView(v);
                    setListSearch("");
                    setCatFilter("all");
                    setStatusFilter("all");
                    setMfrFilter("all");
                  }}
                  className={cn(
                    "flex h-7 w-8 items-center justify-center transition-colors",
                    i > 0 && "border-l border-border",
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={v === "grid" ? "Grid view" : "List view"}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        )}

        {/* New Item (drill view) */}
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

      {/* ── Stock alerts banner ───────────────────────────────────── */}
      {!bannerDismissed && alertItems.length > 0 && (
        <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/8 px-4 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[12px] text-amber-700 dark:text-amber-300 flex-1">
            <span className="font-medium">{alertItems.length} items need attention</span>
            {outCount > 0 && (
              <span className="ml-1 text-red-600 dark:text-red-400">
                — {outCount} out of stock
              </span>
            )}
            {lowCount > 0 && (
              <span className="ml-1">
                {outCount > 0 ? ", " : "— "}{lowCount} low stock
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setView("list");
              setDrillMfr(null);
              setStatusFilter("needs_attention");
            }}
            className="text-[11.5px] text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:no-underline shrink-0"
          >
            View affected items
          </button>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Manufacturer grid */}
        {view === "grid" && !drillMfr && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMfrs.map((mfr) => {
              const stats = mfrStats[mfr.name] ?? { lowCount: 0, outCount: 0 };
              return (
                <ManufacturerCard
                  key={mfr.id}
                  mfr={mfr}
                  itemCount={itemCountByMfr[mfr.name] ?? 0}
                  lowCount={stats.lowCount}
                  outCount={stats.outCount}
                  onClick={() => {
                    setDrillMfr(mfr.id);
                    setListSearch("");
                    setCatFilter("all");
                    setStatusFilter("all");
                  }}
                />
              );
            })}
            {filteredMfrs.length === 0 && (
              <div className="col-span-3 flex flex-col items-center py-16 text-center">
                <p className="text-[13px] font-medium text-muted-foreground">
                  No manufacturers match "{gridSearch}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Items table — drill-in or list view */}
        {(view === "list" || drillMfr) && (
          <StockItemsTable
            items={filteredItems}
            showManufacturer={view === "list" && !drillMfr}
            onEdit={(item) => { setDrawerItem(item); setDrawerOpen(true); }}
            onAdjust={handleAdjust}
          />
        )}
      </div>

      <StockItemDrawer
        open={drawerOpen}
        item={drawerItem}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default StockPage;

/*
  SCHEMA NOTES — stock_items table
  id, tenant_id, catalog_item_id (nullable FK → catalog_items.id), name, sku, category,
  description, unit_cost, unit_of_measure, manufacturer_name,
  location_bin, qty_on_hand, min_stock_level, max_stock_level,
  image_url, is_active, created_at, updated_at

  stock_movements table
  id, tenant_id, stock_item_id (FK → stock_items.id), type (received|consumed|adjusted|returned),
  qty_delta, note, job_reference, created_by, created_at
*/

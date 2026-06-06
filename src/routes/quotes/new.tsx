import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ChevronDown, FileText, Plus, Search, Trash2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/quotes/new")({
  head: () => ({ meta: [{ title: "New Quote · Port City Sound & Security" }] }),
  component: NewQuotePage,
});

// ─── Builder types ────────────────────────────────────────────────────────────

interface BuilderSection {
  id: string;
  name: string;
  order: number;
}

interface BuilderLineItem {
  id: string;
  sectionId: string;
  type: "product" | "labor" | "custom";
  catalogItemId: string | null;
  description: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  unit: string;
  parentLineItemId: string | null;
}

interface BuilderCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  unit: string;
  hasLabor: boolean;
  laborHours: number;
  laborRate: number;
}

interface BuilderTemplate {
  id: string;
  name: string;
  sections: BuilderSection[];
}

type EditingCell = {
  id: string;
  field: "qty" | "unitCost" | "unitPrice";
  draft: string;
} | null;

// ─── Static builder data ──────────────────────────────────────────────────────

const BUILDER_CATALOG: BuilderCatalogItem[] = [
  { id: "bc-1",  sku: "CRE-MX-150",  name: "Crestron MX-150 Control Processor",    category: "Control",   unitCost: 1820,  unitPrice: 2750,  unit: "ea",  hasLabor: true,  laborHours: 2,   laborRate: 85 },
  { id: "bc-2",  sku: "QSC-CX-Q8",   name: "QSC CX-Q 8K8 Amplifier",               category: "Audio",     unitCost: 3120,  unitPrice: 4690,  unit: "ea",  hasLabor: true,  laborHours: 1.5, laborRate: 85 },
  { id: "bc-3",  sku: "SAM-IFR-110",  name: 'Samsung The Wall 110" 4K LED',          category: "Video",     unitCost: 38400, unitPrice: 56200, unit: "ea",  hasLabor: true,  laborHours: 8,   laborRate: 95 },
  { id: "bc-4",  sku: "SHU-MXA920",  name: "Shure MXA920 Ceiling Array Mic",        category: "Audio",     unitCost: 4520,  unitPrice: 6480,  unit: "ea",  hasLabor: true,  laborHours: 1.5, laborRate: 85 },
  { id: "bc-5",  sku: "EXT-DTP3-T",  name: "Extron DTP3 T 232 Twisted Pair TX",     category: "Signal",    unitCost: 980,   unitPrice: 1450,  unit: "ea",  hasLabor: false, laborHours: 0,   laborRate: 0  },
  { id: "bc-6",  sku: "BIA-NPL-60",  name: "Biamp Nexia PL-60 Conferencing DSP",    category: "DSP",       unitCost: 2240,  unitPrice: 3380,  unit: "ea",  hasLabor: true,  laborHours: 3,   laborRate: 85 },
  { id: "bc-7",  sku: "SON-ARC-G2",  name: "Sonance Architectural Series IW",       category: "Speakers",  unitCost: 380,   unitPrice: 590,   unit: "ea",  hasLabor: true,  laborHours: 0.5, laborRate: 85 },
  { id: "bc-8",  sku: "LUT-RA3-HUB", name: "Lutron RA3 Main Repeater",              category: "Lighting",  unitCost: 1180,  unitPrice: 1790,  unit: "ea",  hasLabor: true,  laborHours: 2,   laborRate: 85 },
  { id: "bc-9",  sku: "ATX-OMNI-21", name: "Atlona OmniStream 2.1 Encoder",         category: "AVoIP",     unitCost: 1640,  unitPrice: 2480,  unit: "ea",  hasLabor: false, laborHours: 0,   laborRate: 0  },
  { id: "bc-10", sku: "MID-CAB-44U", name: "Middle Atlantic 44U AV Rack",            category: "Racks",     unitCost: 1820,  unitPrice: 2690,  unit: "ea",  hasLabor: false, laborHours: 0,   laborRate: 0  },
  { id: "bc-11", sku: "POL-X70",     name: "Poly Studio X70 Video Bar",              category: "UC",        unitCost: 5980,  unitPrice: 8240,  unit: "ea",  hasLabor: true,  laborHours: 2,   laborRate: 85 },
  { id: "bc-12", sku: "CAT6-BULK",   name: "Cat6 Cable — 1000ft bulk box",           category: "Material",  unitCost: 110,   unitPrice: 220,   unit: "box", hasLabor: false, laborHours: 0,   laborRate: 0  },
  { id: "bc-13", sku: "HDMI-2-6FT",  name: "HDMI 2.1 Cable 6ft",                    category: "Material",  unitCost: 22,    unitPrice: 45,    unit: "ea",  hasLabor: false, laborHours: 0,   laborRate: 0  },
];

const BUILDER_TEMPLATES: BuilderTemplate[] = [
  {
    id: "qt-001", name: "Commercial Install",
    sections: [
      { id: "s-001-1", name: "Equipment",             order: 1 },
      { id: "s-001-2", name: "Labor",                 order: 2 },
      { id: "s-001-3", name: "Low-Voltage Materials", order: 3 },
      { id: "s-001-4", name: "Subcontractor",         order: 4 },
      { id: "s-001-5", name: "Misc",                  order: 5 },
    ],
  },
  {
    id: "qt-002", name: "Residential Install",
    sections: [
      { id: "s-002-1", name: "Equipment",          order: 1 },
      { id: "s-002-2", name: "Installation Labor", order: 2 },
      { id: "s-002-3", name: "Materials",          order: 3 },
    ],
  },
  {
    id: "qt-003", name: "Service Call",
    sections: [
      { id: "s-003-1", name: "Labor",             order: 1 },
      { id: "s-003-2", name: "Parts & Materials", order: 2 },
    ],
  },
];

// ─── Demo form data ───────────────────────────────────────────────────────────

const COMPANIES = [
  "Vertex Capital Partners",
  "Pinecrest Hospitality Group",
  "Northbeam Architects",
  "Helio Health Systems",
  "Arden & Loom Studios",
  "Halcyon Public Schools",
  "Quay Residential",
  "Cinder & Oak Hospitality",
];

const CONTACTS_BY_COMPANY: Record<string, string[]> = {
  "Vertex Capital Partners":     ["Iris Wang", "Noor Saleh"],
  "Pinecrest Hospitality Group": ["Marcus Bell"],
  "Northbeam Architects":        ["Audrey Chen", "Caleb Ortiz"],
  "Helio Health Systems":        ["Priya Anand"],
  "Arden & Loom Studios":        ["Lena Romero"],
  "Halcyon Public Schools":      ["Damon Reyes"],
  "Quay Residential":            ["Theodore Fox"],
  "Cinder & Oak Hospitality":    ["Hugo Albright"],
};

const OPPORTUNITIES = [
  "AV-241 · Boardroom AV refresh — 14F",
  "AV-238 · Lobby video wall (7×3 LED)",
  "AV-235 · Surgical center A/V overhaul",
  "AV-233 · Primary residence — full smart home",
  "AV-230 · Sound stage 3 — control room",
  "AV-229 · District-wide classroom standardization",
  "AV-226 · Penthouse cinema build",
  "AV-218 · Trading floor latency upgrade",
];

const TEAM_MEMBERS = [
  "Justin Shader",
  "Elise Morales",
  "Tyler Brant",
  "Sarah Chen",
  "Damon Reyes",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function marginColor(m: number): string {
  if (m >= 30) return "text-status-won";
  if (m >= 15) return "text-amber-500";
  return "text-status-lost";
}

// ─── CatalogSearchModal ───────────────────────────────────────────────────────

interface CatalogSearchModalProps {
  open: boolean;
  onClose: () => void;
  onAddItem: (item: BuilderCatalogItem | null) => void;
}

function CatalogSearchModal({ open, onClose, onAddItem }: CatalogSearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? BUILDER_CATALOG.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.sku.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase()),
      )
    : BUILDER_CATALOG;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-[14px] font-semibold">Add Item from Catalog</DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-8">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU, or category…"
              className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-72">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              No items match "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onAddItem(item); onClose(); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left border-b border-border/40 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium truncate">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{item.sku}</div>
                </div>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                  {item.category}
                </span>
                <span className="shrink-0 font-mono text-[12px] text-muted-foreground tabular-nums w-20 text-right">
                  {currency(item.unitCost)}
                </span>
                {item.hasLabor && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    +labor
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { onAddItem(null); onClose(); }}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom item
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-7 rounded-md border border-border bg-surface px-3 text-[12px] hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── LineItemRow ──────────────────────────────────────────────────────────────

interface LineItemRowProps {
  item: BuilderLineItem;
  indented: boolean;
  editingCell: EditingCell;
  onCellClick: (id: string, field: "qty" | "unitCost" | "unitPrice", current: number) => void;
  onCellChange: (draft: string) => void;
  onCellCommit: () => void;
  onDelete: (id: string) => void;
}

function LineItemRow({
  item, indented, editingCell, onCellClick, onCellChange, onCellCommit, onDelete,
}: LineItemRowProps) {
  const isEditing = (field: "qty" | "unitCost" | "unitPrice") =>
    editingCell?.id === item.id && editingCell.field === field;

  function cellValue(field: "qty" | "unitCost" | "unitPrice"): string {
    if (isEditing(field)) return editingCell!.draft;
    const v = item[field];
    return field === "qty" ? String(v) : currency(v);
  }

  function EditableCell({ field, className }: { field: "qty" | "unitCost" | "unitPrice"; className?: string }) {
    if (isEditing(field)) {
      return (
        <input
          autoFocus
          value={editingCell!.draft}
          onChange={(e) => onCellChange(e.target.value)}
          onBlur={onCellCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); onCellCommit(); }
            if (e.key === "Escape") onCellCommit();
          }}
          className={cn(
            "w-full rounded border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-right text-[12px] outline-none tabular-nums",
            className,
          )}
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => onCellClick(item.id, field, item[field])}
        className={cn(
          "w-full rounded px-1.5 py-0.5 text-right text-[12px] tabular-nums",
          "hover:bg-accent transition-colors cursor-text",
          indented ? "text-muted-foreground" : "text-foreground",
          className,
        )}
      >
        {cellValue(field)}
      </button>
    );
  }

  const ext = item.qty * item.unitPrice;

  return (
    <div className={cn(
      "group grid items-center border-b border-border/50 last:border-0 px-3 py-1.5",
      "grid-cols-[1fr_64px_44px_88px_88px_88px_28px]",
      indented ? "bg-surface/30 pl-8" : "hover:bg-surface/40 transition-colors",
    )}>
      <div className={cn("min-w-0 pr-2", indented && "flex items-center gap-1.5")}>
        {indented && <span className="h-px w-3 shrink-0 bg-muted-foreground/30" />}
        <span className={cn("text-[12px] truncate", indented ? "text-muted-foreground" : "font-medium")}>
          {item.description}
        </span>
        {item.type === "custom" && (
          <span className="ml-1.5 inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
            custom
          </span>
        )}
      </div>
      <EditableCell field="qty" />
      <span className={cn("text-center text-[11px]", indented ? "text-muted-foreground/60" : "text-muted-foreground")}>
        {item.unit}
      </span>
      <EditableCell field="unitCost" />
      <EditableCell field="unitPrice" />
      <span className={cn(
        "text-right font-mono text-[12px] tabular-nums font-medium px-1.5",
        indented ? "text-muted-foreground/70" : "text-foreground",
      )}>
        {currency(ext)}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove line item"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
  section: BuilderSection;
  allItems: BuilderLineItem[];
  editingCell: EditingCell;
  onCellClick: (id: string, field: "qty" | "unitCost" | "unitPrice", current: number) => void;
  onCellChange: (draft: string) => void;
  onCellCommit: () => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (sectionId: string) => void;
}

function SectionBlock({
  section, allItems, editingCell,
  onCellClick, onCellChange, onCellCommit, onDeleteItem, onAddItem,
}: SectionBlockProps) {
  const sectionItems = allItems.filter(
    (i) => i.sectionId === section.id && i.parentLineItemId === null,
  );
  const allSectionItems = allItems.filter((i) => i.sectionId === section.id);
  const subtotal = allSectionItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const rootCount = sectionItems.length;

  function childrenOf(parentId: string): BuilderLineItem[] {
    return allItems.filter((i) => i.parentLineItemId === parentId);
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-surface/60 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold">{section.name}</span>
          <span className="text-[10.5px] text-muted-foreground">
            {rootCount} {rootCount === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
            {subtotal > 0 ? currency(subtotal) : "—"}
          </span>
          <button
            type="button"
            onClick={() => onAddItem(section.id)}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2 h-6 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Item
          </button>
        </div>
      </div>

      {allSectionItems.length > 0 && (
        <div className="grid grid-cols-[1fr_64px_44px_88px_88px_88px_28px] gap-0 border-b border-border/40 bg-surface/20 px-3 py-1">
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60">Description</span>
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60 text-right">Qty</span>
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60 text-center">Unit</span>
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60 text-right">Cost</span>
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60 text-right">Price</span>
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60 text-right px-1.5">Ext.</span>
          <span />
        </div>
      )}

      {sectionItems.map((item) => (
        <div key={item.id}>
          <LineItemRow
            item={item}
            indented={false}
            editingCell={editingCell}
            onCellClick={onCellClick}
            onCellChange={onCellChange}
            onCellCommit={onCellCommit}
            onDelete={onDeleteItem}
          />
          {childrenOf(item.id).map((child) => (
            <LineItemRow
              key={child.id}
              item={child}
              indented={true}
              editingCell={editingCell}
              onCellClick={onCellClick}
              onCellChange={onCellChange}
              onCellCommit={onCellCommit}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      ))}

      {allSectionItems.length === 0 && (
        <div className="px-4 py-3 text-[11.5px] text-muted-foreground/50 italic">
          No items — click "Add Item" to populate this section
        </div>
      )}
    </div>
  );
}

// ─── NewQuotePage ─────────────────────────────────────────────────────────────

function NewQuotePage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const idCounter = useRef(0);

  // Form state
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [opportunity, setOpportunity] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [validUntil, setValidUntil] = useState(thirtyDaysOut);
  const [assignedTo, setAssignedTo] = useState("Justin Shader");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState("");

  // Builder state
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [lineItems, setLineItems] = useState<BuilderLineItem[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [modalSectionId, setModalSectionId] = useState<string | null>(null);

  useEffect(() => {
    setMeta({
      title: "New Quote",
      subtitle: "Build & price a new quote",
    });
  }, [setMeta]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    if (id) {
      const tpl = BUILDER_TEMPLATES.find((t) => t.id === id);
      if (tpl) {
        setSections(tpl.sections.map((s) => ({ ...s })));
        setLineItems([]);
      }
    } else {
      setSections([]);
      setLineItems([]);
    }
  }

  function nextId(prefix: string): string {
    idCounter.current += 1;
    return `${prefix}-new-${idCounter.current}`;
  }

  function handleAddItem(sectionId: string, catalogItem: BuilderCatalogItem | null) {
    if (catalogItem === null) {
      const newItem: BuilderLineItem = {
        id: nextId("li"),
        sectionId,
        type: "custom",
        catalogItemId: null,
        description: "Custom Item",
        qty: 1,
        unitCost: 0,
        unitPrice: 0,
        unit: "ea",
        parentLineItemId: null,
      };
      setLineItems((prev) => [...prev, newItem]);
      return;
    }

    const productId = nextId("li");
    const productItem: BuilderLineItem = {
      id: productId,
      sectionId,
      type: "product",
      catalogItemId: catalogItem.id,
      description: catalogItem.name,
      qty: 1,
      unitCost: catalogItem.unitCost,
      unitPrice: catalogItem.unitPrice,
      unit: catalogItem.unit,
      parentLineItemId: null,
    };

    const newItems: BuilderLineItem[] = [productItem];

    if (catalogItem.hasLabor && catalogItem.laborHours > 0) {
      const rate = catalogItem.laborRate > 0 ? catalogItem.laborRate : 85;
      const laborItem: BuilderLineItem = {
        id: nextId("li"),
        sectionId,
        type: "labor",
        catalogItemId: null,
        description: `Installation — ${catalogItem.name}`,
        qty: catalogItem.laborHours,
        unitCost: Math.round(rate * 0.65),
        unitPrice: rate,
        unit: "hr",
        parentLineItemId: productId,
      };
      newItems.push(laborItem);
    }

    setLineItems((prev) => [...prev, ...newItems]);
  }

  function handleCellClick(id: string, field: "qty" | "unitCost" | "unitPrice", current: number) {
    setEditingCell({ id, field, draft: String(current) });
  }

  function handleCellChange(draft: string) {
    setEditingCell((prev) => (prev ? { ...prev, draft } : null));
  }

  function handleCellCommit() {
    if (!editingCell) return;
    const { id, field, draft } = editingCell;
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      setLineItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, [field]: field === "qty" ? Math.max(0.01, parsed) : parsed }
            : item,
        ),
      );
    }
    setEditingCell(null);
  }

  function handleDeleteItem(id: string) {
    setLineItems((prev) => prev.filter((i) => i.id !== id && i.parentLineItemId !== id));
  }

  // Totals
  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const costTotal = lineItems.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const total = subtotal;
  const margin = total > 0 ? ((total - costTotal) / total) * 100 : 0;

  function handleSaveDraft() {
    // Local state only — navigate back to list after saving
    navigate({ to: "/quotes" });
  }

  const contacts = company ? (CONTACTS_BY_COMPANY[company] ?? []) : [];

  const inputCls =
    "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls =
    "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* ── Scrollable content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Back link */}
        <div>
          <Link
            to="/quotes"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quotes & Estimates
          </Link>
        </div>

        {/* Header form */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Quote Details</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            {/* Title — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Quote Title *</label>
              <input
                className={inputCls}
                placeholder="e.g. PCSS-2026-0042"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Company */}
            <div>
              <label className={labelCls}>Customer *</label>
              <select
                className={selectCls}
                value={company}
                onChange={(e) => { setCompany(e.target.value); setContact(""); }}
              >
                <option value="">Select company…</option>
                {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Contact */}
            <div>
              <label className={labelCls}>Contact</label>
              <select
                className={selectCls}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                disabled={!company}
              >
                <option value="">{company ? "Select contact…" : "Select a company first"}</option>
                {contacts.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Opportunity — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Linked Opportunity</label>
              <select
                className={selectCls}
                value={opportunity}
                onChange={(e) => setOpportunity(e.target.value)}
              >
                <option value="">Select opportunity…</option>
                {OPPORTUNITIES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Issue Date */}
            <div>
              <label className={labelCls}>Issue Date *</label>
              <input
                type="date"
                className={inputCls}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className={labelCls}>Valid Until *</label>
              <input
                type="date"
                className={inputCls}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className={labelCls}>Assigned To</label>
              <select
                className={selectCls}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Template */}
            <div>
              <label className={labelCls}>Template *</label>
              <div className="relative">
                <select
                  className={cn(selectCls, "pr-8 appearance-none")}
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <option value="">Select a template…</option>
                  {BUILDER_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Notes — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Add notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Builder section */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Line Items</p>

          {sections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 px-5 py-8 flex flex-col items-center gap-2 text-center">
              <FileText className="h-6 w-6 text-muted-foreground/25" />
              <p className="text-[12.5px] text-muted-foreground">
                Select a quote template above to begin adding items
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...sections].sort((a, b) => a.order - b.order).map((section) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  allItems={lineItems}
                  editingCell={editingCell}
                  onCellClick={handleCellClick}
                  onCellChange={handleCellChange}
                  onCellCommit={handleCellCommit}
                  onDeleteItem={handleDeleteItem}
                  onAddItem={(sid) => setModalSectionId(sid)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding so content clears the sticky footer */}
        <div className="h-2" />
      </div>

      {/* ── Sticky footer ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-5 py-3 flex items-center gap-5">
        {/* Totals summary */}
        <div className="flex items-center gap-5 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono font-semibold tabular-nums">{currency(subtotal)}</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-semibold tabular-nums">{currency(total)}</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Margin</span>
            <span className={cn("font-mono font-semibold tabular-nums", marginColor(margin))}>
              {margin.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <button
          type="button"
          onClick={() => navigate({ to: "/quotes" })}
          className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Save as Draft
        </button>
      </div>

      {/* Catalog modal */}
      <CatalogSearchModal
        open={modalSectionId !== null}
        onClose={() => setModalSectionId(null)}
        onAddItem={(item) => {
          if (modalSectionId) handleAddItem(modalSectionId, item);
        }}
      />
    </div>
  );
}

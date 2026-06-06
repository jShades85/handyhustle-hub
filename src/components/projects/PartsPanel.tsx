import { useCallback, useRef, useState } from "react";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Check, Plus, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PartSource = "stock" | "special-order";
type PartStatus = "needed" | "ordered" | "received" | "installed";
type EditableCol = "name" | "phase" | "qty" | "unitCost" | "source" | "status" | "notes";

interface Part {
  id: string;
  name: string;
  phase: string;
  qty: number;
  unitCost: number;
  source: PartSource;
  status: PartStatus;
  notes: string;
}

interface EditingCell {
  rowId: string;
  col: EditableCol;
  value: string;
}

interface DraftPart {
  name: string;
  phase: string;
  qty: string;
  unitCost: string;
  source: PartSource;
  status: PartStatus;
  notes: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PartsPanelProps {
  projectId: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const sourceMeta: Record<PartSource, { label: string; cls: string }> = {
  "stock":         { label: "Stock",         cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "special-order": { label: "Special Order", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

const statusMeta: Record<PartStatus, { label: string; cls: string }> = {
  "needed":    { label: "Needed",    cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
  "ordered":   { label: "Ordered",   cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "received":  { label: "Received",  cls: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  "installed": { label: "Installed", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
};

const SOURCE_OPTIONS: PartSource[]  = ["stock", "special-order"];
const STATUS_OPTIONS: PartStatus[]  = ["needed", "ordered", "received", "installed"];

const DEFAULT_DRAFT: DraftPart = {
  name: "", phase: "", qty: "1", unitCost: "0",
  source: "stock", status: "needed", notes: "",
};

// ─── Seed data ────────────────────────────────────────────────────────────────

function getInitialParts(projectId: string): Part[] {
  switch (projectId) {
    case "pr1":
      return [
        { id: "pp1-1", name: "Crestron MX-150 Control Processor", phase: "Procurement", qty: 1,  unitCost: 1820,  source: "stock",         status: "received",  notes: "" },
        { id: "pp1-2", name: "Poly Studio X70 Video Bar",          phase: "Procurement", qty: 2,  unitCost: 5980,  source: "special-order", status: "received",  notes: "" },
        { id: "pp1-3", name: "Samsung The Wall 110\" 4K LED",      phase: "Install",     qty: 1,  unitCost: 38400, source: "special-order", status: "ordered",   notes: "Lead time 3 wks" },
        { id: "pp1-4", name: "Shure MXA920 Ceiling Array Mic",     phase: "Install",     qty: 2,  unitCost: 4520,  source: "stock",         status: "received",  notes: "" },
        { id: "pp1-5", name: "QSC CX-Q 8K8 Amplifier",            phase: "Commission",  qty: 2,  unitCost: 3120,  source: "stock",         status: "needed",    notes: "" },
        { id: "pp1-6", name: "Biamp Nexia PL-60 DSP",             phase: "Commission",  qty: 1,  unitCost: 2240,  source: "special-order", status: "ordered",   notes: "Ordered Jun 1" },
      ];
    case "pr2":
      return [
        { id: "pp2-1", name: "Poly Studio X70 Video Bar",          phase: "Procurement", qty: 8,  unitCost: 5980,  source: "special-order", status: "ordered",   notes: "PO submitted May 10" },
        { id: "pp2-2", name: "Middle Atlantic 44U AV Rack",        phase: "Install",     qty: 2,  unitCost: 1820,  source: "stock",         status: "needed",    notes: "" },
        { id: "pp2-3", name: "Crestron MX-150 Control Processor",  phase: "Install",     qty: 1,  unitCost: 1820,  source: "stock",         status: "needed",    notes: "" },
        { id: "pp2-4", name: "AV Cart Enclosure",                  phase: "Install",     qty: 8,  unitCost: 550,   source: "special-order", status: "needed",    notes: "" },
        { id: "pp2-5", name: "48-Port Managed Network Switch",     phase: "Install",     qty: 2,  unitCost: 1800,  source: "special-order", status: "needed",    notes: "" },
        { id: "pp2-6", name: "Labor — AV Tech (per hour)",         phase: "Commission",  qty: 80, unitCost: 65,    source: "stock",         status: "needed",    notes: "" },
      ];
    case "pr3":
      return [
        { id: "pp3-1", name: "Lutron RA3 Main Repeater",           phase: "Design",      qty: 2,  unitCost: 1180,  source: "special-order", status: "installed", notes: "" },
        { id: "pp3-2", name: "Sonance Architectural Series IW",    phase: "Install",     qty: 12, unitCost: 380,   source: "stock",         status: "installed", notes: "" },
        { id: "pp3-3", name: "Atlona OmniStream 2.1 Encoder",      phase: "Install",     qty: 4,  unitCost: 1640,  source: "stock",         status: "installed", notes: "" },
        { id: "pp3-4", name: "Crestron MX-150 Control Processor",  phase: "Commission",  qty: 1,  unitCost: 1820,  source: "stock",         status: "installed", notes: "" },
        { id: "pp3-5", name: "Biamp Nexia PL-60 DSP",             phase: "Commission",  qty: 1,  unitCost: 2240,  source: "special-order", status: "installed", notes: "" },
        { id: "pp3-6", name: "Outdoor Burial Speaker Cable (ft)",  phase: "Install",     qty: 500, unitCost: 1.20, source: "stock",         status: "installed", notes: "Custom Belden" },
      ];
    default:
      return [];
  }
}

function getPhaseNames(projectId: string): string[] {
  switch (projectId) {
    case "pr3":
      return ["Design", "Install", "Commission", "Closeout"];
    case "pr1":
    case "pr2":
    case "pr5":
    case "pr6":
    default:
      return ["Design", "Procurement", "Install", "Commission", "Closeout"];
  }
}

// ─── Small badge renders ──────────────────────────────────────────────────────

function SourceBadge({ source }: { source: PartSource }) {
  const { label, cls } = sourceMeta[source];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: PartStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const inputCls = "w-full bg-transparent text-[12px] outline-none border-b border-primary/60 focus:border-primary py-px";
const cellClickCls = "cursor-text select-none";

// ─── Main component ───────────────────────────────────────────────────────────

export function PartsPanel({ projectId }: PartsPanelProps) {
  const [parts, setParts] = useState<Part[]>(() => getInitialParts(projectId));
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [addingPart, setAddingPart] = useState(false);
  const [draft, setDraft] = useState<DraftPart>({ ...DEFAULT_DRAFT });

  const counterRef = useRef(8000);
  const nextId = useCallback(() => `pp-gen-${counterRef.current++}`, []);

  const phaseNames = getPhaseNames(projectId);

  // ── Editing helpers ────────────────────────────────────────────────────────

  const startEdit = useCallback((rowId: string, col: EditableCol, value: string) => {
    setEditingCell({ rowId, col, value });
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowId, col, value } = editingCell;
    setParts((prev) =>
      prev.map((p): Part => {
        if (p.id !== rowId) return p;
        switch (col) {
          case "name":      return { ...p, name: value.trim() || p.name };
          case "phase":     return { ...p, phase: value };
          case "qty":       return { ...p, qty: Math.max(1, parseInt(value, 10) || 1) };
          case "unitCost":  return { ...p, unitCost: Math.max(0, parseFloat(value) || 0) };
          case "source":    return { ...p, source: value as PartSource };
          case "status":    return { ...p, status: value as PartStatus };
          case "notes":     return { ...p, notes: value };
        }
      }),
    );
    setEditingCell(null);
  }, [editingCell]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  // For select cells: change + immediate commit in one step
  const commitSelectEdit = useCallback(
    (rowId: string, col: EditableCol, value: string) => {
      setParts((prev) =>
        prev.map((p): Part => {
          if (p.id !== rowId) return p;
          if (col === "source")  return { ...p, source: value as PartSource };
          if (col === "status")  return { ...p, status: value as PartStatus };
          if (col === "phase")   return { ...p, phase: value };
          return p;
        }),
      );
      setEditingCell(null);
    },
    [],
  );

  // ── Add part helpers ───────────────────────────────────────────────────────

  const openAddRow = useCallback(() => {
    setDraft({ ...DEFAULT_DRAFT, phase: phaseNames[0] ?? "" });
    setAddingPart(true);
    setEditingCell(null);
  }, [phaseNames]);

  const commitAdd = useCallback(() => {
    const name = draft.name.trim();
    if (!name) return;
    const newPart: Part = {
      id: nextId(),
      name,
      phase: draft.phase || (phaseNames[0] ?? ""),
      qty: Math.max(1, parseInt(draft.qty, 10) || 1),
      unitCost: Math.max(0, parseFloat(draft.unitCost) || 0),
      source: draft.source,
      status: draft.status,
      notes: draft.notes,
    };
    setParts((prev) => [...prev, newPart]);
    setDraft({ ...DEFAULT_DRAFT, phase: phaseNames[0] ?? "" });
    setAddingPart(false);
  }, [draft, nextId, phaseNames]);

  const cancelAdd = useCallback(() => {
    setAddingPart(false);
    setDraft({ ...DEFAULT_DRAFT, phase: phaseNames[0] ?? "" });
  }, [phaseNames]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalCost = parts.reduce((s, p) => s + p.qty * p.unitCost, 0);
  const statusCounts = STATUS_OPTIONS.map((s) => ({
    status: s,
    count: parts.filter((p) => p.status === s).length,
  })).filter((x) => x.count > 0);

  // ── Shared input classes ───────────────────────────────────────────────────

  const selectCls = "bg-transparent text-[11.5px] outline-none cursor-pointer border border-border/60 rounded px-1.5 py-0.5 hover:border-primary/50 focus:border-primary transition-colors";
  const draftInputCls = "h-7 w-full rounded border border-border bg-surface px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-border px-5 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Parts Cost</span>
          <span className="text-[15px] font-semibold tabular-nums">{currency(totalCost)}</span>
        </div>
        {statusCounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {statusCounts.map(({ status, count }) => (
              <span key={status} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", statusMeta[status].cls)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {count} {statusMeta[status].label}
              </span>
            ))}
          </div>
        )}
        {parts.length === 0 && (
          <span className="text-[12px] text-muted-foreground">No parts yet.</span>
        )}
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <table className="w-full text-[12px]">
            <thead className="bg-surface/50 border-b border-border">
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium w-[220px]">Item Name</th>
                <th className="py-2 px-3 text-left font-medium w-[120px]">Phase</th>
                <th className="py-2 px-3 text-right font-medium w-[58px]">Qty</th>
                <th className="py-2 px-3 text-right font-medium w-[90px]">Unit Cost</th>
                <th className="py-2 px-3 text-right font-medium w-[90px]">Total</th>
                <th className="py-2 px-3 text-left font-medium w-[116px]">Source</th>
                <th className="py-2 px-3 text-left font-medium w-[116px]">Status</th>
                <th className="py-2 px-3 text-left font-medium">Notes</th>
              </tr>
            </thead>

            <tbody>
              {parts.map((part) => {
                const isEditingName      = editingCell?.rowId === part.id && editingCell.col === "name";
                const isEditingPhase     = editingCell?.rowId === part.id && editingCell.col === "phase";
                const isEditingQty       = editingCell?.rowId === part.id && editingCell.col === "qty";
                const isEditingUnitCost  = editingCell?.rowId === part.id && editingCell.col === "unitCost";
                const isEditingSource    = editingCell?.rowId === part.id && editingCell.col === "source";
                const isEditingStatus    = editingCell?.rowId === part.id && editingCell.col === "status";
                const isEditingNotes     = editingCell?.rowId === part.id && editingCell.col === "notes";
                const lineTotal = part.qty * part.unitCost;

                return (
                  <tr
                    key={part.id}
                    className="border-b border-border/50 hover:bg-accent/20 transition-colors group"
                  >
                    {/* Item Name */}
                    <td className="py-2 px-4">
                      {isEditingName ? (
                        <input
                          autoFocus
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                          className={cn(inputCls, "min-w-[160px]")}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "name", part.name)}
                          className={cn(cellClickCls, "block font-medium leading-snug")}
                          title="Click to edit"
                        >
                          {part.name}
                        </span>
                      )}
                    </td>

                    {/* Phase */}
                    <td className="py-2 px-3">
                      {isEditingPhase ? (
                        <select
                          autoFocus
                          value={editingCell.value}
                          onChange={(e) => commitSelectEdit(part.id, "phase", e.target.value)}
                          onBlur={cancelEdit}
                          className={selectCls}
                        >
                          <option value="">— None —</option>
                          {phaseNames.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "phase", part.phase)}
                          className={cn(cellClickCls, "text-muted-foreground")}
                        >
                          {part.phase || <span className="opacity-40">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-3 text-right">
                      {isEditingQty ? (
                        <input
                          autoFocus
                          type="number"
                          min={1}
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                          className={cn(inputCls, "text-right [appearance:textfield] w-14")}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "qty", String(part.qty))}
                          className={cn(cellClickCls, "tabular-nums")}
                        >
                          {part.qty}
                        </span>
                      )}
                    </td>

                    {/* Unit Cost */}
                    <td className="py-2 px-3 text-right">
                      {isEditingUnitCost ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          step={0.01}
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                          className={cn(inputCls, "text-right [appearance:textfield] w-20")}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "unitCost", String(part.unitCost))}
                          className={cn(cellClickCls, "tabular-nums font-mono text-muted-foreground")}
                        >
                          {currency(part.unitCost)}
                        </span>
                      )}
                    </td>

                    {/* Total Cost (read-only) */}
                    <td className="py-2 px-3 text-right">
                      <span className="tabular-nums font-mono text-muted-foreground">
                        {currency(lineTotal)}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="py-2 px-3">
                      {isEditingSource ? (
                        <select
                          autoFocus
                          value={editingCell.value}
                          onChange={(e) => commitSelectEdit(part.id, "source", e.target.value)}
                          onBlur={cancelEdit}
                          className={selectCls}
                        >
                          {SOURCE_OPTIONS.map((s) => (
                            <option key={s} value={s}>{sourceMeta[s].label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "source", part.source)}
                          className="cursor-pointer"
                        >
                          <SourceBadge source={part.source} />
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3">
                      {isEditingStatus ? (
                        <select
                          autoFocus
                          value={editingCell.value}
                          onChange={(e) => commitSelectEdit(part.id, "status", e.target.value)}
                          onBlur={cancelEdit}
                          className={selectCls}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{statusMeta[s].label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "status", part.status)}
                          className="cursor-pointer"
                        >
                          <StatusBadge status={part.status} />
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-2 px-3">
                      {isEditingNotes ? (
                        <input
                          autoFocus
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                          className={cn(inputCls, "min-w-[120px]")}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(part.id, "notes", part.notes)}
                          className={cn(cellClickCls, "text-muted-foreground")}
                        >
                          {part.notes || <span className="opacity-0 group-hover:opacity-30 transition-opacity">Add note…</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* ── Add Part inline row ────────────────────────────────────── */}
              {addingPart && (
                <tr className="border-b border-border/50 bg-surface/30">
                  <td className="py-2 px-4">
                    <input
                      autoFocus
                      placeholder="Item name…"
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") cancelAdd(); }}
                      className={draftInputCls}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={draft.phase}
                      onChange={(e) => setDraft((d) => ({ ...d, phase: e.target.value }))}
                      className="h-7 w-full rounded border border-border bg-surface px-1.5 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">— None —</option>
                      {phaseNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={1}
                      value={draft.qty}
                      onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") cancelAdd(); }}
                      className={cn(draftInputCls, "text-right [appearance:textfield]")}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={draft.unitCost}
                      onChange={(e) => setDraft((d) => ({ ...d, unitCost: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") cancelAdd(); }}
                      className={cn(draftInputCls, "text-right [appearance:textfield]")}
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="tabular-nums font-mono text-muted-foreground/60 text-[11.5px]">
                      {currency((parseInt(draft.qty, 10) || 1) * (parseFloat(draft.unitCost) || 0))}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={draft.source}
                      onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value as PartSource }))}
                      className="h-7 w-full rounded border border-border bg-surface px-1.5 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{sourceMeta[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={draft.status}
                      onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as PartStatus }))}
                      className="h-7 w-full rounded border border-border bg-surface px-1.5 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{statusMeta[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        placeholder="Notes…"
                        value={draft.notes}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") cancelAdd(); }}
                        className={cn(draftInputCls, "min-w-[80px]")}
                      />
                      <button
                        type="button"
                        onClick={commitAdd}
                        disabled={!draft.name.trim()}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
                        aria-label="Add part"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelAdd}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {parts.length === 0 && !addingPart && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[12.5px] text-muted-foreground">
                    No parts added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Part button */}
      {!addingPart && (
        <div className="border-t border-border/60 px-4 py-2">
          <button
            type="button"
            onClick={openAddRow}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Part
          </button>
        </div>
      )}
    </div>
  );
}

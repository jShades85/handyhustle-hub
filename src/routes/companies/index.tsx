import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { ownerNames } from "@/lib/demo-data";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Building2, Eye, LayoutGrid, List, MapPin, Pencil,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COMPANIES, type CompanyIndustry, type CompanyStage, type CompanyRecord } from "@/data/companies";

export const Route = createFileRoute("/companies/")({
  head: () => ({ meta: [{ title: "Companies · Port City Sound & Security" }] }),
  component: CompaniesPage,
});

// ─── Config ──────────────────────────────────────────────────────────────────

const stageMeta: Record<CompanyStage, { label: string; cls: string }> = {
  active:   { label: "Active",   cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  prospect: { label: "Prospect", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  inactive: { label: "Inactive", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const industryOptions: CompanyIndustry[] = [
  "AV & Technology", "Healthcare", "Hospitality", "Education",
  "Real Estate", "Government", "Manufacturing", "Other",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.replace(/&/g, "").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: CompanyStage }) {
  const { label, cls } = stageMeta[stage];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function CompaniesPage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<CompanyIndustry | "all">("all");
  const [stageFilter, setStageFilter] = useState<CompanyStage | "all">("all");
  const [view, setView] = useState<"cards" | "list">("cards");

  useEffect(() => {
    setMeta({
      title: "Companies",
      subtitle: `${COMPANIES.length} companies`,
      onNew: () => setNewOpen(true),
      newLabel: "+ New Company",
    });
  }, [setMeta]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return COMPANIES.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.city.toLowerCase().includes(q)) return false;
      if (industryFilter !== "all" && c.industry !== industryFilter) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      return true;
    });
  }, [search, industryFilter, stageFilter]);

  const openDetail = useCallback(
    (c: CompanyRecord) => navigate({ to: "/companies/$companyId", params: { companyId: c.id } }),
    [navigate],
  );

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies…"
          className="h-7 min-w-[180px] flex-1 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value as CompanyIndustry | "all")} className={selectCls}>
          <option value="all">All Industries</option>
          {industryOptions.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as CompanyStage | "all")} className={selectCls}>
          <option value="all">All Stages</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-[11px] text-muted-foreground font-mono">
          {filtered.length} of {COMPANIES.length}
        </span>
        {/* View toggle */}
        <div className="ml-auto flex items-center rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={cn(
              "flex h-7 w-7 items-center justify-center transition-colors",
              view === "cards" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
            aria-label="Card view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex h-7 w-7 items-center justify-center border-l border-border transition-colors",
              view === "list" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card view */}
      {view === "cards" && (
        <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => openDetail(c)}
              className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  initials={getInitials(c.name)}
                  className="!h-9 !w-9 !text-[13px] !rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate leading-snug">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.industry}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{c.city}, {c.state}</span>
                </div>
                <StageBadge stage={c.stage} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Pipeline</div>
                  <div className="text-[12.5px] font-semibold tabular-nums">
                    {c.openPipeline > 0 ? currency(c.openPipeline) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Contacts</div>
                  <div className="text-[12.5px] font-semibold">{c.contactsCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Projects</div>
                  <div className="text-[12.5px] font-semibold">{c.activeProjects}</div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-[12.5px] text-muted-foreground">
              No companies match the current filters.
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="p-4 overflow-x-auto">
          <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[800px]">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface/50">
                <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3 text-left font-medium">Company</th>
                  <th className="py-2 px-3 text-left font-medium">Location</th>
                  <th className="py-2 px-3 text-left font-medium">Stage</th>
                  <th className="py-2 px-3 text-left font-medium">Pipeline</th>
                  <th className="py-2 px-3 text-left font-medium">Contacts</th>
                  <th className="py-2 px-3 text-left font-medium">Projects</th>
                  <th className="py-2 px-3 pr-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="row-hover border-b border-border/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={getInitials(c.name)} className="!h-7 !w-7 !text-[10px] !rounded-md shrink-0" />
                        <div>
                          <div className="font-semibold leading-snug">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {c.city}, {c.state}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <StageBadge stage={c.stage} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-muted-foreground">
                      {c.openPipeline > 0 ? currency(c.openPipeline) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.contactsCount}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.activeProjects}</td>
                    <td className="py-2.5 px-3 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetail(c); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="Edit company"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetail(c); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="View company"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted-foreground">
                      No companies match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New company modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewCompanyModal onClose={() => setNewOpen(false)} />
      </Dialog>
    </div>
  );
}

// ─── New Company Modal ────────────────────────────────────────────────────────

function NewCompanyModal({ onClose }: { onClose: () => void }) {
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls = "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  const [sameAddress, setSameAddress] = useState(false);

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Company</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Company Name</label>
          <input className={inputCls} placeholder="e.g. Acme Corp" />
        </div>
        <div>
          <label className={labelCls}>Industry</label>
          <select className={selectCls}>
            {industryOptions.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Stage</label>
          <select className={selectCls}>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} placeholder="contact@company.com" type="email" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Website</label>
          <input className={inputCls} placeholder="company.com" type="url" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Billing Address</label>
          <input className={inputCls} placeholder="Street, City, State ZIP" />
        </div>
        <div className="col-span-2">
          <label className={cn(labelCls, "flex items-center justify-between")}>
            <span>Service Address</span>
            <label className="flex items-center gap-1.5 text-[11px] normal-case tracking-normal text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={sameAddress}
                onChange={(e) => setSameAddress(e.target.checked)}
                className="h-3 w-3 rounded"
              />
              Same as billing address
            </label>
          </label>
          {!sameAddress && (
            <input className={inputCls} placeholder="Street, City, State ZIP" />
          )}
          {sameAddress && (
            <div className="h-8 rounded-md border border-border bg-muted/30 px-2.5 flex items-center text-[12px] text-muted-foreground">
              Same as billing address
            </div>
          )}
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Assign To</label>
          <select className={selectCls}>
            {Object.entries(ownerNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            rows={3}
            placeholder="Add any notes…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Add Company
        </button>
      </div>
    </DialogContent>
  );
}

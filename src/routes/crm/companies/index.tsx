import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import { Eye, LayoutGrid, List, MapPin } from "lucide-react";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { FormSelect } from "@/components/ui/form-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/crm/companies/")({
  head: () => ({ meta: [{ title: "Companies · BearingPro" }] }),
  component: CompaniesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type CompanyStage = "active" | "prospect" | "inactive";

interface DbCompany {
  id: string;
  name: string;
  industry: string | null;
  stage: CompanyStage;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  billing_address: string | null;
  service_address: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const stageMeta: Record<CompanyStage, { label: string; cls: string }> = {
  active:   { label: "Active",   cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  prospect: { label: "Prospect", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  inactive: { label: "Inactive", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const industryOptions = [
  "AV & Technology", "Healthcare", "Hospitality", "Education",
  "Real Estate", "Government", "Manufacturing", "Other",
];

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchCompanies(): Promise<DbCompany[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as DbCompany[];
}

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
  const [industryFilter, setIndustryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"cards" | "list">("cards");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  useEffect(() => {
    setMeta({
      title: "Companies",
      subtitle: `${companies.length} companies`,
      onNew: () => setNewOpen(true),
      newLabel: "New Company",
    });
  }, [setMeta, companies.length]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return companies.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.city?.toLowerCase().includes(q))) return false;
      if (industryFilter !== "all" && c.industry !== industryFilter) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      return true;
    });
  }, [companies, search, industryFilter, stageFilter]);

  const openDetail = useCallback(
    (c: DbCompany) => navigate({ to: "/crm/companies/$companyId", params: { companyId: c.id } }),
    [navigate],
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-[12.5px] text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies…" />
        <FilterSelect value={industryFilter} onChange={setIndustryFilter}>
          <option value="all">All Industries</option>
          {industryOptions.map((i) => <option key={i} value={i}>{i}</option>)}
        </FilterSelect>
        <FilterSelect value={stageFilter} onChange={setStageFilter}>
          <option value="all">All Stages</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
        <span className="text-[11px] text-muted-foreground font-mono">
          {filtered.length} of {companies.length}
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
      </FilterBar>

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
                  <div className="text-[11px] text-muted-foreground">{c.industry ?? "—"}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {(c.city || c.state) ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{[c.city, c.state].filter(Boolean).join(", ")}</span>
                  </div>
                ) : <span />}
                <StageBadge stage={c.stage} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-[12.5px] text-muted-foreground">
              {companies.length === 0
                ? "No companies yet. Add your first one."
                : "No companies match the current filters."}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="p-4 overflow-x-auto">
          <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[600px]">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface/50">
                <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3 text-left font-medium">Company</th>
                  <th className="py-2 px-3 text-left font-medium">Location</th>
                  <th className="py-2 px-3 text-left font-medium">Stage</th>
                  <th className="py-2 px-3 text-left font-medium">Phone</th>
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
                          <div className="text-[11px] text-muted-foreground">{c.industry ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-[12px]">
                      {(c.city || c.state) ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[c.city, c.state].filter(Boolean).join(", ")}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <StageBadge stage={c.stage} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-muted-foreground">
                      {c.phone ?? "—"}
                    </td>
                    <td className="py-2.5 px-3 pr-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(c); }}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-auto"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[12.5px] text-muted-foreground">
                      {companies.length === 0 ? "No companies yet." : "No companies match the current filters."}
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

const initialForm = {
  name: "", industry: industryOptions[0], stage: "prospect" as CompanyStage,
  phone: "", email: "", website: "", city: "", state: "",
  billing_address: "", service_address: "", notes: "",
};

function NewCompanyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  const [form, setForm] = useState(initialForm);
  const [sameAddress, setSameAddress] = useState(false);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const tenant = qc.getQueryData<{ id: string }>(["tenant"]);
      const { error } = await supabase.from("companies").insert({
        tenant_id: tenant!.id,
        name: form.name.trim(),
        industry: form.industry || null,
        stage: form.stage,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        billing_address: form.billing_address.trim() || null,
        service_address: sameAddress
          ? form.billing_address.trim() || null
          : form.service_address.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      onClose();
    },
  });

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Company</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Company Name <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. Acme Corp" />
        </div>
        <div>
          <label className={labelCls}>Industry</label>
          <FormSelect value={form.industry} onChange={set("industry")}>
            {industryOptions.map((i) => <option key={i} value={i}>{i}</option>)}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Stage</label>
          <FormSelect value={form.stage} onChange={set("stage")}>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={form.email} onChange={set("email")} placeholder="contact@company.com" type="email" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Website</label>
          <input className={inputCls} value={form.website} onChange={set("website")} placeholder="company.com" />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={form.city} onChange={set("city")} placeholder="City" />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input className={inputCls} value={form.state} onChange={set("state")} placeholder="State" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Billing Address</label>
          <input className={inputCls} value={form.billing_address} onChange={set("billing_address")} placeholder="Street, City, State ZIP" />
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
          {!sameAddress ? (
            <input className={inputCls} value={form.service_address} onChange={set("service_address")} placeholder="Street, City, State ZIP" />
          ) : (
            <div className="h-8 rounded-md border border-border bg-muted/30 px-2.5 flex items-center text-[12px] text-muted-foreground">
              Same as billing address
            </div>
          )}
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={set("notes")}
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
          onClick={() => mutate()}
          disabled={!form.name.trim() || isPending}
          className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add Company"}
        </button>
      </div>
    </DialogContent>
  );
}

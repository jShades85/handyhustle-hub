import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import {
  Building2, Eye, Home, Mail, MapPin, Pencil, Phone,
} from "lucide-react";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/ui/drawer-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { FormSelect } from "@/components/ui/form-select";

export const Route = createFileRoute("/crm/contacts")({
  head: () => ({ meta: [{ title: "Contacts · BearingPro" }] }),
  validateSearch: (search: Record<string, unknown>): { contact?: string } => ({
    contact: typeof search.contact === "string" ? search.contact : undefined,
  }),
  component: ContactsPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type CustomerType   = "commercial" | "residential";
type ContactType    = "Decision Maker" | "Billing Contact" | "Site Contact" | "Influencer";
type LifecycleStage = "Lead" | "Customer" | "Inactive";
type ContactSource  = "Phone" | "Web Form" | "Referral" | "Email" | "Walk-in";

interface DbContact {
  id: string;
  company_id: string | null;
  full_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_type: ContactType | null;
  source: ContactSource | null;
  assigned_to: string | null;
  stage: LifecycleStage;
  customer_type: CustomerType;
  tags: string[];
  notes: string | null;
  created_at: string;
  company: { id: string; name: string } | null;
  assignee: { id: string; full_name: string | null } | null;
}

interface TeamMember { id: string; full_name: string | null }
interface CompanyOption { id: string; name: string }

// ─── Config ──────────────────────────────────────────────────────────────────

const typeMeta: Record<ContactType, string> = {
  "Decision Maker": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "Billing Contact": "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "Site Contact":    "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  "Influencer":      "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

const stageMeta: Record<LifecycleStage, { label: string; cls: string }> = {
  Lead:     { label: "Lead",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  Customer: { label: "Customer", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  Inactive: { label: "Inactive", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const typeOptions: ContactType[]    = ["Decision Maker", "Billing Contact", "Site Contact", "Influencer"];
const sourceOptions: ContactSource[] = ["Phone", "Web Form", "Referral", "Email", "Walk-in"];

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchContacts(): Promise<DbContact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(id, name), assignee:user_profiles!assigned_to(id, full_name)")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as DbContact[];
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

async function fetchCompanyOptions(): Promise<CompanyOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ContactType }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", typeMeta[type])}>
      {type}
    </span>
  );
}

function StageBadge({ stage }: { stage: LifecycleStage }) {
  const { label, cls } = stageMeta[stage];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ContactsPage() {
  const { setMeta } = useMeta();
  const { can } = usePermissions();
  const canWrite = can("crm", "write");
  const [selected, setSelected] = useState<DbContact | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-slim"],
    queryFn: fetchTeamMembers,
  });

  useEffect(() => {
    setMeta({
      title: "Contacts",
      subtitle: `${contacts.length} contacts`,
      onNew: () => setNewOpen(true),
      newLabel: "New Contact",
    });
  }, [setMeta, contacts.length]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contacts.filter((c) => {
      if (q && !c.full_name.toLowerCase().includes(q)
        && !(c.company?.name.toLowerCase().includes(q))
        && !(c.email?.toLowerCase().includes(q))) return false;
      if (typeFilter !== "all" && c.contact_type !== typeFilter) return false;
      if (customerTypeFilter !== "all" && c.customer_type !== customerTypeFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (assignedFilter !== "all" && c.assigned_to !== assignedFilter) return false;
      return true;
    });
  }, [contacts, search, typeFilter, customerTypeFilter, sourceFilter, assignedFilter]);

  const openDrawer = useCallback((c: DbContact, mode: "view" | "edit" = "view") => {
    setSelected(c);
    setDrawerMode(mode);
  }, []);

  // Deep-link: ?contact=<id> (e.g. from the command palette) opens that contact's
  // drawer, then strips the param. Stripping (not a one-shot ref) is what prevents
  // re-opening, so it works even when you're already on the contacts page.
  const navigate = useNavigate();
  const { contact: contactParam } = Route.useSearch();
  useEffect(() => {
    if (!contactParam || contacts.length === 0) return;
    const found = contacts.find((c) => c.id === contactParam);
    if (found) {
      openDrawer(found, "view");
      navigate({ to: "/crm/contacts", replace: true });
    }
  }, [contactParam, contacts, navigate, openDrawer]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search contacts…" />
        <FilterSelect value={customerTypeFilter} onChange={setCustomerTypeFilter}>
          <option value="all">All Customers</option>
          <option value="commercial">Commercial</option>
          <option value="residential">Residential</option>
        </FilterSelect>
        <FilterSelect value={typeFilter} onChange={setTypeFilter}>
          <option value="all">All Types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </FilterSelect>
        <FilterSelect value={sourceFilter} onChange={setSourceFilter}>
          <option value="all">All Sources</option>
          {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect value={assignedFilter} onChange={setAssignedFilter}>
          <option value="all">All Assigned</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? "—"}</option>
          ))}
        </FilterSelect>
        <span className="text-xs text-muted-foreground font-mono">
          {filtered.length} of {contacts.length}
        </span>
      </FilterBar>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[900px]">
          <table className="w-full text-sm">
            <thead className="bg-surface/50">
              <tr className="border-b border-border text-2xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-left font-medium">Company</th>
                <th className="py-2 px-3 text-left font-medium">Phone</th>
                <th className="py-2 px-3 text-left font-medium">Email</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-left font-medium">Assigned</th>
                <th className="py-2 px-3 text-left font-medium">Stage</th>
                <th className="py-2 px-3 pr-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="row-hover border-b border-border/60 cursor-pointer"
                  onClick={() => openDrawer(c)}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={getInitials(c.full_name)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold leading-snug">{c.full_name}</div>
                        <div className="text-xs text-muted-foreground">{c.title ?? "—"}</div>
                      </div>
                      {c.customer_type === "commercial"
                        ? <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                        : <Home className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      }
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {c.company
                      ? <span className="text-foreground/75 text-sm">{c.company.name}</span>
                      : <span className="text-muted-foreground/40 text-sm">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {c.phone ?? "—"}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">
                    <span className="truncate block max-w-[180px]">{c.email ?? "—"}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {c.contact_type
                      ? <TypeBadge type={c.contact_type} />
                      : <span className="text-muted-foreground/40 text-sm">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3">
                    {c.assignee?.full_name
                      ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar initials={getInitials(c.assignee.full_name)} />
                          <span className="text-xs">{c.assignee.full_name.split(" ")[0]}</span>
                        </div>
                      )
                      : <span className="text-muted-foreground/40 text-sm">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3">
                    <StageBadge stage={c.stage} />
                  </td>
                  <td className="py-2.5 px-3 pr-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canWrite && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openDrawer(c, "edit"); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="Edit contact"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openDrawer(c, "view"); }}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="View contact"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    {contacts.length === 0
                      ? "No contacts yet. Add your first one."
                      : "No contacts match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) { setSelected(null); setDrawerMode("view"); } }}>
        {selected !== null && (
          <ContactDrawer
            key={selected.id}
            contact={selected}
            mode={drawerMode}
            canWrite={canWrite}
            onSwitchToEdit={() => setDrawerMode("edit")}
            onSaved={() => { setSelected(null); setDrawerMode("view"); }}
            teamMembers={teamMembers}
          />
        )}
      </Sheet>

      {/* New contact modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewContactModal onClose={() => setNewOpen(false)} teamMembers={teamMembers} />
      </Dialog>
    </div>
  );
}

// ─── Contact detail drawer ────────────────────────────────────────────────────

function ContactDrawer({
  contact: c,
  mode,
  canWrite,
  onSwitchToEdit,
  onSaved,
  teamMembers,
}: {
  contact: DbContact;
  mode: "view" | "edit";
  canWrite: boolean;
  onSwitchToEdit: () => void;
  onSaved: () => void;
  teamMembers: TeamMember[];
}) {
  const isResidential = c.customer_type === "residential";

  return (
    <SheetContent hideClose className="sm:max-w-[460px] flex flex-col p-0 gap-0">
      <DrawerHeader
        leading={<Avatar initials={getInitials(c.full_name)} className="!h-11 !w-11 !text-md !rounded-xl" />}
        title={c.full_name}
        subtitle={`${c.title}${!isResidential && c.company ? ` · ${c.company.name}` : ""}`}
        onEdit={mode === "view" && canWrite ? onSwitchToEdit : undefined}
      >
        {c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </DrawerHeader>

      {mode === "view" ? (
        <ContactViewBody contact={c} isResidential={isResidential} />
      ) : (
        <ContactEditBody contact={c} onSaved={onSaved} onCancel={() => onSaved()} teamMembers={teamMembers} />
      )}
    </SheetContent>
  );
}

function ContactViewBody({ contact: c, isResidential }: { contact: DbContact; isResidential: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
      {/* Contact info */}
      <section>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2.5">Contact Info</p>
        <div className="space-y-2 text-sm">
          {c.phone && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono text-sm">{c.phone}</span>
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span>{c.email}</span>
            </div>
          )}
          {!isResidential && c.address && (
            <div className="flex items-start gap-2.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{c.address}</span>
            </div>
          )}
        </div>
      </section>

      {/* Property address — residential only */}
      {isResidential && c.address && (
        <section>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2.5">Property Address</p>
          <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface/50 px-3 py-2.5 text-sm">
            <Home className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span className="text-foreground">{c.address}</span>
          </div>
        </section>
      )}

      {/* Details */}
      <section>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2.5">Details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p className="text-2xs text-muted-foreground mb-0.5">Assigned To</p>
            {c.assignee?.full_name
              ? (
                <div className="flex items-center gap-1.5">
                  <Avatar initials={getInitials(c.assignee.full_name)} />
                  <span>{c.assignee.full_name}</span>
                </div>
              )
              : <span className="text-muted-foreground">—</span>
            }
          </div>
          <div>
            <p className="text-2xs text-muted-foreground mb-0.5">Lead Source</p>
            <span>{c.source ?? "—"}</span>
          </div>
          {!isResidential && c.contact_type && (
            <div>
              <p className="text-2xs text-muted-foreground mb-0.5">Type</p>
              <TypeBadge type={c.contact_type} />
            </div>
          )}
          <div>
            <p className="text-2xs text-muted-foreground mb-0.5">Stage</p>
            <StageBadge stage={c.stage} />
          </div>
        </div>
      </section>

      {/* Related company — commercial only */}
      {!isResidential && c.company && (
        <section>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2.5">Company</p>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-primary hover:underline cursor-pointer">{c.company.name}</span>
          </div>
        </section>
      )}

      {/* Notes */}
      {c.notes && (
        <section>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.notes}</p>
        </section>
      )}
    </div>
  );
}

// ─── Contact edit form (inside drawer) ───────────────────────────────────────

function ContactEditBody({
  contact: c,
  onSaved,
  onCancel,
  teamMembers,
}: {
  contact: DbContact;
  onSaved: () => void;
  onCancel: () => void;
  teamMembers: TeamMember[];
}) {
  const qc = useQueryClient();
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";  const labelCls = "block text-2xs uppercase tracking-wider text-muted-foreground mb-1";

  const [form, setForm] = useState({
    full_name:    c.full_name,
    title:        c.title        ?? "",
    phone:        c.phone        ?? "",
    email:        c.email        ?? "",
    address:      c.address      ?? "",
    contact_type: c.contact_type ?? "" as ContactType | "",
    source:       c.source       ?? "Phone" as ContactSource,
    assigned_to:  c.assigned_to  ?? "",
    stage:        c.stage,
    notes:        c.notes        ?? "",
    company_id:   c.company_id   ?? "",
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: companyOptions = [] } = useQuery({
    queryKey: ["company-options"],
    queryFn: fetchCompanyOptions,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("contacts")
        .update({
          full_name:    form.full_name.trim(),
          title:        form.title.trim()   || null,
          phone:        form.phone.trim()   || null,
          email:        form.email.trim()   || null,
          address:      form.address.trim() || null,
          contact_type: (form.contact_type  || null) as ContactType | null,
          source:       form.source         || null,
          assigned_to:  form.assigned_to    || null,
          stage:        form.stage,
          notes:        form.notes.trim()   || null,
          company_id:   form.company_id     || null,
        })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onSaved();
    },
  });

  const isCommercial = c.customer_type === "commercial";

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <div>
          <label className={labelCls}>Full Name <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={form.full_name} onChange={set("full_name")} />
        </div>
        <div>
          <label className={labelCls}>Job Title</label>
          <input className={inputCls} value={form.title} onChange={set("title")} placeholder="e.g. Facilities Manager" />
        </div>
        {isCommercial && (
          <div>
            <label className={labelCls}>Company</label>
            <FormSelect value={form.company_id} onChange={set("company_id")}>
              <option value="">— None —</option>
              {companyOptions.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
            </FormSelect>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" type="tel" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={form.email} onChange={set("email")} placeholder="email@example.com" type="email" />
          </div>
        </div>
        <div>
          <label className={labelCls}>{isCommercial ? "Address" : "Property Address"}</label>
          <input className={inputCls} value={form.address} onChange={set("address")} placeholder="Street, City, State ZIP" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isCommercial && (
            <div>
              <label className={labelCls}>Contact Type</label>
              <FormSelect value={form.contact_type} onChange={set("contact_type")}>
                <option value="">— None —</option>
                {typeOptions.map((t) => <option key={t}>{t}</option>)}
              </FormSelect>
            </div>
          )}
          <div className={isCommercial ? "" : "col-span-2"}>
            <label className={labelCls}>Stage</label>
            <FormSelect value={form.stage} onChange={set("stage")}>
              <option value="Lead">Lead</option>
              <option value="Customer">Customer</option>
              <option value="Inactive">Inactive</option>
            </FormSelect>
          </div>
        </div>
        <div>
          <label className={labelCls}>Lead Source</label>
          <FormSelect value={form.source} onChange={set("source")}>
            {sourceOptions.map((s) => <option key={s}>{s}</option>)}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Assign To</label>
          <FormSelect value={form.assigned_to} onChange={set("assigned_to")}>
            <option value="">— Unassigned —</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? "—"}</option>
            ))}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={set("notes")}
            placeholder="Add any notes…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>
      <div className="border-t border-border px-5 py-4 flex gap-2">
        <button
          onClick={() => mutate()}
          disabled={!form.full_name.trim() || isPending}
          className="flex-1 h-8 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="h-8 rounded-md border border-border px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── New contact modal ────────────────────────────────────────────────────────

const initialForm = {
  firstName: "", lastName: "", title: "",
  company_id: "", phone: "", email: "", address: "",
  contact_type: "" as ContactType | "",
  source: "Phone" as ContactSource,
  assigned_to: "",
  stage: "Lead" as LifecycleStage,
  customer_type: "commercial" as CustomerType,
  notes: "",
};

function NewContactModal({ onClose, teamMembers }: { onClose: () => void; teamMembers: TeamMember[] }) {
  const qc = useQueryClient();
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";  const labelCls = "block text-2xs uppercase tracking-wider text-muted-foreground mb-1";

  const [form, setForm] = useState(initialForm);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: companyOptions = [] } = useQuery({
    queryKey: ["company-options"],
    queryFn: fetchCompanyOptions,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const tenant = qc.getQueryData<{ id: string }>(["tenant"]);
      const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");
      const { error } = await supabase.from("contacts").insert({
        tenant_id: tenant!.id,
        full_name: fullName,
        title: form.title.trim() || null,
        company_id: form.company_id || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        contact_type: (form.contact_type || null) as ContactType | null,
        source: form.source || null,
        assigned_to: form.assigned_to || null,
        stage: form.stage,
        customer_type: form.customer_type,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    },
  });

  const isCommercial = form.customer_type === "commercial";
  const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Contact</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        {/* Customer type toggle */}
        <div className="col-span-2">
          <label className={labelCls}>Customer Type</label>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, customer_type: "commercial" }))}
              className={cn(
                "flex-1 h-8 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors",
                isCommercial ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Commercial
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, customer_type: "residential" }))}
              className={cn(
                "flex-1 h-8 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors border-l border-border",
                !isCommercial ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Home className="h-3.5 w-3.5" />
              Residential
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>First Name <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={form.firstName} onChange={set("firstName")} placeholder="First name" />
        </div>
        <div>
          <label className={labelCls}>Last Name</label>
          <input className={inputCls} value={form.lastName} onChange={set("lastName")} placeholder="Last name" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Job Title</label>
          <input className={inputCls} value={form.title} onChange={set("title")} placeholder={isCommercial ? "e.g. Facilities Manager" : "e.g. Homeowner"} />
        </div>

        {isCommercial && (
          <div className="col-span-2">
            <label className={labelCls}>Company</label>
            <FormSelect value={form.company_id} onChange={set("company_id")}>
              <option value="">— None —</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FormSelect>
          </div>
        )}

        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={form.email} onChange={set("email")} placeholder="email@example.com" type="email" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{isCommercial ? "Address" : "Property Address"}</label>
          <input className={inputCls} value={form.address} onChange={set("address")} placeholder="Street, City, State ZIP" />
        </div>

        {isCommercial && (
          <div>
            <label className={labelCls}>Contact Type</label>
            <FormSelect value={form.contact_type} onChange={set("contact_type")}>
              <option value="">— None —</option>
              {typeOptions.map((t) => <option key={t}>{t}</option>)}
            </FormSelect>
          </div>
        )}

        <div className={isCommercial ? "" : "col-span-2"}>
          <label className={labelCls}>Lead Source</label>
          <FormSelect value={form.source} onChange={set("source")}>
            {sourceOptions.map((s) => <option key={s}>{s}</option>)}
          </FormSelect>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Assign To</label>
          <FormSelect value={form.assigned_to} onChange={set("assigned_to")}>
            <option value="">— Unassigned —</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? "—"}</option>
            ))}
          </FormSelect>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={set("notes")}
            placeholder="Add any notes…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => mutate()}
          disabled={!fullName || isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add Contact"}
        </button>
      </div>
    </DialogContent>
  );
}

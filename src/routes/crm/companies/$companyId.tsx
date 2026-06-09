import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, Globe, Mail, MapPin, Pencil, Phone, Plus, X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/crm/companies/$companyId")({
  component: CompanyDetailPage,
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
}

interface DbContact {
  id: string;
  full_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const stageMeta: Record<CompanyStage, { label: string; cls: string }> = {
  active:   { label: "Active",   cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  prospect: { label: "Prospect", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  inactive: { label: "Inactive", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchCompany(id: string): Promise<DbCompany | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry, stage, phone, email, website, city, state, billing_address, service_address, notes")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as DbCompany;
}

async function fetchCompanyContacts(companyId: string): Promise<DbContact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, full_name, title, phone, email")
    .eq("company_id", companyId)
    .order("full_name");
  if (error) throw error;
  return data ?? [];
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

// ─── Detail page ─────────────────────────────────────────────────────────────

function CompanyDetailPage() {
  const { companyId } = Route.useParams();
  const { setMeta } = useMeta();
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => fetchCompany(companyId),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["company-contacts", companyId],
    queryFn: () => fetchCompanyContacts(companyId),
    enabled: !!company,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const notesInitialized = useRef(false);

  useEffect(() => {
    if (company && !notesInitialized.current) {
      setNotesText(company.notes ?? "");
      notesInitialized.current = true;
    }
  }, [company]);

  const saveNotes = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("companies")
        .update({ notes: notesText.trim() || null })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.setQueryData<DbCompany>(["company", companyId], (prev) =>
        prev ? { ...prev, notes: notesText.trim() || null } : prev,
      );
      setEditingNotes(false);
    },
  });

  useEffect(() => {
    if (company) {
      setMeta({ title: company.name, subtitle: company.industry ?? undefined });
    }
  }, [setMeta, company]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-[12.5px] text-muted-foreground">Loading…</div>;
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-[14px] font-medium">Company not found</p>
        <p className="text-[12.5px] text-muted-foreground mt-1 mb-4">This company doesn't exist or you don't have access.</p>
        <Link
          to="/crm/companies"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="border-b border-border px-5 py-2.5">
        <Link
          to="/crm/companies"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Companies
        </Link>
      </div>

      {/* Company header */}
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-start gap-4">
          <Avatar
            initials={getInitials(company.name)}
            className="!h-14 !w-14 !text-[18px] !rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[17px] font-semibold">{company.name}</h1>
              <StageBadge stage={company.stage} />
              <button
                onClick={() => setEditOpen(true)}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              {[company.industry, company.city && company.state ? `${company.city}, ${company.state}` : company.city ?? company.state].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono">{company.phone}</span>
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {company.email}
                </a>
              )}
              {company.website && (
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  {company.website}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left main column */}
        <div className="flex-1 min-w-0 overflow-y-auto px-5 py-5 space-y-6">

          {/* Company info */}
          {(company.billing_address || company.service_address) && (
            <section>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Company Info</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
                {company.billing_address && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Billing Address</p>
                    <div className="flex items-start gap-2 text-foreground/80">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                      <span>{company.billing_address}</span>
                    </div>
                  </div>
                )}
                {company.service_address && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Service Address</p>
                    <div className="flex items-start gap-2 text-foreground/80">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                      <span>{company.service_address}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Contacts */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Contacts <span className="ml-1 text-foreground font-mono">{contacts.length}</span>
              </p>
              <Link
                to="/crm/contacts"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Contact
              </Link>
            </div>
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface/40 px-3 py-2.5 text-[12px]"
                  >
                    <Avatar initials={getInitials(contact.full_name)} className="!h-7 !w-7 !text-[10px] !rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-snug truncate">{contact.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{contact.title ?? "—"}</div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                      {contact.phone && <span className="font-mono text-[11px] text-muted-foreground">{contact.phone}</span>}
                      {contact.email && <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{contact.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">No contacts yet.</p>
            )}
          </section>

          {/* Opportunities — stub until Sales schema is built */}
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Open Opportunities</p>
            <p className="text-[12px] text-muted-foreground italic">Available after Sales module is wired up.</p>
          </section>

          {/* Projects — stub until Operations schema is built */}
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Active Projects</p>
            <p className="text-[12px] text-muted-foreground italic">Available after Operations module is wired up.</p>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="w-[260px] shrink-0 border-l border-border overflow-y-auto px-4 py-5 space-y-5">
          {/* Notes */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</p>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {editingNotes ? (
              <>
                <textarea
                  autoFocus
                  rows={6}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add notes…"
                />
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => saveNotes.mutate()}
                    disabled={saveNotes.isPending}
                    className="flex-1 h-7 rounded-md bg-primary text-[11.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saveNotes.isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setNotesText(company.notes ?? "");
                      setEditingNotes(false);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {company.notes?.trim() || "No notes."}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Edit company modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <EditCompanyModal
          company={company}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            qc.setQueryData<DbCompany>(["company", companyId], updated);
            setMeta({ title: updated.name, subtitle: updated.industry ?? undefined });
            setEditOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Edit company modal ───────────────────────────────────────────────────────

function EditCompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: DbCompany;
  onClose: () => void;
  onSaved: (updated: DbCompany) => void;
}) {
  const inputCls  = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls = "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls  = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  const [form, setForm] = useState({
    name:            company.name,
    industry:        company.industry        ?? "",
    stage:           company.stage,
    phone:           company.phone           ?? "",
    email:           company.email           ?? "",
    website:         company.website         ?? "",
    city:            company.city            ?? "",
    state:           company.state           ?? "",
    billing_address: company.billing_address ?? "",
    service_address: company.service_address ?? "",
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .update({
          name:            form.name.trim(),
          industry:        form.industry.trim()        || null,
          stage:           form.stage,
          phone:           form.phone.trim()           || null,
          email:           form.email.trim()           || null,
          website:         form.website.trim()         || null,
          city:            form.city.trim()            || null,
          state:           form.state.trim()           || null,
          billing_address: form.billing_address.trim() || null,
          service_address: form.service_address.trim() || null,
        })
        .eq("id", company.id)
        .select("id, name, industry, stage, phone, email, website, city, state, billing_address, service_address, notes")
        .single();
      if (error) throw error;
      return data as DbCompany;
    },
    onSuccess: onSaved,
  });

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Company</DialogTitle>
      </DialogHeader>

      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Company Name <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={form.name} onChange={set("name")} />
        </div>

        <div>
          <label className={labelCls}>Industry</label>
          <input className={inputCls} value={form.industry} onChange={set("industry")} placeholder="e.g. Healthcare" />
        </div>
        <div>
          <label className={labelCls}>Stage</label>
          <select className={selectCls} value={form.stage} onChange={set("stage")}>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={form.email} onChange={set("email")} placeholder="info@company.com" type="email" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Website</label>
          <input className={inputCls} value={form.website} onChange={set("website")} placeholder="https://example.com" type="url" />
        </div>

        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={form.city} onChange={set("city")} placeholder="Chicago" />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input className={inputCls} value={form.state} onChange={set("state")} placeholder="IL" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Billing Address</label>
          <input className={inputCls} value={form.billing_address} onChange={set("billing_address")} placeholder="123 Main St, Chicago, IL 60601" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Service Address</label>
          <input className={inputCls} value={form.service_address} onChange={set("service_address")} placeholder="Same as billing or different location" />
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
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </DialogContent>
  );
}

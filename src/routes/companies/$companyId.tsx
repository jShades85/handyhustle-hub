import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Avatar, StageChip } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, CheckCircle2, CreditCard, DollarSign,
  FileText, FolderKanban, Globe, Mail, MapPin, Phone, Plus, User,
} from "lucide-react";
import { COMPANIES, type ActivityType, type CompanyStage, type InvoiceStatus } from "@/data/companies";
import type { DealStage } from "@/lib/demo-data";

export const Route = createFileRoute("/companies/$companyId")({
  component: CompanyDetailPage,
});

// ─── Config ──────────────────────────────────────────────────────────────────

const stageMeta: Record<CompanyStage, { label: string; cls: string }> = {
  active:   { label: "Active",   cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  prospect: { label: "Prospect", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  inactive: { label: "Inactive", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const invoiceStatusMeta: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: "bg-slate-500/15 text-slate-500" },
  sent:    { label: "Sent",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  partial: { label: "Partial", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  paid:    { label: "Paid",    cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  overdue: { label: "Overdue", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

const projectStatusCls: Record<string, string> = {
  Design:      "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  Procurement: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Install:     "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  Commission:  "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  Closeout:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const activityIcon: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  invoice: DollarSign,
  project: FolderKanban,
  quote:   FileText,
  contact: User,
  call:    Phone,
};

const activityColor: Record<ActivityType, string> = {
  invoice: "text-emerald-500",
  project: "text-primary",
  quote:   "text-blue-500",
  contact: "text-violet-500",
  call:    "text-green-500",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.replace(/&/g, "").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompanyStageBadge({ stage }: { stage: CompanyStage }) {
  const { label, cls } = stageMeta[stage];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, cls } = invoiceStatusMeta[status];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      {label}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const cls = projectStatusCls[status] ?? "bg-slate-500/15 text-slate-500";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      {status}
    </span>
  );
}

// ─── Detail page ─────────────────────────────────────────────────────────────

function CompanyDetailPage() {
  const { companyId } = Route.useParams();
  const { setMeta } = useMeta();

  const company = COMPANIES.find((c) => c.id === companyId);

  useEffect(() => {
    if (company) {
      setMeta({ title: company.name, subtitle: company.industry });
    }
  }, [setMeta, company]);

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-[14px] font-medium">Company not found</p>
        <p className="text-[12.5px] text-muted-foreground mt-1 mb-4">The company ID "{companyId}" doesn't exist.</p>
        <Link
          to="/companies"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Companies
        </Link>
      </div>
    );
  }

  const totalOppValue = company.opportunities.reduce((s, o) => s + o.value, 0);

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="border-b border-border px-5 py-2.5">
        <Link
          to="/companies"
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
              <CompanyStageBadge stage={company.stage} />
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">{company.industry} · {company.city}, {company.state}</p>
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
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Company Info</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Billing Address</p>
                <div className="flex items-start gap-2 text-foreground/80">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span>{company.billingAddress}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Service Address</p>
                <div className="flex items-start gap-2 text-foreground/80">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span>{company.serviceAddress}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Contacts */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Contacts <span className="ml-1 text-foreground font-mono">{company.contacts.length}</span>
              </p>
              <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="h-3 w-3" />
                Add Contact
              </button>
            </div>
            <div className="space-y-2">
              {company.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface/40 px-3 py-2.5 text-[12px]"
                >
                  <Avatar initials={getInitials(contact.name)} className="!h-7 !w-7 !text-[10px] !rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium leading-snug truncate">{contact.name}</div>
                    <div className="text-[11px] text-muted-foreground">{contact.role}</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-mono text-[11px] text-muted-foreground">{contact.phone}</span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{contact.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Open opportunities */}
          {company.opportunities.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Open Opportunities <span className="ml-1 text-foreground font-mono">{company.opportunities.length}</span>
                  {totalOppValue > 0 && (
                    <span className="ml-1.5 text-muted-foreground">· {currency(totalOppValue)}</span>
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                {company.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-2.5 text-[12px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StageChip stage={opp.stage as DealStage} />
                      <span className="truncate text-foreground">{opp.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="font-mono text-muted-foreground">{currency(opp.value)}</span>
                      <span className="text-[11px] text-muted-foreground">{opp.closeDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active projects */}
          {company.projects.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">
                Active Projects <span className="ml-1 text-foreground font-mono">{company.projects.length}</span>
              </p>
              <div className="space-y-1.5">
                {company.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-2.5 text-[12px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProjectStatusBadge status={proj.status} />
                      <span className="truncate text-foreground">{proj.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{proj.startDate}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent invoices */}
          {company.invoices.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">
                Recent Invoices <span className="ml-1 text-foreground font-mono">{company.invoices.length}</span>
              </p>
              <div className="space-y-1.5">
                {company.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-2.5 text-[12px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-foreground">{inv.number}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <InvoiceStatusBadge status={inv.status} />
                      <span className="font-mono text-muted-foreground">{currency(inv.amount)}</span>
                      <span className="text-[11px] text-muted-foreground">{inv.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activity feed */}
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Activity</p>
            <ul className="space-y-3">
              {company.activityFeed.map((a, i) => {
                const Icon = activityIcon[a.type];
                return (
                  <li key={i} className="flex gap-3 text-[12px]">
                    <div className={cn("mt-0.5 shrink-0", activityColor[a.type])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div>{a.description}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{a.date}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="w-[260px] shrink-0 border-l border-border overflow-y-auto px-4 py-5 space-y-5">
          {/* Quick stats */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick Stats</p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Total Revenue</p>
                <p className="text-[16px] font-semibold tabular-nums">
                  {company.totalRevenue > 0 ? currency(company.totalRevenue) : "—"}
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Open Pipeline</p>
                <p className="text-[16px] font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {company.openPipeline > 0 ? currency(company.openPipeline) : "—"}
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Jobs Completed</p>
                <p className="text-[16px] font-semibold">{company.jobsCompleted}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Notes</p>
            <textarea
              rows={6}
              defaultValue={company.notes}
              className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12px] text-muted-foreground leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Add notes…"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

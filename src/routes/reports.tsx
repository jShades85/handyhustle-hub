import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
import {
  BarChart2, TrendingUp, DollarSign, FileText, Briefcase,
  Users, Package, Headphones, Sliders, Lock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

// ─── Report catalog ───────────────────────────────────────────────────────────

type ReportStatus = "available" | "coming_soon";

type Report = {
  id: string;
  name: string;
  description: string;
  status: ReportStatus;
};

type ReportCategory = {
  id: string;
  label: string;
  icon: typeof BarChart2;
  reports: Report[];
};

const CATEGORIES: ReportCategory[] = [
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    reports: [
      { id: "revenue-over-time",   name: "Revenue Over Time",       description: "Monthly and quarterly revenue trends with year-over-year comparison.",         status: "coming_soon" },
      { id: "invoice-aging",       name: "Invoice Aging",           description: "Outstanding invoices bucketed by age: current, 30, 60, 90+ days.",             status: "coming_soon" },
      { id: "payments-collected",  name: "Payments Collected",      description: "Cash collected by period, method, and client.",                                 status: "coming_soon" },
      { id: "gross-margin",        name: "Gross Margin by Job",     description: "Revenue minus direct costs per project — identifies most and least profitable jobs.", status: "coming_soon" },
      { id: "ar-summary",          name: "AR Summary",              description: "Total outstanding, overdue amounts, and collection rate over time.",             status: "coming_soon" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: TrendingUp,
    reports: [
      { id: "pipeline-overview",   name: "Pipeline Overview",       description: "Opportunity value and count by stage, with average close time.",                status: "coming_soon" },
      { id: "lead-sources",        name: "Lead Sources",            description: "Which channels are generating the most leads and highest-value opportunities.",  status: "coming_soon" },
      { id: "quote-conversion",    name: "Quote Conversion Rate",   description: "Quotes sent vs. accepted, by rep and time period.",                             status: "coming_soon" },
      { id: "sales-by-rep",        name: "Sales by Rep",            description: "Closed revenue, win rate, and average deal size per sales rep.",                status: "coming_soon" },
      { id: "win-loss",            name: "Win / Loss Analysis",     description: "Reasons and patterns behind won and lost opportunities.",                       status: "coming_soon" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Briefcase,
    reports: [
      { id: "project-status",      name: "Project Status Overview", description: "All active projects with status, budget burn, and timeline health.",            status: "coming_soon" },
      { id: "budget-vs-actual",    name: "Budget vs. Actual",       description: "Planned vs. spent costs per project and phase.",                                status: "coming_soon" },
      { id: "on-time-completion",  name: "On-Time Completion Rate", description: "Percentage of projects and work orders completed by their target date.",        status: "coming_soon" },
      { id: "labor-hours",         name: "Labor Hours by Project",  description: "Hours logged per project vs. estimated — surfaces over/under-runs.",            status: "coming_soon" },
      { id: "scheduling-density",  name: "Scheduling Density",      description: "Team capacity utilization across scheduled jobs by week.",                      status: "coming_soon" },
    ],
  },
  {
    id: "service",
    label: "Service",
    icon: Headphones,
    reports: [
      { id: "ticket-volume",       name: "Ticket Volume",           description: "Open, resolved, and escalated tickets over time by category and priority.",     status: "coming_soon" },
      { id: "resolution-time",     name: "Resolution Time",         description: "Average time to resolve tickets vs. SLA by tier.",                             status: "coming_soon" },
      { id: "mrr-arr",             name: "MRR / ARR Trends",        description: "Monthly and annual recurring revenue from service plans over time.",            status: "coming_soon" },
      { id: "plan-renewals",       name: "Plan Renewal Rate",       description: "Renewals, cancellations, and churn by tier.",                                   status: "coming_soon" },
      { id: "sla-compliance",      name: "SLA Compliance",          description: "Percentage of tickets responded to within the contracted SLA window.",          status: "coming_soon" },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
    reports: [
      { id: "tech-utilization",    name: "Technician Utilization",  description: "Scheduled vs. available hours per tech over a given period.",                   status: "coming_soon" },
      { id: "hours-by-tech",       name: "Hours by Technician",     description: "Hours logged per technician across projects, work orders, and service tickets.", status: "coming_soon" },
      { id: "job-completion",      name: "Job Completion by Tech",  description: "Jobs completed per tech with on-time and quality metrics.",                     status: "coming_soon" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    reports: [
      { id: "stock-turnover",      name: "Stock Turnover",          description: "How quickly items move through inventory — flags slow-moving stock.",           status: "coming_soon" },
      { id: "po-spend",            name: "PO Spend by Vendor",      description: "Purchase order totals by vendor over time.",                                   status: "coming_soon" },
      { id: "parts-usage",         name: "Parts Usage by Project",  description: "Which parts were pulled for which jobs — useful for job costing.",             status: "coming_soon" },
      { id: "low-stock-history",   name: "Low Stock History",       description: "Timeline of stock-out and near-miss events by item.",                          status: "coming_soon" },
    ],
  },
];

const ALL_TAB = "all";

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReportsPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Reports" }); }, [setMeta]);

  const [activeTab, setActiveTab] = useState(ALL_TAB);

  const visibleCategories = activeTab === ALL_TAB
    ? CATEGORIES
    : CATEGORIES.filter((c) => c.id === activeTab);

  return (
    <div className="flex flex-col">

      {/* Tab bar */}
      <div className="flex items-center border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab(ALL_TAB)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === ALL_TAB
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          All Reports
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === cat.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-10">

        {/* Pre-built reports */}
        {visibleCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold">{cat.label}</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cat.reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Custom report builder teaser */}
        {(activeTab === ALL_TAB) && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold">Custom Reports</h2>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sliders className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold">Build your own reports</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground max-w-xl">
                    Choose any combination of fields, filters, and groupings from across your data — revenue, jobs, team, inventory, and more. Save reports to your library and schedule them to run automatically.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Field picker", "Filter builder", "Chart types", "Saved reports", "Scheduled delivery"].map((f) => (
                      <span key={f} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Post-launch
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: Report }) {
  const isAvailable = report.status === "available";
  return (
    <div className={cn(
      "group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors",
      isAvailable ? "hover:border-primary/40 cursor-pointer" : "opacity-60",
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-medium leading-snug">{report.name}</p>
        {isAvailable ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
        ) : (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
            Coming soon
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">{report.description}</p>
    </div>
  );
}

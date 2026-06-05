import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, JobCard } from "@/components/ui-bits";
import type { DealStage } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Port City Sound & Security" }] }),
  component: Dashboard,
});

const JOBS: {
  id: string;
  title: string;
  customer: string;
  status: DealStage;
  date: string;
  assignee: string;
  value: string;
}[] = [
  { id: "J-1042", title: "Security Camera Installation", customer: "Harbor View Marina",  status: "proposal",  date: "Jun 12, 2026", assignee: "JS", value: "$8,400"  },
  { id: "J-1041", title: "Home Theater Setup",           customer: "Riverside Estates",   status: "qualified", date: "Jun 10, 2026", assignee: "JS", value: "$12,200" },
  { id: "J-1040", title: "Access Control System",        customer: "Port City Medical",   status: "won",       date: "Jun 8, 2026",  assignee: "JS", value: "$31,500" },
  { id: "J-1039", title: "AV Conference Room",           customer: "Coastal Law Group",   status: "lead",      date: "Jun 5, 2026",  assignee: "JS", value: "$6,800"  },
];

function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={today} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Active Jobs"    value="24"        delta="+3"     accent="up" />
          <StatCard label="Open Leads"     value="11"        delta="+2"     accent="up" />
          <StatCard label="Revenue MTD"    value="$142,800"  delta="+8.2%"  accent="up" />
          <StatCard label="Overdue Tasks"  value="3"         delta="-1"     accent="up" />
        </div>

        <div>
          <div className="mb-3 text-[13px] font-medium">Recent Jobs</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {JOBS.map((job) => (
              <JobCard
                key={job.id}
                {...job}
                onClick={() => console.log(job.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

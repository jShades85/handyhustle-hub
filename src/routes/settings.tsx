import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Building2, FileText, Layers, Puzzle, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · BearingPro" }] }),
  component: SettingsShell,
});

// ─── Sub-nav ──────────────────────────────────────────────────────────────────

const sections = [
  {
    title: "Workspace",
    items: [
      { to: "/settings/company",            label: "Company Profile",    icon: Building2 },
      { to: "/settings/service-plan-tiers", label: "Service Plan Tiers", icon: Layers    },
    ],
  },
  {
    title: "Team",
    items: [
      { to: "/settings/team-members", label: "Team Members", icon: Users       },
      { to: "/settings/roles",        label: "Roles",        icon: ShieldCheck },
    ],
  },
  {
    title: "Sales",
    items: [
      { to: "/settings/quote-templates", label: "Quote Templates", icon: FileText },
    ],
  },
  {
    title: "Integrations",
    items: [
      { to: "/settings/integrations", label: "Integrations", icon: Puzzle },
    ],
  },
];

// ─── Shell ────────────────────────────────────────────────────────────────────

function SettingsShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full">
      {/* Sub-nav */}
      <aside className="w-[200px] shrink-0 border-r border-border bg-surface/40 px-3 py-5">
        <p className="mb-4 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Settings
        </p>
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex h-7 items-center gap-2 rounded-md px-2 text-[12.5px] transition-colors",
                        active
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Inbox, LayoutDashboard, Target, Building2, Users, FileText, Package,
  Briefcase, CalendarDays, Receipt, HardHat, Boxes, Truck, CreditCard, BarChart2,
  Search, Plus, Settings, ChevronsLeft, Sparkles, Command as CommandIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import ThemeToggle from "./ui/ThemeToggle";

type NavItem = { to: string; label: string; icon: typeof Inbox; badge?: string };

const sections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/inbox", label: "Inbox", icon: Inbox, badge: "12" },
    ],
  },
  {
    title: "Sales",
    items: [
      { to: "/opportunities", label: "Opportunities", icon: Target },
      { to: "/quotes", label: "Quotes & Estimates", icon: FileText },
      { to: "/catalog", label: "Catalog", icon: Package },
    ],
  },
  {
    title: "CRM",
    items: [
      { to: "/contacts", label: "Contacts", icon: Users },
      { to: "/companies", label: "Companies", icon: Building2 },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/projects", label: "Projects", icon: Briefcase },
      { to: "/scheduling", label: "Scheduling", icon: CalendarDays },
      { to: "/team", label: "Team", icon: HardHat },
    ],
  },
  {
    title: "Inventory",
    items: [
      { to: "/inventory", label: "Parts & Materials", icon: Boxes },
      { to: "/vendors", label: "Vendors", icon: Truck },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/invoices", label: "Invoices", icon: Receipt },
      { to: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    title: "Reports",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart2 },
    ],
  },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = sections.flatMap((s) => s.items).find((i) =>
    i.to === "/" ? pathname === "/" : pathname.startsWith(i.to)
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-[width] duration-150",
          collapsed ? "w-[60px]" : "w-[232px]",
        )}
      >
        <div className="flex h-12 items-center gap-2 px-3 border-b border-sidebar-border">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-chart-2 text-[10px] font-bold text-primary-foreground shadow-glow">
            PCSS
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold tracking-tight">Port City Sound & Security</span>
                <span className="text-[10px] text-muted-foreground">AV & Security Systems</span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setPaletteOpen(true)}
            className="mx-3 mt-3 flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2 text-[12px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search or jump…</span>
            <span className="ml-auto flex items-center gap-0.5">
              <span className="kbd">⌘</span>
              <span className="kbd">K</span>
            </span>
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section, i) => (
            <div key={i} className="mb-4">
              {section.title && !collapsed && (
                <div className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "group flex h-7 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-primary")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <div className={cn("flex items-center gap-2 rounded-md p-1.5", !collapsed && "hover:bg-sidebar-accent/60")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-chart-2 to-primary text-[10px] font-semibold text-primary-foreground">
              JS
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-col leading-tight">
                  <span className="text-[12px] font-medium">Justin Shader</span>
                  <span className="text-[10px] text-muted-foreground">Admin · Workspace</span>
                </div>
                <Settings className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </>
            )}
          </div>
          <div className={cn("mt-1 flex", collapsed ? "justify-center" : "px-0.5")}>
            <ThemeToggle />
          </div>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="mt-1 flex h-6 w-full items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Expand sidebar"
            >
              <ChevronsLeft className="h-3.5 w-3.5 rotate-180" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-muted-foreground">Workspace</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-medium">{current?.label ?? "Page"}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              <CommandIcon className="h-3 w-3" />
              <span className="kbd">⌘K</span>
            </button>
            <button className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <button className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-[11.5px] text-muted-foreground hover:text-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Ask
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

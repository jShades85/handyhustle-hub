import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Inbox, LayoutDashboard, Target, Building2, Users, FileText, Package,
  Briefcase, CalendarDays, Receipt, HardHat, Boxes, Truck, CreditCard, BarChart2,
  Search, Plus, Settings, PanelLeft, ClipboardList, Headphones, ShieldCheck, ShoppingCart,
  GanttChart, LogOut,
} from "lucide-react";
import { cn, avatarGradient, avatarInitials } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import ThemeToggle from "./ui/ThemeToggle";
import { PageMetaProvider, useMeta } from "@/contexts/PageMetaContext";
import { requestItems } from "@/data/inbox-data";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { usePermissions, type AppModule } from "@/contexts/PermissionsContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = { to: string; label: string; icon: typeof Inbox; badge?: string };
type NavSection = { title?: string; module?: AppModule; items: NavItem[] };

// ─── Nav data ─────────────────────────────────────────────────────────────────

const sections: NavSection[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/inbox", label: "Inbox", icon: Inbox },
    ],
  },
  {
    title: "CRM",
    module: "crm",
    items: [
      { to: "/crm/lead-inbox", label: "Lead Inbox", icon: Inbox },
      { to: "/crm/contacts", label: "Contacts", icon: Users },
      { to: "/crm/companies", label: "Companies", icon: Building2 },
    ],
  },
  {
    title: "Sales",
    module: "sales",
    items: [
      { to: "/sales/opportunities", label: "Opportunities", icon: Target },
      { to: "/sales/quotes", label: "Quotes & Estimates", icon: FileText },
    ],
  },
  {
    title: "Operations",
    module: "operations",
    items: [
      { to: "/operations/projects", label: "Projects", icon: Briefcase },
      { to: "/operations/work-orders", label: "Work Orders", icon: ClipboardList },
      { to: "/operations/planner",    label: "Planner",     icon: GanttChart },
      { to: "/operations/scheduling", label: "Scheduling",  icon: CalendarDays },
      { to: "/operations/team", label: "Team", icon: HardHat },
    ],
  },
  {
    title: "Service",
    module: "service",
    items: [
      { to: "/service/service-tickets", label: "Service Tickets", icon: Headphones },
      { to: "/service/service-plans", label: "Service Plans", icon: ShieldCheck },
    ],
  },
  {
    title: "Inventory",
    module: "inventory",
    items: [
      { to: "/inventory/catalog", label: "Catalog", icon: Package },
      { to: "/inventory/stock", label: "Stock", icon: Boxes },
      { to: "/inventory/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { to: "/inventory/vendors", label: "Vendors", icon: Truck },
    ],
  },
  {
    title: "Finance",
    module: "finance",
    items: [
      { to: "/finance/invoices", label: "Invoices", icon: Receipt },
      { to: "/finance/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    title: "Reports",
    module: "reports",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart2 },
    ],
  },
];

// ─── Shell ────────────────────────────────────────────────────────────────────

export function AppShell() {
  return (
    <PageMetaProvider>
      <AppShellContent />
    </PageMetaProvider>
  );
}

const pendingRequestCount = requestItems.length;

function moduleFromPath(pathname: string): AppModule | null {
  if (pathname.startsWith("/crm"))        return "crm";
  if (pathname.startsWith("/sales"))      return "sales";
  if (pathname.startsWith("/operations")) return "operations";
  if (pathname.startsWith("/service"))    return "service";
  if (pathname.startsWith("/inventory"))  return "inventory";
  if (pathname.startsWith("/finance"))    return "finance";
  if (pathname.startsWith("/reports"))    return "reports";
  if (pathname.startsWith("/settings"))   return "settings";
  return null;
}

async function fetchTenant() {
  const supabase = createClient();
  const { data, error } = await supabase.from("tenants").select("id, name, trade_type").single();
  if (error) throw error;
  return data;
}

function AppShellContent() {
  const { meta } = useMeta();
  const { signOut, user } = useAuth();
  const { can, loading: permsLoading } = usePermissions();
  const { data: tenant } = useQuery({ queryKey: ["tenant"], queryFn: fetchTenant, staleTime: Infinity });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const [signOutOpen, setSignOutOpen] = useState(false);

  const handleSignOut = async () => {
    setSignOutOpen(false);
    await signOut();
    navigate({ to: "/auth/login" });
  };
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-[width] duration-150",
          collapsed ? "w-[60px]" : "w-[232px]",
        )}
      >
        <div className={cn("flex min-h-14 items-center gap-2 py-3 border-b border-sidebar-border", collapsed ? "justify-center px-0" : "px-3")}>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-chart-2 text-[10px] font-bold text-primary-foreground shadow-glow">
            {tenant?.name ? tenant.name.split(" ").map((w: string) => w[0]).join("").slice(0, 4).toUpperCase() : "BP"}
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-tight">{tenant?.name ?? "BearingPro"}</span>
              {tenant?.trade_type && (
                <span className="text-[10px] text-muted-foreground">{tenant.trade_type}</span>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section, i) => {
            const locked = !permsLoading && !!section.module && !can(section.module, "read");
            return (
              <div key={i} className="mb-4">
                {section.title && !collapsed && (
                  <div className={cn(
                    "px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider",
                    locked ? "text-muted-foreground/30" : "text-muted-foreground/70",
                  )}>
                    {section.title}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = !locked && (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to));
                    const Icon = item.icon;
                    const itemCls = cn(
                      "group flex h-7 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                      locked
                        ? "cursor-not-allowed text-sidebar-foreground/30"
                        : active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-0",
                    );
                    const content = (
                      <>
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-primary")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                        {!collapsed && item.to === "/inbox" && pendingRequestCount > 0 && (
                          <span className="ml-auto rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {pendingRequestCount}
                          </span>
                        )}
                      </>
                    );
                    return (
                      <li key={item.to}>
                        {locked
                          ? <span className={itemCls}>{content}</span>
                          : <Link to={item.to} className={itemCls}>{content}</Link>
                        }
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <div className={cn("flex items-center gap-2 rounded-md p-1.5", !collapsed && "hover:bg-sidebar-accent/60")}>
            {(() => {
              const name = user?.user_metadata?.full_name || user?.email || "?";
              return (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: avatarGradient(name) }}>
                  {avatarInitials(name)}
                </div>
              );
            })()}
            {!collapsed && (
              <>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[12px] font-medium">{user?.email ?? "—"}</span>
                  <span className="text-[10px] text-muted-foreground">Admin · Workspace</span>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    onClick={() => navigate({ to: "/settings/company" })}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    aria-label="Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                  <Popover open={signOutOpen} onOpenChange={setSignOutOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label="Sign out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-44 p-3">
                      <p className="text-[12px] font-medium text-foreground">Sign out?</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">You'll need to sign back in.</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setSignOutOpen(false)}
                          className="flex-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="flex-1 rounded-md bg-red-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600 transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 flex-col items-center justify-center">
            {meta.title && (
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-foreground">{meta.title}</span>
                {meta.subtitle && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[12px] text-muted-foreground">{meta.subtitle}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-7 min-w-[220px] items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              <Search className="h-3 w-3 shrink-0" />
              <span className="flex-1 text-left">Search...</span>
              <span className="hidden items-center gap-1 sm:flex">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono leading-none">⌘K</kbd>
                <span className="text-[10px] text-muted-foreground/40">/</span>
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono leading-none">Ctrl K</kbd>
              </span>
            </button>
            {meta.onNew && (permsLoading || !moduleFromPath(pathname) || can(moduleFromPath(pathname)!, "write")) && (
              <button
                onClick={meta.onNew}
                className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                {meta.newLabel ?? "New"}
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

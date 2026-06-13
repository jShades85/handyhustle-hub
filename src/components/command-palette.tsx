import { useNavigate } from "@tanstack/react-router";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Inbox, Target, FileText, Users, Building2, Briefcase,
  CalendarDays, Package, Receipt, HardHat, Boxes, Truck, CreditCard,
  BarChart2, Plus, ClipboardList, Headphones, ShieldCheck, ShoppingCart,
  GanttChart, Layers, Puzzle, Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface PaletteCompany { id: string; name: string; industry: string | null }
interface PaletteProject { id: string; code: string; name: string; companies: { name: string } | null }
interface PaletteContact { id: string; full_name: string; title: string | null; companies: { name: string } | null }
interface PaletteOpp { id: string; title: string; companies: { name: string } | null }
interface PaletteWorkOrder { id: string; code: string; name: string }
interface PaletteInvoice { id: string; invoice_number: string; company_name: string }
interface PaletteTicket { id: string; code: string; issue: string }
interface PaletteVendor { id: string; name: string; category: string }

// ─── Nav entries ──────────────────────────────────────────────────────────────

const NAV = [
  { to: "/",                            label: "Dashboard",        icon: LayoutDashboard, group: "General"    },
  { to: "/inbox",                       label: "Inbox",            icon: Inbox,           group: "General"    },
  { to: "/crm/contacts",               label: "Contacts",         icon: Users,           group: "CRM"        },
  { to: "/crm/companies",              label: "Companies",        icon: Building2,        group: "CRM"        },
  { to: "/crm/lead-inbox",             label: "Lead Inbox",       icon: Inbox,           group: "CRM"        },
  { to: "/sales/opportunities",        label: "Opportunities",    icon: Target,           group: "Sales"      },
  { to: "/sales/quotes",               label: "Quotes & Estimates", icon: FileText,       group: "Sales"      },
  { to: "/operations/projects",        label: "Projects",         icon: Briefcase,        group: "Operations" },
  { to: "/operations/work-orders",     label: "Work Orders",      icon: ClipboardList,    group: "Operations" },
  { to: "/operations/planner",         label: "Planner",          icon: GanttChart,       group: "Operations" },
  { to: "/operations/scheduling",      label: "Scheduling",       icon: CalendarDays,     group: "Operations" },
  { to: "/operations/team",            label: "Team",             icon: HardHat,          group: "Operations" },
  { to: "/service/service-tickets",    label: "Service Tickets",  icon: Headphones,       group: "Service"    },
  { to: "/service/service-plans",      label: "Service Plans",    icon: ShieldCheck,      group: "Service"    },
  { to: "/inventory/catalog",          label: "Catalog",          icon: Package,          group: "Inventory"  },
  { to: "/inventory/stock",            label: "Stock",            icon: Boxes,            group: "Inventory"  },
  { to: "/inventory/purchase-orders",  label: "Purchase Orders",  icon: ShoppingCart,     group: "Inventory"  },
  { to: "/inventory/vendors",          label: "Vendors",          icon: Truck,            group: "Inventory"  },
  { to: "/finance/invoices",           label: "Invoices",         icon: Receipt,          group: "Finance"    },
  { to: "/finance/payments",           label: "Payments",         icon: CreditCard,       group: "Finance"    },
  { to: "/reports",                    label: "Reports",          icon: BarChart2,        group: "Reports"    },
  { to: "/settings/company",           label: "Company Profile",  icon: Settings,         group: "Settings"   },
  { to: "/settings/service-plan-tiers", label: "Service Plan Tiers", icon: Layers,        group: "Settings"   },
  { to: "/settings/quote-templates",   label: "Quote Templates",  icon: FileText,         group: "Settings"   },
  { to: "/settings/integrations",      label: "Integrations",     icon: Puzzle,           group: "Settings"   },
];

// ─── Quick actions ────────────────────────────────────────────────────────────

const ACTIONS: { label: string; to: string; icon: typeof Plus }[] = [
  { label: "New Lead",           to: "/crm/lead-inbox",          icon: Plus },
  { label: "New Opportunity",    to: "/sales/opportunities",     icon: Plus },
  { label: "New Quote",          to: "/sales/quotes",            icon: Plus },
  { label: "New Project",        to: "/operations/projects",     icon: Plus },
  { label: "New Work Order",     to: "/operations/work-orders",  icon: Plus },
  { label: "New Service Ticket", to: "/service/service-tickets", icon: Plus },
  { label: "New Invoice",        to: "/finance/invoices",        icon: Plus },
  { label: "New Purchase Order", to: "/inventory/purchase-orders", icon: Plus },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const supabase = createClient();

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const goContact = (id: string) => {
    onOpenChange(false);
    navigate({ to: "/crm/contacts", search: { contact: id } });
  };

  // Quick action → navigate to the page with ?create=1, which opens its New modal.
  const goNew = (to: string) => {
    onOpenChange(false);
    navigate({ to, search: { create: "1" } });
  };

  // Live records — fetched lazily the first time the palette opens, then cached.
  const { data: companies = [] } = useQuery({
    queryKey: ["palette-companies"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, industry").order("name");
      return (data ?? []) as PaletteCompany[];
    },
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["palette-projects"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, code, name, companies(name)").order("name");
      return (data ?? []) as unknown as PaletteProject[];
    },
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["palette-contacts"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, full_name, title, companies(name)").order("full_name");
      return (data ?? []) as unknown as PaletteContact[];
    },
  });
  const { data: opportunities = [] } = useQuery({
    queryKey: ["palette-opportunities"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("id, title, companies(name)").order("title");
      return (data ?? []) as unknown as PaletteOpp[];
    },
  });
  const { data: workOrders = [] } = useQuery({
    queryKey: ["palette-work-orders"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("work_orders").select("id, code, name").order("code", { ascending: false });
      return (data ?? []) as PaletteWorkOrder[];
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["palette-invoices"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id, invoice_number, company_name").order("invoice_number", { ascending: false });
      return (data ?? []) as PaletteInvoice[];
    },
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["palette-tickets"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("service_tickets").select("id, code, issue").order("code", { ascending: false });
      return (data ?? []) as PaletteTicket[];
    },
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ["palette-vendors"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, name, category").order("name");
      return (data ?? []) as PaletteVendor[];
    },
  });

  const goOpp = (id: string) => { onOpenChange(false); navigate({ to: "/sales/opportunities", search: { opp: id } }); };
  const goInvoice = (id: string) => { onOpenChange(false); navigate({ to: "/finance/invoices", search: { invoice: id } }); };
  const goTicket = (id: string) => { onOpenChange(false); navigate({ to: "/service/service-tickets", search: { ticket: id } }); };
  const goVendor = (id: string) => { onOpenChange(false); navigate({ to: "/inventory/vendors", search: { vendor: id } }); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput autoFocus placeholder="Search pages, records, actions…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Navigate">
            {NAV.map((n) => (
              <CommandItem key={n.to} value={`${n.label} ${n.group}`} onSelect={() => go(n.to)}>
                <n.icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{n.label}</span>
                <span className="ml-auto text-2xs text-muted-foreground">{n.group}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Quick actions */}
          <CommandGroup heading="Quick actions">
            {ACTIONS.map((a) => (
              <CommandItem key={a.label} value={a.label} onSelect={() => goNew(a.to)}>
                <a.icon className="mr-2 h-3.5 w-3.5 text-primary" />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Companies */}
          <CommandGroup heading="Companies">
            {companies.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.industry ?? ""}`}
                onSelect={() => go(`/crm/companies/${c.id}`)}
              >
                <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{c.name}</span>
                {c.industry && <span className="ml-auto text-2xs text-muted-foreground">{c.industry}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Projects */}
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.code} ${p.companies?.name ?? ""}`}
                onSelect={() => go(`/operations/projects/${p.id}`)}
              >
                <Briefcase className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{p.name}</span>
                <span className="ml-auto text-2xs text-muted-foreground">{p.code}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Contacts */}
          <CommandGroup heading="Contacts">
            {contacts.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.full_name} ${c.companies?.name ?? ""} ${c.title ?? ""}`}
                onSelect={() => goContact(c.id)}
              >
                <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{c.full_name}</span>
                {c.companies?.name && <span className="ml-auto text-2xs text-muted-foreground">{c.companies.name}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Opportunities */}
          <CommandGroup heading="Opportunities">
            {opportunities.map((o) => (
              <CommandItem
                key={o.id}
                value={`${o.title} ${o.companies?.name ?? ""}`}
                onSelect={() => goOpp(o.id)}
              >
                <Target className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{o.title}</span>
                {o.companies?.name && <span className="ml-auto shrink-0 text-2xs text-muted-foreground">{o.companies.name}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Work Orders */}
          <CommandGroup heading="Work Orders">
            {workOrders.map((w) => (
              <CommandItem
                key={w.id}
                value={`${w.name} ${w.code}`}
                onSelect={() => go(`/operations/work-orders/${w.id}`)}
              >
                <ClipboardList className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{w.name}</span>
                <span className="ml-auto shrink-0 text-2xs text-muted-foreground">{w.code}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Invoices */}
          <CommandGroup heading="Invoices">
            {invoices.map((i) => (
              <CommandItem
                key={i.id}
                value={`${i.invoice_number} ${i.company_name}`}
                onSelect={() => goInvoice(i.id)}
              >
                <Receipt className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{i.invoice_number}</span>
                {i.company_name && <span className="ml-auto shrink-0 text-2xs text-muted-foreground">{i.company_name}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Service Tickets */}
          <CommandGroup heading="Service Tickets">
            {tickets.map((t) => (
              <CommandItem
                key={t.id}
                value={`${t.code} ${t.issue}`}
                onSelect={() => goTicket(t.id)}
              >
                <Headphones className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{t.issue}</span>
                <span className="ml-auto shrink-0 text-2xs text-muted-foreground">{t.code}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Vendors */}
          <CommandGroup heading="Vendors">
            {vendors.map((v) => (
              <CommandItem
                key={v.id}
                value={`${v.name} ${v.category}`}
                onSelect={() => goVendor(v.id)}
              >
                <Truck className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{v.name}</span>
                {v.category && <span className="ml-auto shrink-0 text-2xs text-muted-foreground">{v.category}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

        </CommandList>
      </Command>
    </CommandDialog>
  );
}

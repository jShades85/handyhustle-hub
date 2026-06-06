import type { DealStage } from "@/lib/demo-data";

export type CompanyStage = "active" | "prospect" | "inactive";
export type CompanyIndustry =
  | "AV & Technology"
  | "Healthcare"
  | "Hospitality"
  | "Education"
  | "Real Estate"
  | "Government"
  | "Manufacturing"
  | "Other";
export type ActivityType = "invoice" | "project" | "quote" | "contact" | "call";
export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue";

export interface ActivityEntry {
  type: ActivityType;
  description: string;
  date: string;
}

export interface CompanyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: DealStage;
  value: number;
  closeDate: string;
}

export interface ActiveProject {
  id: string;
  title: string;
  status: string;
  startDate: string;
}

export interface RecentInvoice {
  id: string;
  number: string;
  amount: number;
  status: InvoiceStatus;
  date: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  industry: CompanyIndustry;
  city: string;
  state: string;
  stage: CompanyStage;
  phone: string;
  email: string;
  website: string;
  billingAddress: string;
  serviceAddress: string;
  openPipeline: number;
  contactsCount: number;
  activeProjects: number;
  totalRevenue: number;
  jobsCompleted: number;
  notes: string;
  contacts: CompanyContact[];
  opportunities: Opportunity[];
  projects: ActiveProject[];
  invoices: RecentInvoice[];
  activityFeed: ActivityEntry[];
}

export const COMPANIES: CompanyRecord[] = [
  {
    id: "c1",
    name: "Northbeam Architects",
    industry: "Other",
    city: "Brooklyn",
    state: "NY",
    stage: "active",
    phone: "(718) 555-0100",
    email: "info@northbeam.co",
    website: "northbeam.co",
    billingAddress: "44 Berry St, Brooklyn, NY 11211",
    serviceAddress: "44 Berry St, Brooklyn, NY 11211",
    openPipeline: 184500,
    contactsCount: 4,
    activeProjects: 1,
    totalRevenue: 312000,
    jobsCompleted: 4,
    notes: "Long-standing architecture partner. AV integration is spec'd into most new commercial builds. Audrey Chen is the primary decision-maker.",
    contacts: [
      { id: "p1",  name: "Audrey Chen",  role: "Decision Maker", phone: "(718) 555-0142", email: "audrey@northbeam.co" },
      { id: "p10", name: "Caleb Ortiz",  role: "Influencer",      phone: "(718) 555-0188", email: "caleb@northbeam.co" },
      { id: "pc1", name: "Dana Wren",    role: "Billing Contact", phone: "(718) 555-0161", email: "accounts@northbeam.co" },
      { id: "pc2", name: "Ryan Fallon",  role: "Site Contact",    phone: "(718) 555-0173", email: "rfallon@northbeam.co" },
    ],
    opportunities: [
      { id: "AV-226", title: "Penthouse cinema build",     stage: "proposal",   value: 184500, closeDate: "Jun 18" },
    ],
    projects: [
      { id: "pr1", title: "Penthouse cinema build", status: "Install",  startDate: "Apr 14" },
    ],
    invoices: [
      { id: "i3",  number: "INV-04809", amount: 92250,  status: "paid",    date: "May 22" },
      { id: "ip1", number: "INV-04771", amount: 74400,  status: "paid",    date: "Feb 10" },
      { id: "ip2", number: "INV-04744", amount: 58200,  status: "paid",    date: "Nov 08" },
    ],
    activityFeed: [
      { type: "invoice", description: "INV-04809 paid — $92,250",                date: "Jun 10" },
      { type: "quote",   description: "Quote Q-2026-0415 sent — $184,500",       date: "May 22" },
      { type: "call",    description: "Call — discussed penthouse timeline",      date: "May 15" },
      { type: "project", description: "Penthouse cinema — install phase started", date: "Apr 14" },
      { type: "invoice", description: "INV-04771 paid — $74,400",                date: "Feb 10" },
    ],
  },
  {
    id: "c2",
    name: "Pinecrest Hospitality Group",
    industry: "Hospitality",
    city: "Austin",
    state: "TX",
    stage: "prospect",
    phone: "(512) 555-0900",
    email: "av@pinecrest.com",
    website: "pinecrestgroup.com",
    billingAddress: "905 Congress Ave, Austin, TX 78701",
    serviceAddress: "905 Congress Ave, Austin, TX 78701",
    openPipeline: 212000,
    contactsCount: 3,
    activeProjects: 0,
    totalRevenue: 106000,
    jobsCompleted: 1,
    notes: "Evaluating vendors for a major lobby renovation. Marcus Bell confirmed $200k+ budget. They have 6 properties — strong potential for rollout contract.",
    contacts: [
      { id: "p2",  name: "Marcus Bell",    role: "Decision Maker", phone: "(512) 555-0911", email: "mbell@pinecrest.com" },
      { id: "pc3", name: "Tanya Reeves",   role: "Billing Contact", phone: "(512) 555-0922", email: "treeves@pinecrest.com" },
      { id: "pc4", name: "Omar Hassan",    role: "Site Contact",    phone: "(512) 555-0955", email: "ohassan@pinecrest.com" },
    ],
    opportunities: [
      { id: "AV-238", title: "Lobby video wall (7×3 LED)", stage: "qualified", value: 212000, closeDate: "Jul 12" },
    ],
    projects: [],
    invoices: [
      { id: "i8",  number: "INV-04790", amount: 106000, status: "paid", date: "Apr 20" },
    ],
    activityFeed: [
      { type: "call",  description: "Call — intro call with Marcus Bell",         date: "Jun 01" },
      { type: "quote", description: "Quote Q-2026-0417 sent — $212,000",          date: "May 31" },
      { type: "call",  description: "Call — confirmed budget and next steps",      date: "May 20" },
      { type: "contact", description: "Omar Hassan added as site contact",         date: "May 15" },
      { type: "invoice", description: "INV-04790 paid — $106,000",                date: "Apr 20" },
    ],
  },
  {
    id: "c3",
    name: "Helio Health Systems",
    industry: "Healthcare",
    city: "Denver",
    state: "CO",
    stage: "active",
    phone: "(303) 555-2200",
    email: "facilities@heliohealth.org",
    website: "heliohealth.org",
    billingAddress: "1719 E 19th Ave, Denver, CO 80218",
    serviceAddress: "1719 E 19th Ave, Denver, CO 80218",
    openPipeline: 226000,
    contactsCount: 4,
    activeProjects: 1,
    totalRevenue: 248000,
    jobsCompleted: 3,
    notes: "Preferred vendor for AV across 3 campuses. Priya Anand coordinates all scheduling. POs require 2-week lead time through their procurement portal.",
    contacts: [
      { id: "p3",  name: "Priya Anand",    role: "Site Contact",    phone: "(303) 555-2230", email: "panand@heliohealth.org" },
      { id: "pc5", name: "Dr. Kwame Asante", role: "Decision Maker", phone: "(303) 555-2244", email: "kasante@heliohealth.org" },
      { id: "pc6", name: "Lisa Huang",      role: "Billing Contact", phone: "(303) 555-2201", email: "ap@heliohealth.org" },
      { id: "pc7", name: "Ben Travers",     role: "Site Contact",    phone: "(303) 555-2218", email: "btravers@heliohealth.org" },
    ],
    opportunities: [
      { id: "AV-235", title: "Surgical center A/V overhaul",  stage: "proposal", value: 148000, closeDate: "Jul 02" },
      { id: "AV-210", title: "Telehealth carts (×24)",         stage: "lead",     value: 78000,  closeDate: "Aug 11" },
    ],
    projects: [
      { id: "pr2", title: "Surgical center overhaul", status: "Procurement", startDate: "May 06" },
    ],
    invoices: [
      { id: "i4",  number: "INV-04806", amount: 74000,  status: "overdue", date: "May 18" },
      { id: "ip3", number: "INV-04768", amount: 88000,  status: "paid",    date: "Jan 22" },
      { id: "ip4", number: "INV-04731", amount: 62400,  status: "paid",    date: "Sep 14" },
    ],
    activityFeed: [
      { type: "quote",   description: "Quote Q-2026-0412 sent — $148,000",         date: "May 18" },
      { type: "project", description: "Surgical center — procurement phase started", date: "May 06" },
      { type: "invoice", description: "INV-04806 overdue — $74,000",                date: "May 18" },
      { type: "call",    description: "Call — reviewed scope with Priya",           date: "May 02" },
      { type: "invoice", description: "INV-04768 paid — $88,000",                  date: "Jan 22" },
    ],
  },
  {
    id: "c4",
    name: "Quay Residential",
    industry: "Real Estate",
    city: "Miami",
    state: "FL",
    stage: "active",
    phone: "(305) 555-1100",
    email: "projects@quay.dev",
    website: "quay.dev",
    billingAddress: "1408 Bayshore Dr, Miami, FL 33132",
    serviceAddress: "1408 Bayshore Dr, Miami, FL 33132",
    openPipeline: 0,
    contactsCount: 2,
    activeProjects: 1,
    totalRevenue: 96400,
    jobsCompleted: 2,
    notes: "Boutique residential developer. Ongoing smart home integration on luxury builds. Theodore Fox is both the developer contact and end-user.",
    contacts: [
      { id: "p4",  name: "Theodore Fox",   role: "Decision Maker", phone: "(305) 555-1108", email: "tfox@quay.dev" },
      { id: "pc8", name: "Camille Dupree", role: "Billing Contact", phone: "(305) 555-1120", email: "accounts@quay.dev" },
    ],
    opportunities: [],
    projects: [
      { id: "pr3", title: "Smart home — Quay residence", status: "Commission", startDate: "Apr 28" },
    ],
    invoices: [
      { id: "i1",  number: "INV-04812", amount: 48200, status: "sent",    date: "Jun 01" },
      { id: "ip5", number: "INV-04809", amount: 48200, status: "paid",    date: "May 01" },
    ],
    activityFeed: [
      { type: "invoice", description: "INV-04812 sent — $48,200",                    date: "Jun 01" },
      { type: "project", description: "Smart home — commissioning phase started",     date: "Apr 28" },
      { type: "invoice", description: "INV-04809 paid — $48,200 (deposit)",          date: "May 01" },
      { type: "call",    description: "Call — commissioning walkthrough scheduled",   date: "Apr 20" },
      { type: "contact", description: "Camille Dupree added as billing contact",      date: "Mar 15" },
    ],
  },
  {
    id: "c5",
    name: "Arden & Loom Studios",
    industry: "Other",
    city: "Los Angeles",
    state: "CA",
    stage: "prospect",
    phone: "(323) 555-7700",
    email: "production@ardenloom.tv",
    website: "ardenloom.tv",
    billingAddress: "5200 Lankershim Blvd, Los Angeles, CA 91601",
    serviceAddress: "5200 Lankershim Blvd, Los Angeles, CA 91601",
    openPipeline: 142800,
    contactsCount: 2,
    activeProjects: 1,
    totalRevenue: 35700,
    jobsCompleted: 1,
    notes: "Indie production studio looking to upgrade control room for sound stage 3. Budget TBD — Lena mentioned possible Phase 2 expansion for stages 1 & 2.",
    contacts: [
      { id: "p5",  name: "Lena Romero",   role: "Decision Maker", phone: "(323) 555-7741", email: "lena@ardenloom.tv" },
      { id: "pc9", name: "Finn Castillo", role: "Site Contact",    phone: "(323) 555-7759", email: "fcastillo@ardenloom.tv" },
    ],
    opportunities: [
      { id: "AV-230", title: "Sound stage 3 — control room", stage: "qualified", value: 142800, closeDate: "Aug 04" },
    ],
    projects: [
      { id: "pr4", title: "Sound stage 3 control room", status: "Design", startDate: "Jun 01" },
    ],
    invoices: [
      { id: "i7", number: "INV-04795", amount: 35700, status: "paid", date: "Apr 28" },
    ],
    activityFeed: [
      { type: "quote",   description: "Quote Q-2026-0410 drafted — $142,800",   date: "Jun 03" },
      { type: "project", description: "Sound stage 3 — design phase started",   date: "Jun 01" },
      { type: "call",    description: "Call — requirements gathering with Lena", date: "May 28" },
      { type: "call",    description: "Call — intro & facility walkthrough",     date: "May 10" },
      { type: "invoice", description: "INV-04795 paid — $35,700",               date: "Apr 28" },
    ],
  },
  {
    id: "c6",
    name: "Halcyon Public Schools",
    industry: "Education",
    city: "Portland",
    state: "OR",
    stage: "active",
    phone: "(503) 555-4400",
    email: "purchasing@halcyon.k12.or.us",
    website: "halcyon.k12.or.us",
    billingAddress: "1010 SE Powell Blvd, Portland, OR 97202",
    serviceAddress: "Multiple — per site",
    openPipeline: 617000,
    contactsCount: 3,
    activeProjects: 1,
    totalRevenue: 144000,
    jobsCompleted: 2,
    notes: "District-wide AV standardization contract in motion. Damon Reyes approves all POs. Invoices must go through their e-procurement portal. 14 schools total.",
    contacts: [
      { id: "p6",   name: "Damon Reyes",   role: "Billing Contact", phone: "(503) 555-4422", email: "dreyes@halcyon.k12.or.us" },
      { id: "pc10", name: "Jill Oberg",    role: "Decision Maker",  phone: "(503) 555-4431", email: "joberg@halcyon.k12.or.us" },
      { id: "pc11", name: "Marcus Trout",  role: "Site Contact",    phone: "(503) 555-4450", email: "mtrout@halcyon.k12.or.us" },
    ],
    opportunities: [
      { id: "AV-229", title: "District-wide classroom standardization", stage: "lead",      value: 521000, closeDate: "Sep 30" },
      { id: "AV-212", title: "Auditorium projection + line array",      stage: "qualified", value: 96000,  closeDate: "Jul 28" },
    ],
    projects: [
      { id: "pr6", title: "Auditorium AV — Halcyon HS", status: "Install", startDate: "Apr 01" },
    ],
    invoices: [
      { id: "i5",   number: "INV-04802", amount: 48000, status: "paid",    date: "May 12" },
      { id: "ip6",  number: "INV-04766", amount: 62000, status: "paid",    date: "Jan 08" },
      { id: "ip7",  number: "INV-04740", amount: 34000, status: "paid",    date: "Aug 22" },
    ],
    activityFeed: [
      { type: "invoice", description: "INV-04802 paid — $48,000",                     date: "Jun 05" },
      { type: "project", description: "Auditorium AV — install phase started",         date: "May 30" },
      { type: "call",    description: "Call — PO approval discussion with Damon",      date: "May 12" },
      { type: "quote",   description: "Quote Q-2026-0409 sent — $96,000",              date: "Apr 28" },
      { type: "invoice", description: "INV-04766 paid — $62,000",                     date: "Jan 08" },
    ],
  },
  {
    id: "c7",
    name: "Vertex Capital Partners",
    industry: "Other",
    city: "Chicago",
    state: "IL",
    stage: "active",
    phone: "(312) 555-9000",
    email: "facilities@vertexcap.io",
    website: "vertexcap.io",
    billingAddress: "200 W Madison St, Chicago, IL 60606",
    serviceAddress: "200 W Madison St, Chicago, IL 60606",
    openPipeline: 318900,
    contactsCount: 4,
    activeProjects: 1,
    totalRevenue: 503000,
    jobsCompleted: 5,
    notes: "High-priority account. Iris Wang is the final decision-maker. Noor Saleh handles all technical spec review. Fast-growing firm — new floor every 12–18 months.",
    contacts: [
      { id: "p7",   name: "Iris Wang",   role: "Decision Maker", phone: "(312) 555-9090", email: "iwang@vertexcap.io" },
      { id: "p9",   name: "Noor Saleh",  role: "Site Contact",   phone: "(312) 555-9111", email: "nsaleh@vertexcap.io" },
      { id: "pc12", name: "Cora Simms",  role: "Billing Contact", phone: "(312) 555-9022", email: "ap@vertexcap.io" },
      { id: "pc13", name: "Derek Lane",  role: "Influencer",     phone: "(312) 555-9044", email: "dlane@vertexcap.io" },
    ],
    opportunities: [
      { id: "AV-241", title: "Boardroom AV refresh — 14F",    stage: "proposal", value: 84500,  closeDate: "Jun 24" },
      { id: "AV-218", title: "Trading floor latency upgrade", stage: "lead",     value: 234400, closeDate: "Aug 22" },
    ],
    projects: [
      { id: "pr5", title: "Vertex 14F boardroom", status: "Closeout", startDate: "Mar 12" },
    ],
    invoices: [
      { id: "i2",   number: "INV-04811", amount: 42250,  status: "partial",  date: "May 28" },
      { id: "ip8",  number: "INV-04788", amount: 122000, status: "paid",     date: "Mar 30" },
      { id: "ip9",  number: "INV-04760", amount: 98000,  status: "paid",     date: "Oct 18" },
    ],
    activityFeed: [
      { type: "invoice", description: "INV-04811 partial payment — $42,250",    date: "Jun 08" },
      { type: "project", description: "Vertex 14F boardroom — closeout started", date: "Jun 04" },
      { type: "quote",   description: "Quote Q-2026-0406 sent — $234,400",       date: "May 25" },
      { type: "call",    description: "Call — trading floor scope review",        date: "May 18" },
      { type: "invoice", description: "INV-04788 paid — $122,000",               date: "Mar 30" },
    ],
  },
  {
    id: "c8",
    name: "Cinder & Oak Hospitality",
    industry: "Hospitality",
    city: "Nashville",
    state: "TN",
    stage: "inactive",
    phone: "(615) 555-3200",
    email: "ops@cinderoak.co",
    website: "cinderoak.co",
    billingAddress: "112 3rd Ave S, Nashville, TN 37201",
    serviceAddress: "112 3rd Ave S, Nashville, TN 37201",
    openPipeline: 0,
    contactsCount: 1,
    activeProjects: 0,
    totalRevenue: 19200,
    jobsCompleted: 0,
    notes: "Lost bid in May — budget cut by new ownership. New location opening in Q4, Nashville East Side. Follow up September with updated pricing.",
    contacts: [
      { id: "p8", name: "Hugo Albright", role: "Decision Maker", phone: "(615) 555-3201", email: "hugo@cinderoak.co" },
    ],
    opportunities: [],
    projects: [],
    invoices: [
      { id: "i6", number: "INV-04799", amount: 19200, status: "overdue", date: "May 04" },
    ],
    activityFeed: [
      { type: "call",    description: "Call — project cancelled, budget cut",     date: "May 22" },
      { type: "quote",   description: "Quote Q-2026-0402 expired — $38,400",      date: "Apr 28" },
      { type: "call",    description: "Call — walked through A/V requirements",   date: "Apr 10" },
      { type: "contact", description: "Hugo Albright added as primary contact",   date: "Mar 28" },
      { type: "invoice", description: "INV-04799 overdue — $19,200",              date: "May 04" },
    ],
  },
  {
    id: "c9",
    name: "Meridian Transit Authority",
    industry: "Government",
    city: "Phoenix",
    state: "AZ",
    stage: "prospect",
    phone: "(602) 555-8800",
    email: "av@meridiantransit.gov",
    website: "meridiantransit.gov",
    billingAddress: "302 N 1st Ave, Phoenix, AZ 85003",
    serviceAddress: "Multiple — 12 transit stations",
    openPipeline: 380000,
    contactsCount: 3,
    activeProjects: 0,
    totalRevenue: 0,
    jobsCompleted: 0,
    notes: "RFP response submitted May 30. Covers digital signage and PA upgrades across 12 light rail stations. Decision expected early August. Requires prevailing wage compliance.",
    contacts: [
      { id: "pc14", name: "Sandra Kowalski", role: "Decision Maker",  phone: "(602) 555-8812", email: "skowalski@meridiantransit.gov" },
      { id: "pc15", name: "Tom Bracken",     role: "Site Contact",    phone: "(602) 555-8831", email: "tbracken@meridiantransit.gov" },
      { id: "pc16", name: "Vivian Marsh",    role: "Billing Contact", phone: "(602) 555-8800", email: "procurement@meridiantransit.gov" },
    ],
    opportunities: [
      { id: "AV-244", title: "Light rail digital signage + PA (12 stations)", stage: "proposal", value: 380000, closeDate: "Aug 15" },
    ],
    projects: [],
    invoices: [],
    activityFeed: [
      { type: "quote",   description: "RFP response submitted — $380,000",          date: "May 30" },
      { type: "call",    description: "Call — pre-bid site walkthrough",             date: "May 14" },
      { type: "call",    description: "Call — RFP clarification with Tom Bracken",  date: "May 08" },
      { type: "contact", description: "Sandra Kowalski added as decision maker",     date: "Apr 29" },
      { type: "call",    description: "Call — intro meeting, confirmed RFP timeline", date: "Apr 22" },
    ],
  },
  {
    id: "c10",
    name: "Pacific Ridge Manufacturing",
    industry: "Manufacturing",
    city: "Seattle",
    state: "WA",
    stage: "active",
    phone: "(206) 555-4400",
    email: "facilities@pacificridge.com",
    website: "pacificridge.com",
    billingAddress: "4801 Airport Way S, Seattle, WA 98108",
    serviceAddress: "4801 Airport Way S, Seattle, WA 98108",
    openPipeline: 88200,
    contactsCount: 3,
    activeProjects: 1,
    totalRevenue: 142500,
    jobsCompleted: 2,
    notes: "Distribution and light manufacturing facility. Paging system upgrade completed last year. Now expanding with warehouse conference rooms and visitor briefing center.",
    contacts: [
      { id: "pc17", name: "Grant Yuen",    role: "Decision Maker", phone: "(206) 555-4411", email: "gyuen@pacificridge.com" },
      { id: "pc18", name: "Pam Holbrook",  role: "Billing Contact", phone: "(206) 555-4400", email: "ap@pacificridge.com" },
      { id: "pc19", name: "Derek Stroud",  role: "Site Contact",   phone: "(206) 555-4422", email: "dstroud@pacificridge.com" },
    ],
    opportunities: [
      { id: "AV-246", title: "Visitor briefing center & conf rooms", stage: "proposal", value: 88200, closeDate: "Jul 08" },
    ],
    projects: [
      { id: "pr8", title: "Visitor briefing center AV", status: "Design", startDate: "May 20" },
    ],
    invoices: [
      { id: "ip10", number: "INV-04783", amount: 88000,  status: "paid",    date: "Mar 05" },
      { id: "ip11", number: "INV-04751", amount: 54500,  status: "paid",    date: "Oct 10" },
    ],
    activityFeed: [
      { type: "quote",   description: "Quote Q-2026-0420 sent — $88,200",           date: "Jun 02" },
      { type: "project", description: "Visitor briefing center — design started",   date: "May 20" },
      { type: "call",    description: "Call — scope review with Grant Yuen",        date: "May 16" },
      { type: "invoice", description: "INV-04783 paid — $88,000",                  date: "Mar 05" },
      { type: "contact", description: "Derek Stroud added as site contact",         date: "Feb 14" },
    ],
  },
];

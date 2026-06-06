export type ProjectStatus = "quoted" | "scheduled" | "in-progress" | "on-hold" | "completed" | "cancelled";
export type ProjectType = "project" | "work-order";

export interface ProjectRecord {
  id: string;
  code: string;
  name: string;
  customer: string;
  siteAddress: string;
  status: ProjectStatus;
  type: ProjectType;
  contractValue: number;
  budgetedCost: number;
  actualCost: number;
  budgetedHours: number;
  loggedHours: number;
  tasksTotal: number;
  tasksDone: number;
  startDate: string;
  targetEndDate: string;
  pm: string;
  sourceQuote: string | null;
  opportunityRef: string | null;
}

export const statusMeta: Record<ProjectStatus, { label: string; cls: string }> = {
  "quoted":      { label: "Quoted",      cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "scheduled":   { label: "Scheduled",   cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  "in-progress": { label: "In Progress", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  "on-hold":     { label: "On Hold",     cls: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  "completed":   { label: "Completed",   cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  "cancelled":   { label: "Cancelled",   cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

export const STATUS_OPTIONS: Array<{ value: ProjectStatus | "all"; label: string }> = [
  { value: "all",         label: "All" },
  { value: "quoted",      label: "Quoted" },
  { value: "scheduled",   label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "on-hold",     label: "On Hold" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

export const PROJECTS: ProjectRecord[] = [
  {
    id: "pr1", code: "AV-2026-014", name: "Penthouse Cinema Build",
    customer: "Northbeam Architects", siteAddress: "44 Berry St, Brooklyn, NY 11211",
    status: "in-progress", type: "project",
    contractValue: 184500, budgetedCost: 118000, actualCost: 96400,
    budgetedHours: 420, loggedHours: 268,
    tasksTotal: 24, tasksDone: 15,
    startDate: "May 01, 2026", targetEndDate: "Jul 09, 2026", pm: "MO",
    sourceQuote: "Q-2026-0415", opportunityRef: "AV-226 · Penthouse cinema build",
  },
  {
    id: "pr2", code: "AV-2026-011", name: "Surgical Center A/V Overhaul",
    customer: "Helio Health Systems", siteAddress: "1719 E 19th Ave, Denver, CO 80206",
    status: "in-progress", type: "project",
    contractValue: 148000, budgetedCost: 96000, actualCost: 41200,
    budgetedHours: 380, loggedHours: 108,
    tasksTotal: 32, tasksDone: 9,
    startDate: "Apr 15, 2026", targetEndDate: "Aug 21, 2026", pm: "RT",
    sourceQuote: "Q-2026-0412", opportunityRef: "AV-235 · Surgical center A/V overhaul",
  },
  {
    id: "pr3", code: "AV-2026-009", name: "Smart Home — Quay Residence",
    customer: "Quay Residential", siteAddress: "1408 Bayshore Dr, Miami, FL 33131",
    status: "in-progress", type: "project",
    contractValue: 96400, budgetedCost: 62000, actualCost: 58800,
    budgetedHours: 240, loggedHours: 214,
    tasksTotal: 18, tasksDone: 16,
    startDate: "Mar 20, 2026", targetEndDate: "Jun 19, 2026", pm: "SN",
    sourceQuote: null, opportunityRef: "AV-233 · Primary residence — full smart home",
  },
  {
    id: "pr4", code: "AV-2026-005", name: "Sound Stage 3 Control Room",
    customer: "Arden & Loom Studios", siteAddress: "5200 Lankershim Blvd, Los Angeles, CA 91601",
    status: "scheduled", type: "project",
    contractValue: 142800, budgetedCost: 92000, actualCost: 0,
    budgetedHours: 340, loggedHours: 0,
    tasksTotal: 28, tasksDone: 0,
    startDate: "Jun 15, 2026", targetEndDate: "Oct 02, 2026", pm: "AV",
    sourceQuote: "Q-2026-0410", opportunityRef: "AV-230 · Sound stage 3 — control room",
  },
  {
    id: "pr5", code: "AV-2025-138", name: "Vertex 14F Boardroom",
    customer: "Vertex Capital Partners", siteAddress: "200 W Madison St, Chicago, IL 60606",
    status: "completed", type: "project",
    contractValue: 84500, budgetedCost: 54000, actualCost: 52800,
    budgetedHours: 180, loggedHours: 176,
    tasksTotal: 16, tasksDone: 16,
    startDate: "Jan 10, 2026", targetEndDate: "Jun 12, 2026", pm: "EM",
    sourceQuote: "Q-2026-0418", opportunityRef: "AV-241 · Boardroom AV refresh — 14F",
  },
  {
    id: "pr6", code: "AV-2025-132", name: "Auditorium AV — Halcyon HS",
    customer: "Halcyon Public Schools", siteAddress: "1010 SE Powell Blvd, Portland, OR 97202",
    status: "in-progress", type: "project",
    contractValue: 96000, budgetedCost: 62000, actualCost: 33700,
    budgetedHours: 290, loggedHours: 156,
    tasksTotal: 22, tasksDone: 12,
    startDate: "Feb 28, 2026", targetEndDate: "Aug 04, 2026", pm: "MO",
    sourceQuote: null, opportunityRef: "AV-212 · Auditorium projection + line array",
  },
  {
    id: "pr7", code: "AV-2026-016", name: "Lobby Video Wall (7×3 LED)",
    customer: "Pinecrest Hospitality Group", siteAddress: "905 Congress Ave, Austin, TX 78701",
    status: "quoted", type: "project",
    contractValue: 212000, budgetedCost: 139000, actualCost: 0,
    budgetedHours: 480, loggedHours: 0,
    tasksTotal: 0, tasksDone: 0,
    startDate: "—", targetEndDate: "Sep 30, 2026", pm: "JK",
    sourceQuote: "Q-2026-0417", opportunityRef: "AV-238 · Lobby video wall (7×3 LED)",
  },
  {
    id: "pr8", code: "AV-2026-017", name: "Vertex Boardroom Rack Install",
    customer: "Vertex Capital Partners", siteAddress: "200 W Madison St, Chicago, IL 60606",
    status: "scheduled", type: "work-order",
    contractValue: 8400, budgetedCost: 4200, actualCost: 0,
    budgetedHours: 24, loggedHours: 0,
    tasksTotal: 4, tasksDone: 0,
    startDate: "Jun 10, 2026", targetEndDate: "Jun 10, 2026", pm: "RT",
    sourceQuote: null, opportunityRef: null,
  },
  {
    id: "pr9", code: "AV-2026-018", name: "Northbeam Projector Calibration",
    customer: "Northbeam Architects", siteAddress: "44 Berry St, Brooklyn, NY 11211",
    status: "in-progress", type: "work-order",
    contractValue: 2200, budgetedCost: 800, actualCost: 400,
    budgetedHours: 8, loggedHours: 4,
    tasksTotal: 3, tasksDone: 1,
    startDate: "Jun 04, 2026", targetEndDate: "Jun 04, 2026", pm: "MO",
    sourceQuote: null, opportunityRef: null,
  },
  {
    id: "pr10", code: "AV-2026-003", name: "Restaurant POS + Audio Zones",
    customer: "Cinder & Oak Hospitality", siteAddress: "112 3rd Ave S, Nashville, TN 37201",
    status: "cancelled", type: "project",
    contractValue: 38400, budgetedCost: 22000, actualCost: 0,
    budgetedHours: 120, loggedHours: 0,
    tasksTotal: 0, tasksDone: 0,
    startDate: "—", targetEndDate: "—", pm: "JK",
    sourceQuote: "Q-2026-0402", opportunityRef: "AV-222 · Restaurant POS + audio zones",
  },
  {
    id: "pr11", code: "AV-2025-129", name: "Outdoor Cabana Audio",
    customer: "Quay Residential", siteAddress: "1408 Bayshore Dr, Miami, FL 33131",
    status: "completed", type: "work-order",
    contractValue: 12800, budgetedCost: 7400, actualCost: 7200,
    budgetedHours: 40, loggedHours: 38,
    tasksTotal: 6, tasksDone: 6,
    startDate: "Apr 10, 2026", targetEndDate: "May 14, 2026", pm: "SN",
    sourceQuote: null, opportunityRef: "AV-214 · Outdoor cabana audio",
  },
  {
    id: "pr12", code: "AV-2026-019", name: "Trading Floor Latency Upgrade",
    customer: "Vertex Capital Partners", siteAddress: "200 W Madison St, Chicago, IL 60606",
    status: "quoted", type: "project",
    contractValue: 234400, budgetedCost: 152000, actualCost: 0,
    budgetedHours: 520, loggedHours: 0,
    tasksTotal: 0, tasksDone: 0,
    startDate: "—", targetEndDate: "Aug 22, 2026", pm: "RT",
    sourceQuote: "Q-2026-0407", opportunityRef: "AV-218 · Trading floor latency upgrade",
  },
  {
    id: "pr13", code: "AV-2026-020", name: "District-Wide Classroom AV",
    customer: "Halcyon Public Schools", siteAddress: "1010 SE Powell Blvd, Portland, OR 97202",
    status: "on-hold", type: "project",
    contractValue: 521000, budgetedCost: 338000, actualCost: 0,
    budgetedHours: 1200, loggedHours: 0,
    tasksTotal: 48, tasksDone: 0,
    startDate: "—", targetEndDate: "Dec 15, 2026", pm: "EM",
    sourceQuote: null, opportunityRef: "AV-229 · District-wide classroom standardization",
  },
];

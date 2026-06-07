import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import {
  Briefcase, ChevronDown, Mail, Pencil, Phone, Search, TriangleAlert, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team · Port City Sound & Security" }] }),
  component: TeamPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRole = "field_tech" | "lead_tech" | "project_manager" | "admin" | "subcontractor";
type PayType = "hourly" | "salary";
type Availability = "full_time" | "part_time" | "on_call" | "inactive";

interface AssignedJob {
  id: string;
  name: string;
  type: "project" | "work_order";
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: MemberRole;
  email: string;
  phone: string;
  avatarInitials: string;
  skills: string[];
  certifications: string[];
  payRate: number;
  payType: PayType;
  availability: Availability;
  assignedJobsCount: number;
  startDate: string;
  isActive: boolean;
  assignedJobs: AssignedJob[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const roleMeta: Record<MemberRole, { label: string; cls: string; gradient: string }> = {
  admin:           { label: "Admin",          cls: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",    gradient: "135deg, oklch(0.52 0.20 264), oklch(0.40 0.22 280)" },
  lead_tech:       { label: "Lead Tech",      cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400",    gradient: "135deg, oklch(0.52 0.20 290), oklch(0.40 0.22 306)" },
  project_manager: { label: "Project Mgr",    cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400",             gradient: "135deg, oklch(0.52 0.16 218), oklch(0.40 0.18 234)" },
  field_tech:      { label: "Field Tech",     cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", gradient: "135deg, oklch(0.52 0.16 162), oklch(0.40 0.18 178)" },
  subcontractor:   { label: "Subcontractor",  cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400",    gradient: "135deg, oklch(0.60 0.18 46), oklch(0.46 0.20 62)"   },
};

const availabilityMeta: Record<Availability, { label: string; cls: string }> = {
  full_time: { label: "Full Time", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  part_time: { label: "Part Time", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  on_call:   { label: "On Call",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  inactive:  { label: "Inactive",  cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const SKILL_SUGGESTIONS = [
  "CCTV", "Access Control", "Low Voltage", "Networking",
  "Audio/Video", "Fire Alarm", "Intercoms", "Structured Cabling",
];

const CERT_SUGGESTIONS = [
  "NICET Level II", "ESA Level 1", "OSHA 10",
  "CompTIA Network+", "Manufacturer Certifications",
];

const ROLE_OPTIONS: Array<{ value: MemberRole | "all"; label: string }> = [
  { value: "all",            label: "All Roles" },
  { value: "admin",          label: "Admin" },
  { value: "lead_tech",      label: "Lead Tech" },
  { value: "project_manager", label: "Project Manager" },
  { value: "field_tech",     label: "Field Tech" },
  { value: "subcontractor",  label: "Subcontractor" },
];

const AVAIL_OPTIONS: Array<{ value: Availability | "all"; label: string }> = [
  { value: "all",       label: "All Availability" },
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "on_call",   label: "On Call" },
  { value: "inactive",  label: "Inactive" },
];

const jobTypeMeta: Record<"project" | "work_order", { label: string; cls: string }> = {
  project:    { label: "Project",    cls: "bg-primary/10 text-primary" },
  work_order: { label: "Work Order", cls: "bg-slate-500/10 text-slate-500 dark:text-slate-400" },
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "tm1", name: "Justin Shader", role: "admin",
    email: "justin@portcitysecurity.com", phone: "(618) 555-0100",
    avatarInitials: "JS",
    skills: ["CCTV", "Access Control", "Low Voltage", "Networking", "Audio/Video"],
    certifications: ["ESA Level 1", "OSHA 10"],
    payRate: 0, payType: "salary",
    availability: "full_time", assignedJobsCount: 6,
    startDate: "2019-01-15", isActive: true,
    assignedJobs: [
      { id: "pr1", name: "Penthouse Cinema Build",            type: "project",    status: "In Progress" },
      { id: "pr2", name: "Surgical Center A/V Overhaul",      type: "project",    status: "In Progress" },
      { id: "wo1", name: "Access Panel Repair — Metro Loft",  type: "work_order", status: "Scheduled"   },
    ],
  },
  {
    id: "tm2", name: "Marcus Okafor", role: "lead_tech",
    email: "mokafor@portcitysecurity.com", phone: "(618) 555-0212",
    avatarInitials: "MO",
    skills: ["CCTV", "Access Control", "Fire Alarm", "Structured Cabling"],
    certifications: ["NICET Level II", "ESA Level 1", "OSHA 10"],
    payRate: 38, payType: "hourly",
    availability: "full_time", assignedJobsCount: 4,
    startDate: "2021-03-08", isActive: true,
    assignedJobs: [
      { id: "pr1", name: "Penthouse Cinema Build",                type: "project",    status: "In Progress" },
      { id: "wo2", name: "Camera System — Ridgeline Warehouse",   type: "work_order", status: "In Progress" },
      { id: "wo3", name: "Access Control — Harbor Office",        type: "work_order", status: "Scheduled"   },
    ],
  },
  {
    id: "tm3", name: "Rachel Torres", role: "lead_tech",
    email: "rtorres@portcitysecurity.com", phone: "(618) 555-0334",
    avatarInitials: "RT",
    skills: ["Audio/Video", "Networking", "Low Voltage", "Intercoms"],
    certifications: ["ESA Level 1", "CompTIA Network+"],
    payRate: 36, payType: "hourly",
    availability: "full_time", assignedJobsCount: 3,
    startDate: "2022-06-20", isActive: true,
    assignedJobs: [
      { id: "pr2", name: "Surgical Center A/V Overhaul",       type: "project",    status: "In Progress" },
      { id: "wo4", name: "Intercom Upgrade — Elm Street Plaza", type: "work_order", status: "Scheduled"   },
    ],
  },
  {
    id: "tm4", name: "Devon Parks", role: "field_tech",
    email: "dparks@portcitysecurity.com", phone: "(618) 555-0445",
    avatarInitials: "DP",
    skills: ["CCTV", "Structured Cabling", "Low Voltage"],
    certifications: ["OSHA 10"],
    payRate: 28, payType: "hourly",
    availability: "full_time", assignedJobsCount: 2,
    startDate: "2023-09-11", isActive: true,
    assignedJobs: [
      { id: "pr1", name: "Penthouse Cinema Build",             type: "project",    status: "In Progress" },
      { id: "wo2", name: "Camera System — Ridgeline Warehouse", type: "work_order", status: "In Progress" },
    ],
  },
  {
    id: "tm5", name: "Sierra Nash", role: "field_tech",
    email: "snash@portcitysecurity.com", phone: "(618) 555-0556",
    avatarInitials: "SN",
    skills: ["Access Control", "Audio/Video", "Networking"],
    certifications: ["ESA Level 1", "Manufacturer Certifications"],
    payRate: 26, payType: "hourly",
    availability: "part_time", assignedJobsCount: 1,
    startDate: "2024-02-26", isActive: true,
    assignedJobs: [
      { id: "pr3", name: "Smart Home — Quay Residence", type: "project", status: "In Progress" },
    ],
  },
  {
    id: "tm6", name: "Tony Ricci Electric", role: "subcontractor",
    email: "tony@riccielectric.com", phone: "(618) 555-0667",
    avatarInitials: "TR",
    skills: ["Low Voltage", "Structured Cabling", "Fire Alarm"],
    certifications: ["NICET Level II"],
    payRate: 95, payType: "hourly",
    availability: "on_call", assignedJobsCount: 1,
    startDate: "2023-04-03", isActive: true,
    assignedJobs: [
      { id: "pr4", name: "Sound Stage 3 Control Room", type: "project", status: "Scheduled" },
    ],
  },
];

// ─── Zod schema ───────────────────────────────────────────────────────────────

const MemberFormSchema = z.object({
  name:           z.string().min(1, "Required"),
  role:           z.enum(["field_tech", "lead_tech", "project_manager", "admin", "subcontractor"]),
  email:          z.string().email("Invalid email").or(z.literal("")),
  phone:          z.string(),
  avatarInitials: z.string().min(1, "Required").max(3, "Max 3 characters"),
  isActive:       z.boolean(),
  skills:         z.array(z.string()),
  certifications: z.array(z.string()),
  payType:        z.enum(["hourly", "salary"]),
  payRate:        z.coerce.number().min(0),
  availability:   z.enum(["full_time", "part_time", "on_call", "inactive"]),
  startDate:      z.string(),
});

type MemberFormValues = z.infer<typeof MemberFormSchema>;

const DEFAULT_VALUES: MemberFormValues = {
  name: "", role: "field_tech", email: "", phone: "",
  avatarInitials: "", isActive: true,
  skills: [], certifications: [],
  payType: "hourly", payRate: 0,
  availability: "full_time", startDate: "",
};

// ─── TeamAvatar ───────────────────────────────────────────────────────────────

function TeamAvatar({
  initials, role, className,
}: { initials: string; role: MemberRole; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-semibold text-white/95 shrink-0", className)}
      style={{ background: `linear-gradient(${roleMeta[role].gradient})` }}
    >
      {initials}
    </span>
  );
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({
  value, onChange, suggestions, placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const [showSugg, setShowSugg] = useState(false);

  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
  );

  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-medium text-primary">
              {t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="hover:text-destructive transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setShowSugg(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (input.trim()) add(input); }
        }}
        onFocus={() => setShowSugg(true)}
        onBlur={() => setTimeout(() => setShowSugg(false), 150)}
        placeholder={placeholder ?? "Type to add…"}
        className="h-7 w-full rounded-md border border-border bg-background px-2.5 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {showSugg && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              className="rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// ─── MemberDrawer ─────────────────────────────────────────────────────────────

interface MemberDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: TeamMember | null;
  onSave: (data: MemberFormValues, id: string | null) => void;
}

function MemberDrawer({ open, onOpenChange, member, onSave }: MemberDrawerProps) {
  const isNew = member === null;

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(MemberFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      member
        ? {
            name: member.name, role: member.role,
            email: member.email, phone: member.phone,
            avatarInitials: member.avatarInitials, isActive: member.isActive,
            skills: [...member.skills], certifications: [...member.certifications],
            payType: member.payType, payRate: member.payRate,
            availability: member.availability, startDate: member.startDate,
          }
        : DEFAULT_VALUES,
    );
  }, [open, member, form]);

  const watchedName = form.watch("name");
  useEffect(() => {
    if (!isNew) return;
    const parts = watchedName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return;
    const gen = parts.length >= 2
      ? ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    form.setValue("avatarInitials", gen, { shouldValidate: false });
  }, [watchedName, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = form.handleSubmit((data) => {
    onSave(data, member?.id ?? null);
    onOpenChange(false);
  });

  const fieldCls = "h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectCls = cn(fieldCls, "appearance-none pr-7 cursor-pointer");
  const labelCls = "mb-1 block text-[11.5px] font-medium text-foreground";
  const errorCls = "mt-0.5 text-[11px] text-destructive";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {member && (
              <TeamAvatar initials={member.avatarInitials} role={member.role} className="h-10 w-10 text-[14px]" />
            )}
            <div>
              <SheetTitle className="text-[15px] font-semibold leading-tight">
                {isNew ? "Add Team Member" : member.name}
              </SheetTitle>
              {!isNew && (
                <p className="text-[12px] text-muted-foreground">{roleMeta[member.role].label}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* 1 · Identity */}
              <div>
                <SectionLabel>Identity</SectionLabel>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} className={fieldCls} placeholder="Full name" />
                        </FormControl>
                        <FormMessage className={errorCls} />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Role <span className="text-destructive">*</span></FormLabel>
                        <div className="relative">
                          <FormControl>
                            <select {...field} className={selectCls}>
                              <option value="field_tech">Field Tech</option>
                              <option value="lead_tech">Lead Tech</option>
                              <option value="project_manager">Project Manager</option>
                              <option value="admin">Admin</option>
                              <option value="subcontractor">Subcontractor</option>
                            </select>
                          </FormControl>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelCls}>Email <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className={fieldCls} placeholder="email@domain.com" />
                          </FormControl>
                          <FormMessage className={errorCls} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelCls}>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" className={fieldCls} placeholder="(555) 000-0000" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-end gap-3">
                    <FormField
                      control={form.control}
                      name="avatarInitials"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className={labelCls}>Initials <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={3}
                              className={cn(fieldCls, "uppercase")}
                              placeholder="JS"
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage className={errorCls} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pb-1 space-y-0">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-[12.5px] text-foreground cursor-pointer select-none m-0">
                            Active
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 2 · Skills & Certifications */}
              <div>
                <SectionLabel>Skills &amp; Certifications</SectionLabel>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Skills</FormLabel>
                        <FormControl>
                          <TagInput value={field.value} onChange={field.onChange} suggestions={SKILL_SUGGESTIONS} placeholder="Add skill…" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="certifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Certifications</FormLabel>
                        <FormControl>
                          <TagInput value={field.value} onChange={field.onChange} suggestions={CERT_SUGGESTIONS} placeholder="Add certification…" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* 3 · Compensation */}
              <div>
                <SectionLabel>Compensation</SectionLabel>
                <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11.5px] text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>This section is visible to Admin roles only. Role-based visibility will be enforced when authentication is implemented.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="payType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Pay Type <span className="text-destructive">*</span></FormLabel>
                        <div className="relative">
                          <FormControl>
                            <select {...field} className={selectCls}>
                              <option value="hourly">Hourly</option>
                              <option value="salary">Salary</option>
                            </select>
                          </FormControl>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="payRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Pay Rate <span className="text-destructive">*</span></FormLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                          <FormControl>
                            <Input {...field} type="number" min={0} step={0.01} className={cn(fieldCls, "pl-5")} placeholder="0.00" />
                          </FormControl>
                        </div>
                        <FormMessage className={errorCls} />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* 4 · Schedule & Availability */}
              <div>
                <SectionLabel>Schedule &amp; Availability</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Availability <span className="text-destructive">*</span></FormLabel>
                        <div className="relative">
                          <FormControl>
                            <select {...field} className={selectCls}>
                              <option value="full_time">Full Time</option>
                              <option value="part_time">Part Time</option>
                              <option value="on_call">On Call</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </FormControl>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className={fieldCls} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 5 · Assigned Jobs (edit only) */}
              {!isNew && member.assignedJobs.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <SectionLabel>Assigned Jobs</SectionLabel>
                    <ul className="space-y-2">
                      {member.assignedJobs.map((job) => {
                        const tm = jobTypeMeta[job.type];
                        return (
                          <li key={job.id} className="flex items-center gap-2.5 rounded-md border border-border bg-surface/40 px-3 py-2">
                            <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-[12.5px]">{job.name}</span>
                            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", tm.cls)}>{tm.label}</span>
                            <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">{job.status}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-md border border-border px-4 text-[12.5px] hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {isNew ? "Add Member" : "Save Changes"}
              </button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({ member, onEdit }: { member: TeamMember; onEdit: () => void }) {
  const rm = roleMeta[member.role];
  const am = availabilityMeta[member.availability];
  const visibleSkills = member.skills.slice(0, 3);
  const extraSkills = member.skills.length - 3;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <TeamAvatar initials={member.avatarInitials} role={member.role} className="h-10 w-10 text-[14px]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold leading-snug">{member.name}</span>
            {!member.isActive && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-500/15 text-slate-500 dark:text-slate-400">Inactive</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-medium", rm.cls)}>{rm.label}</span>
            <span className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-medium", am.cls)}>{am.label}</span>
          </div>
        </div>
      </div>

      {member.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleSkills.map((s) => (
            <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">{s}</span>
          ))}
          {extraSkills > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">+{extraSkills} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{member.assignedJobsCount} active {member.assignedJobsCount === 1 ? "job" : "jobs"}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>

      <div className="space-y-1 border-t border-border/60 pt-2.5">
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span>{member.phone}</span>
        </div>
      </div>
    </div>
  );
}

// ─── TeamPage ─────────────────────────────────────────────────────────────────

function TeamPage() {
  const { setMeta } = useMeta();
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");
  const [availFilter, setAvailFilter] = useState<Availability | "all">("all");
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [skillsPopOpen, setSkillsPopOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const openNew = useCallback(() => { setEditingMember(null); setDrawerOpen(true); }, []);
  const openEdit = useCallback((m: TeamMember) => { setEditingMember(m); setDrawerOpen(true); }, []);

  useEffect(() => {
    setMeta({
      title: "Team",
      subtitle: "Field technicians and staff",
      newLabel: "Add Member",
      onNew: openNew,
    });
  }, [setMeta, openNew]);

  const handleSave = useCallback((data: MemberFormValues, id: string | null) => {
    setMembers((prev) => {
      if (id === null) {
        const newMember: TeamMember = {
          ...data, id: `tm${Date.now()}`,
          assignedJobsCount: 0, assignedJobs: [],
        };
        return [...prev, newMember];
      }
      return prev.map((m) => m.id === id ? { ...m, ...data } : m);
    });
  }, []);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => m.skills.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (availFilter !== "all" && m.availability !== availFilter) return false;
      if (skillsFilter.length > 0 && !skillsFilter.some((s) => m.skills.includes(s))) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, search, roleFilter, availFilter, skillsFilter]);

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative min-w-[160px] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="h-7 w-full rounded-md border border-border bg-surface pl-7 pr-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as MemberRole | "all")}
          className={selectCls}
        >
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value as Availability | "all")}
          className={selectCls}
        >
          {AVAIL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Skills multi-select */}
        <Popover open={skillsPopOpen} onOpenChange={setSkillsPopOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
                skillsFilter.length > 0 && "border-primary/50 text-foreground",
              )}
            >
              Skills
              {skillsFilter.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                  {skillsFilter.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="space-y-0.5">
              {allSkills.map((skill) => (
                <label
                  key={skill}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-[12px] hover:bg-accent"
                >
                  <Checkbox
                    checked={skillsFilter.includes(skill)}
                    onCheckedChange={(checked) =>
                      setSkillsFilter(
                        checked
                          ? [...skillsFilter, skill]
                          : skillsFilter.filter((s) => s !== skill),
                      )
                    }
                  />
                  {skill}
                </label>
              ))}
              {skillsFilter.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSkillsFilter([])}
                  className="mt-1 w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Clear filter
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {filtered.length} of {members.length}
        </span>
      </div>

      {/* Card grid */}
      <div className="p-4">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} onEdit={() => openEdit(m)} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-[12.5px] text-muted-foreground">
            No team members match the current filters.
          </div>
        )}
      </div>

      <MemberDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        member={editingMember}
        onSave={handleSave}
      />
    </div>
  );
}

/*
  SCHEMA NOTES — team_members table
  id, tenant_id, user_id (FK to auth.users, nullable for subcontractors),
  name, role, email, phone, avatar_initials, skills (text[]),
  certifications (text[]), pay_rate, pay_type, availability,
  start_date, is_active, created_at, updated_at
*/

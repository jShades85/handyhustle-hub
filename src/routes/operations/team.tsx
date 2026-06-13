import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { createClient } from "@/lib/supabase/client";
import { cn, avatarGradient, avatarInitials } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";
import {
  Briefcase, ChevronDown, Mail, Pencil, Phone, TriangleAlert, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/ui/drawer-header";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { FormSelect } from "@/components/ui/form-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/operations/team")({
  head: () => ({ meta: [{ title: "Team · BearingPro" }] }),
  component: TeamPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Role   = Database["public"]["Tables"]["roles"]["Row"];
type Member = Database["public"]["Tables"]["user_profiles"]["Row"] & {
  roles: Pick<Role, "id" | "name" | "color"> | null;
};

type Availability = "full_time" | "part_time" | "on_call" | "inactive";

// ─── Config ───────────────────────────────────────────────────────────────────

const availabilityMeta: Record<Availability, { label: string; cls: string }> = {
  full_time: { label: "Full Time", cls: "bg-green-500/15 text-green-600 dark:text-green-400"   },
  part_time: { label: "Part Time", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400"     },
  on_call:   { label: "On Call",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400"  },
  inactive:  { label: "Inactive",  cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400"  },
};

const AVAIL_OPTIONS = [
  { value: "all",       label: "All Availability" },
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "on_call",   label: "On Call" },
  { value: "inactive",  label: "Inactive" },
];

const SKILL_SUGGESTIONS = [
  "CCTV", "Access Control", "Low Voltage", "Networking",
  "Audio/Video", "Fire Alarm", "Intercoms", "Structured Cabling",
];

const CERT_SUGGESTIONS = [
  "NICET Level II", "ESA Level 1", "OSHA 10",
  "CompTIA Network+", "Manufacturer Certifications",
];

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchMembers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*, roles(id, name, color)")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data as Member[];
}

async function fetchRoles() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, color")
    .order("created_at");
  if (error) throw error;
  return data as Pick<Role, "id" | "name" | "color">[];
}

async function updateMember(id: string, patch: {
  full_name?: string; role_id?: string | null; phone?: string | null;
  availability?: string; skills?: string[]; certifications?: string[];
  pay_type?: string; pay_rate?: number; start_date?: string | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("user_profiles").update(patch).eq("id", id);
  if (error) throw error;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────


function TeamAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-semibold text-white/95 shrink-0", className)}
      style={{ background: avatarGradient(name) }}
    >
      {avatarInitials(name)}
    </span>
  );
}

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Pick<Role, "name" | "color"> | null }) {
  if (!role) return <span className="rounded px-1.5 py-0.5 text-2xs bg-muted text-muted-foreground">No role</span>;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-2xs font-medium text-white"
      style={{ backgroundColor: role.color + "cc" }}
    >
      {role.name}
    </span>
  );
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({ value, onChange, suggestions, placeholder }: {
  value: string[]; onChange: (v: string[]) => void;
  suggestions: string[]; placeholder?: string;
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
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
        className="h-7 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      />
      {showSugg && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filtered.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); add(s); }}
              className="rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// ─── MemberFormSchema ─────────────────────────────────────────────────────────

const MemberFormSchema = z.object({
  full_name:      z.string().min(1, "Required"),
  role_id:        z.string().nullable(),
  phone:          z.string(),
  skills:         z.array(z.string()),
  certifications: z.array(z.string()),
  pay_type:       z.enum(["hourly", "salary"]),
  pay_rate:       z.coerce.number().min(0),
  availability:   z.enum(["full_time", "part_time", "on_call", "inactive"]),
  start_date:     z.string(),
});

type MemberFormValues = z.infer<typeof MemberFormSchema>;

// ─── MemberDrawer ─────────────────────────────────────────────────────────────

function MemberDrawer({ open, onOpenChange, member, roles, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  member: Member | null; roles: Pick<Role, "id" | "name" | "color">[];
  onSave: (id: string, data: MemberFormValues) => void;
}) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(MemberFormSchema),
    defaultValues: { full_name: "", role_id: null, phone: "", skills: [], certifications: [], pay_type: "hourly", pay_rate: 0, availability: "full_time", start_date: "" },
  });

  useEffect(() => {
    if (!open || !member) return;
    form.reset({
      full_name:      member.full_name ?? "",
      role_id:        member.role_id ?? null,
      phone:          member.phone ?? "",
      skills:         member.skills ?? [],
      certifications: member.certifications ?? [],
      pay_type:       (member.pay_type as "hourly" | "salary") ?? "hourly",
      pay_rate:       member.pay_rate ?? 0,
      availability:   (member.availability as Availability) ?? "full_time",
      start_date:     member.start_date ?? "",
    });
  }, [open, member, form]);

  const handleSubmit = form.handleSubmit((data) => {
    if (!member) return;
    onSave(member.id, data);
    onOpenChange(false);
  });

  const fieldCls = "h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary";  const labelCls = "mb-1 block text-xs font-medium text-foreground";
  const errorCls = "mt-0.5 text-xs text-destructive";

  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose className="sm:max-w-[480px] flex flex-col p-0 gap-0">
        <DrawerHeader
          leading={<TeamAvatar name={member.full_name ?? "?"} className="h-10 w-10 text-md" />}
          title={member.full_name ?? "Unknown"}
          subtitle={member.roles?.name ?? "No role"}
        />

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Identity */}
              <div>
                <SectionLabel>Identity</SectionLabel>
                <div className="space-y-3">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input {...field} className={fieldCls} placeholder="Full name" /></FormControl>
                      <FormMessage className={errorCls} />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="role_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Role</FormLabel>
                      <FormControl>
                        <FormSelect
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          onBlur={field.onBlur}
                        >
                          <option value="">No role</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </FormSelect>
                      </FormControl>
                    </FormItem>
                  )} />

                  <div className="space-y-1.5">
                    <label className={labelCls}>Email</label>
                    <input
                      readOnly
                      value={member.email ?? ""}
                      className={cn(fieldCls, "opacity-60 cursor-not-allowed")}
                    />
                    <p className="text-2xs text-muted-foreground">Email changes require the member to update their account.</p>
                  </div>

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Phone</FormLabel>
                      <FormControl><Input {...field} type="tel" className={fieldCls} placeholder="(555) 000-0000" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Skills & Certifications */}
              <div>
                <SectionLabel>Skills &amp; Certifications</SectionLabel>
                <div className="space-y-4">
                  <FormField control={form.control} name="skills" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Skills</FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} suggestions={SKILL_SUGGESTIONS} placeholder="Add skill…" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="certifications" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Certifications</FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} suggestions={CERT_SUGGESTIONS} placeholder="Add certification…" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Compensation */}
              <div>
                <SectionLabel>Compensation</SectionLabel>
                <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Visible to Admin and Owner roles only. Role-based visibility enforced when permissions are wired up.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="pay_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Pay Type</FormLabel>
                      <FormControl>
                        <FormSelect value={field.value} onChange={field.onChange} onBlur={field.onBlur}>
                          <option value="hourly">Hourly</option>
                          <option value="salary">Salary</option>
                        </FormSelect>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pay_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Pay Rate</FormLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <FormControl>
                          <Input {...field} type="number" min={0} step={0.01} className={cn(fieldCls, "pl-5")} placeholder="0.00" />
                        </FormControl>
                      </div>
                      <FormMessage className={errorCls} />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Schedule & Availability */}
              <div>
                <SectionLabel>Schedule &amp; Availability</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="availability" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Availability</FormLabel>
                      <FormControl>
                        <FormSelect value={field.value} onChange={field.onChange} onBlur={field.onBlur}>
                          <option value="full_time">Full Time</option>
                          <option value="part_time">Part Time</option>
                          <option value="on_call">On Call</option>
                          <option value="inactive">Inactive</option>
                        </FormSelect>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Start Date</FormLabel>
                      <FormControl><Input {...field} type="date" className={fieldCls} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Assigned Jobs placeholder */}
              <Separator />
              <div>
                <SectionLabel>Assigned Jobs</SectionLabel>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-3">
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">Job assignments available after projects are wired up.</span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button type="button" onClick={() => onOpenChange(false)}
                className="h-8 rounded-md border border-border px-4 text-sm hover:bg-accent transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                Save Changes
              </button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({ member, onEdit }: { member: Member; onEdit: () => void }) {
  const avail = availabilityMeta[(member.availability as Availability) ?? "full_time"];
  const skills = member.skills ?? [];
  const visibleSkills = skills.slice(0, 3);
  const extraSkills = skills.length - 3;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <TeamAvatar name={member.full_name ?? "?"} className="h-10 w-10 text-md" />
        <div className="min-w-0 flex-1">
          <span className="truncate text-base font-semibold leading-snug">{member.full_name ?? "—"}</span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={member.roles} />
            <span className={cn("rounded px-1.5 py-0.5 text-2xs font-medium", avail.cls)}>{avail.label}</span>
          </div>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleSkills.map((s) => (
            <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-2xs text-muted-foreground">{s}</span>
          ))}
          {extraSkills > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-2xs text-muted-foreground">+{extraSkills} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="italic">Jobs coming soon</span>
        </div>
        <button type="button" onClick={onEdit}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary/40 hover:text-foreground transition-colors">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>

      <div className="space-y-1 border-t border-border/60 pt-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{member.email ?? "—"}</span>
        </div>
        {member.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TeamPage ─────────────────────────────────────────────────────────────────

function TeamPage() {
  const { setMeta } = useMeta();
  const navigate    = useNavigate();
  const qc          = useQueryClient();

  const [search,         setSearch]         = useState("");
  const [roleFilter,     setRoleFilter]     = useState("all");
  const [availFilter,    setAvailFilter]    = useState("all");
  const [skillsFilter,   setSkillsFilter]   = useState<string[]>([]);
  const [skillsPopOpen,  setSkillsPopOpen]  = useState(false);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [editingMember,  setEditingMember]  = useState<Member | null>(null);

  const { data: members = [], isLoading } = useQuery({ queryKey: ["team-members-full"], queryFn: fetchMembers });
  const { data: roles   = [] }            = useQuery({ queryKey: ["roles-basic"],   queryFn: fetchRoles  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateMember>[1] }) =>
      updateMember(id, patch),
    onSuccess: (_, { id, patch }) => {
      qc.setQueryData<Member[]>(["team-members-full"], (prev) =>
        prev?.map((m) => {
          if (m.id !== id) return m;
          const role = patch.role_id ? roles.find((r) => r.id === patch.role_id) ?? m.roles : m.roles;
          return { ...m, ...patch, roles: role ?? null };
        }) ?? []
      );
    },
  });

  const openEdit   = useCallback((m: Member) => { setEditingMember(m); setDrawerOpen(true); }, []);
  const openInvite = useCallback(() => { navigate({ to: "/settings/team-members" }); }, [navigate]);

  useEffect(() => {
    setMeta({ title: "Team", subtitle: "Field technicians and staff", newLabel: "Invite Member", onNew: openInvite });
  }, [setMeta, openInvite]);

  const handleSave = useCallback((id: string, data: MemberFormValues) => {
    updateMutation.mutate({ id, patch: {
      full_name:      data.full_name,
      role_id:        data.role_id,
      phone:          data.phone || null,
      skills:         data.skills,
      certifications: data.certifications,
      pay_type:       data.pay_type,
      pay_rate:       data.pay_rate,
      availability:   data.availability,
      start_date:     data.start_date || null,
    }});
  }, [updateMutation]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => (m.skills ?? []).forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [members]);

  const roleOptions = useMemo(() => [
    { value: "all", label: "All Roles" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ], [roles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role_id !== roleFilter) return false;
      if (availFilter !== "all" && m.availability !== availFilter) return false;
      if (skillsFilter.length > 0 && !skillsFilter.some((s) => (m.skills ?? []).includes(s))) return false;
      if (q && !m.full_name?.toLowerCase().includes(q) && !m.email?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, search, roleFilter, availFilter, skillsFilter]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Loading team…</div>;
  }

  return (
    <div className="flex flex-col">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search members…" />
        <FilterSelect value={roleFilter} onChange={setRoleFilter}>
          {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FilterSelect>
        <FilterSelect value={availFilter} onChange={setAvailFilter}>
          {AVAIL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FilterSelect>

        <Popover open={skillsPopOpen} onOpenChange={setSkillsPopOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(
              "flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
              skillsFilter.length > 0 && "border-primary/50 text-foreground",
            )}>
              Skills
              {skillsFilter.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 text-2xs font-medium text-primary">{skillsFilter.length}</span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="space-y-0.5">
              {allSkills.length === 0 && (
                <p className="px-1.5 py-1 text-sm text-muted-foreground">No skills added yet.</p>
              )}
              {allSkills.map((skill) => (
                <label key={skill} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-accent">
                  <Checkbox
                    checked={skillsFilter.includes(skill)}
                    onCheckedChange={(checked) =>
                      setSkillsFilter(checked ? [...skillsFilter, skill] : skillsFilter.filter((s) => s !== skill))
                    }
                  />
                  {skill}
                </label>
              ))}
              {skillsFilter.length > 0 && (
                <button type="button" onClick={() => setSkillsFilter([])}
                  className="mt-1 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                  Clear filter
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} of {members.length}
        </span>
      </FilterBar>

      <div className="p-4">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} onEdit={() => openEdit(m)} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {members.length === 0 ? "No team members yet." : "No members match the current filters."}
          </div>
        )}
      </div>

      <MemberDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        member={editingMember}
        roles={roles}
        onSave={handleSave}
      />
    </div>
  );
}

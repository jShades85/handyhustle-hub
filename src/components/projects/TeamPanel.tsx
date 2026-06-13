import { useCallback, useRef, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { Mail, Phone, Plus, Users, X } from "lucide-react";
import { PROJECTS } from "@/data/projects";
import { ownerNames } from "@/lib/demo-data";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectRole = "project-manager" | "lead-tech" | "field-tech" | "subcontractor";

interface TeamMember {
  id: string;
  initials: string;
  name: string;
  role: ProjectRole;
  phone: string;
  email: string;
}

interface DraftMember {
  name: string;
  role: ProjectRole;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TeamPanelProps {
  projectId: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const roleMeta: Record<ProjectRole, { label: string; cls: string }> = {
  "project-manager": { label: "Project Manager", cls: "bg-primary/10 text-primary" },
  "lead-tech":       { label: "Lead Tech",        cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  "field-tech":      { label: "Field Tech",       cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  "subcontractor":   { label: "Subcontractor",    cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const ROLE_OPTIONS: ProjectRole[] = ["project-manager", "lead-tech", "field-tech", "subcontractor"];

const DEFAULT_DRAFT: DraftMember = { name: "", role: "field-tech" };

// ─── Seed data ────────────────────────────────────────────────────────────────

function makeEmail(name: string): string {
  return `${name.split(" ")[0].toLowerCase()}@bearingpro.tech`;
}

function makePhone(seed: number): string {
  const area = [312, 718, 323, 303, 512, 615][seed % 6];
  const num = String(555_0100 + seed * 13).slice(-4);
  return `(${area}) 555-${num}`;
}

function getInitialMembers(projectId: string): TeamMember[] {
  const project = PROJECTS.find((p) => p.id === projectId);
  const pmKey = project?.pm ?? "";
  const pmName = ownerNames[pmKey] ?? pmKey;

  const pm: TeamMember = {
    id: `tm-${projectId}-pm`,
    initials: pmKey,
    name: pmName,
    role: "project-manager",
    phone: makePhone(0),
    email: makeEmail(pmName),
  };

  switch (projectId) {
    case "pr1":
      return [
        pm,
        { id: "tm1-2", initials: "RT", name: ownerNames.RT, role: "lead-tech",  phone: makePhone(1), email: makeEmail(ownerNames.RT) },
        { id: "tm1-3", initials: "AV", name: ownerNames.AV, role: "field-tech", phone: makePhone(2), email: makeEmail(ownerNames.AV) },
      ];
    case "pr2":
      return [
        pm,
        { id: "tm2-2", initials: "AV", name: ownerNames.AV, role: "lead-tech",  phone: makePhone(1), email: makeEmail(ownerNames.AV) },
      ];
    case "pr3":
      return [
        pm,
        { id: "tm3-2", initials: "RT", name: ownerNames.RT, role: "field-tech",   phone: makePhone(1), email: makeEmail(ownerNames.RT) },
        { id: "tm3-3", initials: "AV", name: ownerNames.AV, role: "subcontractor", phone: makePhone(3), email: makeEmail(ownerNames.AV) },
      ];
    case "pr6":
      return [
        pm,
        { id: "tm6-2", initials: "RT", name: ownerNames.RT, role: "lead-tech",  phone: makePhone(1), email: makeEmail(ownerNames.RT) },
      ];
    case "wo-0041":
      return [
        { id: "tmwo41-1", initials: "RT", name: ownerNames.RT, role: "lead-tech",  phone: makePhone(1), email: makeEmail(ownerNames.RT) },
        { id: "tmwo41-2", initials: "SN", name: ownerNames.SN, role: "field-tech", phone: makePhone(3), email: makeEmail(ownerNames.SN) },
      ];
    case "wo-0042":
      return [
        { id: "tmwo42-1", initials: "AV", name: ownerNames.AV, role: "lead-tech", phone: makePhone(2), email: makeEmail(ownerNames.AV) },
      ];
    case "wo-0043":
      return [
        { id: "tmwo43-1", initials: "MO", name: ownerNames.MO, role: "lead-tech",  phone: makePhone(0), email: makeEmail(ownerNames.MO) },
        { id: "tmwo43-2", initials: "RT", name: ownerNames.RT, role: "field-tech", phone: makePhone(1), email: makeEmail(ownerNames.RT) },
      ];
    default:
      return pmKey ? [pm] : [];
  }
}

function nameToInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: ProjectRole }) {
  const { label, cls } = roleMeta[role];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

function MemberRow({
  member,
  onRemove,
}: {
  member: TeamMember;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <Avatar initials={member.initials} className="!h-8 !w-8 !text-xs shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-medium leading-snug">{member.name}</span>
          <RoleBadge role={member.role} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3 shrink-0" />
            {member.phone}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            {member.email}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(member.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
        aria-label={`Remove ${member.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddMemberRow({
  draft,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: DraftMember;
  onChange: (d: DraftMember) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border/60 bg-surface/30">
      <input
        autoFocus
        type="text"
        placeholder="Full name…"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 min-w-[160px] flex-1 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <select
        value={draft.role}
        onChange={(e) => onChange({ ...draft, role: e.target.value as ProjectRole })}
        className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>{roleMeta[r].label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onCommit}
        disabled={!draft.name.trim()}
        className="h-7 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamPanel({ projectId }: TeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>(() => getInitialMembers(projectId));
  const [addingMember, setAddingMember] = useState(false);
  const [draft, setDraft] = useState<DraftMember>({ ...DEFAULT_DRAFT });

  const counterRef = useRef(7000);
  const nextId = useCallback(() => `tm-gen-${counterRef.current++}`, []);

  const removeMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const commitAdd = useCallback(() => {
    const name = draft.name.trim();
    if (!name) return;
    const initials = nameToInitials(name);
    const newMember: TeamMember = {
      id: nextId(),
      initials: initials || "?",
      name,
      role: draft.role,
      phone: "—",
      email: "—",
    };
    setMembers((prev) => [...prev, newMember]);
    setDraft({ ...DEFAULT_DRAFT });
    setAddingMember(false);
  }, [draft, nextId]);

  const cancelAdd = useCallback(() => {
    setAddingMember(false);
    setDraft({ ...DEFAULT_DRAFT });
  }, []);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-2xs uppercase tracking-wider text-muted-foreground">
          Team Members
          {members.length > 0 && (
            <span className="ml-2 font-mono text-muted-foreground/60">{members.length}</span>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border/60">
        {members.map((member) => (
          <MemberRow key={member.id} member={member} onRemove={removeMember} />
        ))}

        {addingMember && (
          <AddMemberRow
            draft={draft}
            onChange={setDraft}
            onCommit={commitAdd}
            onCancel={cancelAdd}
          />
        )}

        {members.length === 0 && !addingMember && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-7 w-7 text-muted-foreground/30 mb-2.5" />
            <p className="text-sm font-medium">No team members yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add people to this project below.
            </p>
          </div>
        )}
      </div>

      {!addingMember && (
        <button
          type="button"
          onClick={() => { setDraft({ ...DEFAULT_DRAFT }); setAddingMember(true); }}
          className="mt-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Team Member
        </button>
      )}
    </div>
  );
}

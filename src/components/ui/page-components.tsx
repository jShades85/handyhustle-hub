import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── PageShell ────────────────────────────────────────────────────────────────

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

// ─── StatBar / StatItem ───────────────────────────────────────────────────────

export function StatBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center border-b border-border overflow-x-auto">
      {children}
    </div>
  );
}

export interface StatItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
  accentColor?: "red" | "amber" | "green";
}

export function StatItem({ icon: Icon, label, value, accent, accentColor = "red" }: StatItemProps) {
  const colorMap = {
    red:   "text-red-500",
    amber: "text-amber-500",
    green: "text-green-500",
  };
  const accentCls = colorMap[accentColor];

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-r border-border shrink-0">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
        <Icon className={cn("h-3.5 w-3.5", accent ? accentCls : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-2xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn("text-md font-semibold tabular-nums leading-tight", accent && accentCls)}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b border-border px-4 py-2", className)}>
      {children}
    </div>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center flex-1 min-w-40", className)}>
      <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 w-full rounded-md border border-border bg-surface pl-7 pr-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}

// Renders a native-style <option> as a Radix SelectItem. Empty-value options
// are skipped — Radix forbids value="" (that's reserved for "cleared").
function renderFilterOption(el: ReactElement<{ value?: string | number; children: ReactNode; disabled?: boolean }>) {
  const v = String(el.props.value ?? "");
  if (v === "") return null;
  return (
    <SelectItem key={v} value={v} disabled={el.props.disabled} className="text-sm">
      {el.props.children}
    </SelectItem>
  );
}

export function FilterSelect({ value, onChange, children, className }: FilterSelectProps) {
  const isActive = value !== "" && value !== "all";

  // Flatten children: support <optgroup> (→ SelectGroup + label) and <option>.
  // Native <select> allowed optgroups; the Radix port must handle them too,
  // otherwise an optgroup (no value) becomes an illegal value="" SelectItem.
  const items = Children.toArray(children)
    .filter(isValidElement)
    .map((child, i) => {
      const el = child as ReactElement<{ label?: string; value?: string | number; children?: ReactNode; disabled?: boolean }>;
      if (el.type === "optgroup") {
        const opts = Children.toArray(el.props.children).filter(isValidElement) as ReactElement<{ value?: string | number; children: ReactNode; disabled?: boolean }>[];
        return (
          <SelectGroup key={`group-${i}-${el.props.label ?? ""}`}>
            {el.props.label ? (
              <SelectLabel className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                {el.props.label}
              </SelectLabel>
            ) : null}
            {opts.map(renderFilterOption)}
          </SelectGroup>
        );
      }
      return renderFilterOption(el as ReactElement<{ value?: string | number; children: ReactNode; disabled?: boolean }>);
    });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-7 w-auto min-w-27.5 gap-1.5 rounded-md border bg-surface px-2.5 text-xs focus-visible:ring-1 focus-visible:ring-primary",
          isActive
            ? "border-primary/50 text-primary"
            : "border-border text-foreground",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items}
      </SelectContent>
    </Select>
  );
}

// ─── PageTabs / PageTab ───────────────────────────────────────────────────────

export function PageTabs({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center border-b border-border overflow-x-auto">
      {children}
    </div>
  );
}

export interface PageTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}

export function PageTab({ active, onClick, children, count }: PageTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn(
          "rounded px-1.5 py-0.5 text-2xs font-semibold",
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
// Generic — each page passes label + cls from its own STATUS_META

interface StatusBadgeProps {
  label: string;
  cls: string;
  dot?: boolean;
}

export function StatusBadge({ label, cls, dot = false }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", cls)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── DrawerFooter ─────────────────────────────────────────────────────────────

export function DrawerFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3", className)}>
      {children}
    </div>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="block text-2xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
      {children}
    </p>
  );
}

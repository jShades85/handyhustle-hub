import * as React from "react";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

// Standard header for every drawer (Sheet). The top-right action cluster holds
// the Edit and Close (X) controls as a matched icon pair — same size, centered
// together — instead of the bordered-Edit-next-to-floating-X mismatch. Because
// the close button lives here, drawers using DrawerHeader must pass `hideClose`
// to their <SheetContent> so the Sheet's default floating X is suppressed.

const iconBtn =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface DrawerHeaderProps {
  /** Optional leading visual — an avatar or icon node. */
  leading?: React.ReactNode;
  /** Optional eyebrow line above the title — e.g. a record code (SP-2026-001)
   *  or a code + small badge. Rendered as-is, so the caller styles it. */
  eyebrow?: React.ReactNode;
  /** Main title — rendered as the accessible SheetTitle. */
  title: React.ReactNode;
  /** Optional subtitle line under the title. */
  subtitle?: React.ReactNode;
  /** When provided, renders the Edit (pencil) icon button in the action cluster. */
  onEdit?: () => void;
  /** Accessible label / tooltip for the Edit button (default "Edit"). */
  editLabel?: string;
  /** Extra action nodes (status dropdowns, secondary buttons) — placed left of Edit. */
  actions?: React.ReactNode;
  /** Content rendered below the title row (badges, tags, status chips). */
  children?: React.ReactNode;
  className?: string;
}

export function DrawerHeader({
  leading,
  eyebrow,
  title,
  subtitle,
  onEdit,
  editLabel = "Edit",
  actions,
  children,
  className,
}: DrawerHeaderProps) {
  return (
    <SheetHeader className={cn("shrink-0 space-y-2 border-b border-border px-5 py-4 pr-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0 flex-1">
            {eyebrow ? <div className="mb-1">{eyebrow}</div> : null}
            <SheetTitle className="truncate text-md font-semibold leading-tight">{title}</SheetTitle>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {/* Matched icon pair: optional actions, Edit, then Close — all centered together. */}
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          {onEdit ? (
            <button type="button" onClick={onEdit} aria-label={editLabel} title={editLabel} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          <SheetClose aria-label="Close" title="Close" className={cn(iconBtn, "cursor-pointer")}>
            <X className="h-4 w-4" />
          </SheetClose>
        </div>
      </div>
      {children}
    </SheetHeader>
  );
}

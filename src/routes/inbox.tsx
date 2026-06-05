import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Tab, Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Mail, AlertCircle, Eye, MessageSquare, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Inbox · Crosscurrent" }] }),
  component: InboxPage,
});

const items = [
  { icon: AlertCircle, color: "text-priority-urgent", from: "System", subject: "Helio surgical quote expires in 3 days", preview: "Q-2026-0412 ($148,000) sent May 18 has not been viewed in 9 days.", time: "5m", unread: true },
  { icon: Eye, color: "text-status-proposal", from: "Pinecrest Hospitality", subject: "Quote Q-2026-0417 viewed 4 times", preview: "Marcus Bell opened the lobby video wall proposal twice today.", time: "1h", unread: true },
  { icon: MessageSquare, color: "text-status-qualified", from: "Audrey Chen", subject: "Re: Penthouse cinema — fabric swatches", preview: "These look great. Can we add the rear-mounted subs we discussed?", time: "2h", unread: true },
  { icon: Mail, color: "text-muted-foreground", from: "Damon Reyes", subject: "Halcyon district — RFP attachments", preview: "Attached are the room-by-room requirements for the Sep 30 deadline.", time: "5h", unread: false },
  { icon: CheckCircle2, color: "text-status-won", from: "System", subject: "Quay Residential signed Q-2026-0415", preview: "$184,500 — converted to project AV-2026-014.", time: "1d", unread: false },
  { icon: AlertCircle, color: "text-priority-high", from: "Inventory", subject: "Crestron MX-150 below reorder threshold", preview: "Current stock: 8 units. Min: 10. Suggested PO: 12 units from Crestron.", time: "1d", unread: false },
  { icon: Mail, color: "text-muted-foreground", from: "Iris Wang", subject: "14F change order discussion", preview: "Eli — let's add the extra confidence monitors. Budget approved.", time: "2d", unread: false },
];

function InboxPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Inbox" }); }, [setMeta]);

  return (
    <div>
      <div className="p-4">
        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
          {items.map((it, i) => (
            <li key={i} className={`row-hover flex items-start gap-3 px-4 py-3 ${it.unread ? "" : "opacity-70"}`}>
              <it.icon className={`mt-0.5 h-4 w-4 shrink-0 ${it.color}`} />
              <Avatar initials={it.from.split(" ").map(s=>s[0]).slice(0,2).join("")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[12.5px] ${it.unread ? "font-semibold" : "font-medium"}`}>{it.from}</span>
                  <span className="text-[10.5px] text-muted-foreground">·</span>
                  <span className={`text-[12.5px] truncate ${it.unread ? "" : "text-muted-foreground"}`}>{it.subject}</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">{it.preview}</div>
              </div>
              <span className="font-mono text-[10.5px] text-muted-foreground shrink-0">{it.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

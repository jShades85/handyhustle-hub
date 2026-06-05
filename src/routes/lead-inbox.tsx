import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/lead-inbox")({ component: LeadInbox });
function LeadInbox() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Lead Inbox" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Lead Inbox — coming soon</div>;
}

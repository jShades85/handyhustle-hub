import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/service-tickets")({ component: ServiceTickets });
function ServiceTickets() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Service Tickets" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Service Tickets — coming soon</div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/service-plans")({ component: ServicePlans });
function ServicePlans() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Service Plans" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Service Plans — coming soon</div>;
}

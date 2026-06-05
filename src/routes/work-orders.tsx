import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/work-orders")({ component: WorkOrders });
function WorkOrders() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Work Orders" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Work Orders — coming soon</div>;
}

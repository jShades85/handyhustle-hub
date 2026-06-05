import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/purchase-orders")({ component: PurchaseOrders });
function PurchaseOrders() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Purchase Orders" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Purchase Orders — coming soon</div>;
}

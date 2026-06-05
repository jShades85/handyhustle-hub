import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/payments")({ component: Payments });
function Payments() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Payments" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Payments — coming soon</div>;
}

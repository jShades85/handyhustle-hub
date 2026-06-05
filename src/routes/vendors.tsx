import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/vendors")({ component: Vendors });
function Vendors() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Vendors" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Vendors — coming soon</div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/reports")({ component: Reports });
function Reports() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Reports" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Reports — coming soon</div>;
}

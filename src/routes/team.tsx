import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMeta } from "@/contexts/PageMetaContext";
export const Route = createFileRoute("/team")({ component: Team });
function Team() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Team" }); }, [setMeta]);
  return <div className="p-6 text-muted-foreground">Team — coming soon</div>;
}

import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/operations/planner")({
  head: () => ({ meta: [{ title: "Planner · BearingPro" }] }),
  component: () => <Outlet />,
});

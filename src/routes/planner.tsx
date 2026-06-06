import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Planner · Crosscurrent" }] }),
  component: () => <Outlet />,
});

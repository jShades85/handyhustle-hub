import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/service")({
  head: () => ({ meta: [{ title: "Service · BearingPro" }] }),
  component: () => <Outlet />,
});

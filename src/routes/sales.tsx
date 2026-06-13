import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales · BearingPro" }] }),
  component: () => <Outlet />,
});

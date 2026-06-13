import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · BearingPro" }] }),
  component: () => <Outlet />,
});

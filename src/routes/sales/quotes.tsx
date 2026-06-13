import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/sales/quotes")({
  head: () => ({ meta: [{ title: "Quotes & Estimates · BearingPro" }] }),
  component: () => <Outlet />,
});

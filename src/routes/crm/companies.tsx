import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/crm/companies")({
  head: () => ({ meta: [{ title: "Companies · BearingPro" }] }),
  component: () => <Outlet />,
});

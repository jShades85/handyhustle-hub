import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [{ title: "Finance · Port City Sound & Security" }] }),
  component: () => <Outlet />,
});

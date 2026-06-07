import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/operations")({
  head: () => ({ meta: [{ title: "Operations · Crosscurrent" }] }),
  component: () => <Outlet />,
});

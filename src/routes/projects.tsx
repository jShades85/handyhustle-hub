import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects · Crosscurrent" }] }),
  component: () => <Outlet />,
});

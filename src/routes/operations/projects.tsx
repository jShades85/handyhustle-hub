import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/operations/projects")({
  head: () => ({ meta: [{ title: "Projects · BearingPro" }] }),
  component: () => <Outlet />,
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/service/")({
  beforeLoad: () => { throw redirect({ to: "/service/service-tickets" }); },
});

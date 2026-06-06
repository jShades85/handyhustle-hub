import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailView } from "@/routes/projects/$projectId";

export const Route = createFileRoute("/work-orders/$workOrderId")({
  component: WorkOrderDetailPage,
});

function WorkOrderDetailPage() {
  const { workOrderId } = Route.useParams();
  return <ProjectDetailView projectId={workOrderId} section="Work Orders" />;
}

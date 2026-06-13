import { QueryClient, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { toast } from "sonner";

const PG_FRIENDLY: Record<string, string> = {
  "42501": "You don't have permission to do this.",
  "23505": "This record already exists.",
  "23503": "This record is linked to other data and can't be deleted.",
  "23502": "A required field is missing.",
  "22001": "One of the values is too long.",
  "PGRST116": "Record not found.",
};

function friendlyMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Something went wrong. Please try again.";
  const e = error as { code?: string; message?: string };
  if (e.code && PG_FRIENDLY[e.code]) return PG_FRIENDLY[e.code];
  if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")) {
    return "Network error — check your connection and try again.";
  }
  if (e.message?.includes("row-level security")) return "You don't have permission to do this.";
  if (e.message?.includes("violates") && e.message?.includes("constraint")) {
    return "This change conflicts with existing data.";
  }
  return e.message ?? "Something went wrong. Please try again.";
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onError: (error: unknown) => {
        toast.error(friendlyMessage(error));
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

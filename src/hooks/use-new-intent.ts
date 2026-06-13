import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

// Opens a page's "New" modal when the route is visited with ?create=1 (e.g. from
// a command-palette quick action), then strips the param so it fires exactly once.
// Pages that have a validateSearch must include `create?: string` in it, otherwise
// the param is filtered out before this hook can see it.
export function useNewIntent(open: () => void) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const wantsCreate = useRouterState({
    select: (s) => Boolean((s.location.search as Record<string, unknown>).create),
  });

  useEffect(() => {
    if (!wantsCreate) return;
    open();
    navigate({
      to: pathname,
      replace: true,
      search: (prev: Record<string, unknown>) => {
        const { create: _create, ...rest } = prev;
        return rest;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsCreate]);
}

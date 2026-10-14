import { ORPCError } from "@orpc/client";
import type { QueryClient } from "@tanstack/react-query";

import type { FixtureClient } from "../../server/api/client";
import { createFixtureQueryUtils } from "../../server/api/client";
import { invalidateSessionTransition, isSessionTransitionCurrent } from "../session/session-transition";

export function isWidgetAccessDenied(error: unknown): boolean {
  return (
    error instanceof ORPCError &&
    (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED" || error.code === "NOT_FOUND")
  );
}

export function hideWidgetAccess(queryClient: QueryClient, client: FixtureClient, epoch: number): void {
  if (!isSessionTransitionCurrent(queryClient, epoch)) return;
  invalidateSessionTransition(queryClient, epoch);
  const queries = createFixtureQueryUtils(client);
  queryClient.removeQueries({ queryKey: queries.widget.key() });
  queryClient.removeQueries({ queryKey: queries.board.key() });
}

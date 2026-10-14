import { Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { widgetSnapshotSchema } from "../../contracts/schemas";
import type { WidgetSlotProps } from "../../contracts/ui";
import { createFixtureQueryUtils } from "../../server/api/client";
import {
  captureSessionTransition,
  isSessionTransitionCurrent,
  useSessionTransition,
} from "../session/session-transition";
import { hideWidgetAccess, isWidgetAccessDenied } from "./access";
import { SourceControls } from "./source-controls";

export function FixtureWidget({ board, snapshot, client, queryClient }: WidgetSlotProps) {
  const [mounted, setMounted] = useState(false);
  const blocked = useSessionTransition(queryClient);
  const queries = useMemo(() => createFixtureQueryUtils(client), [client]);
  const queryKey = useMemo(() => queries.widget.read.queryKey({ input: { boardId: board.id } }), [queries, board.id]);
  const widget = useQuery(
    {
      queryKey,
      queryFn: async ({ signal }) => {
        const epoch = captureSessionTransition(queryClient);
        if (epoch === null) throw new DOMException("Fixture access changed", "AbortError");
        try {
          const next = await client.widget.read({ boardId: board.id }, { signal });
          signal.throwIfAborted();
          if (!isSessionTransitionCurrent(queryClient, epoch)) {
            throw new DOMException("Fixture access changed", "AbortError");
          }
          return widgetSnapshotSchema.parse(next);
        } catch (error) {
          if (!signal.aborted && isWidgetAccessDenied(error)) hideWidgetAccess(queryClient, client, epoch);
          throw error;
        }
      },
      enabled: (query) => mounted && !blocked && !isWidgetAccessDenied(query.state.error),
      retry: false,
      retryOnMount: false,
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 5000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    queryClient,
  );

  useEffect(() => {
    setMounted(true);
    return () => {
      void queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.removeQueries({ queryKey, exact: true });
    };
  }, [queryClient, queryKey]);

  if (blocked || (mounted && isWidgetAccessDenied(widget.error))) {
    return (
      <Text size="sm" role="alert">
        Widget access could not be confirmed. Refresh fixture access to continue.
      </Text>
    );
  }
  const current = mounted && widget.data ? widget.data : snapshot;
  const refreshFailed = mounted && widget.isError;
  const expired = mounted && current.status !== "unavailable" && Date.parse(current.staleUntil) <= Date.now();
  const fresh =
    current.status === "ready" && !refreshFailed && (!mounted || Date.parse(current.freshUntil) > Date.now());
  return (
    <Stack gap="xs">
      <Text fw={600}>{board.content.widget.displayLabel}</Text>
      <Text>{!expired && current.data ? `${current.data.value} ${current.data.unit}` : "Unavailable"}</Text>
      <Text size="sm">
        Observed: {current.observedAt ? <time dateTime={current.observedAt}>{current.observedAt}</time> : "never"}
      </Text>
      <Text size="sm" role="status" aria-live="polite">
        Generation: {current.generation} ·{" "}
        {expired || current.status === "unavailable" ? "unavailable" : fresh ? "ready" : "stale"}
      </Text>
      <Text size="sm">
        Synthetic HTTP source. Refresh checks start after hydration, every 5 seconds while this board is visible.
      </Text>
      {(refreshFailed || current.status !== "ready" || expired) && (
        <Text size="sm" c="red.9" role="status">
          {refreshFailed
            ? "Refresh failed. The observation time has not changed."
            : current.status === "unavailable" || expired
              ? "No observation is available within the stale limit."
              : current.status === "stale"
                ? `Last-good observation retained: ${current.error}.`
                : "Showing the last observation, not a new fetch."}
        </Text>
      )}
      {board.capabilities.canEdit && (
        <SourceControls board={board} snapshot={snapshot} client={client} queryClient={queryClient} />
      )}
    </Stack>
  );
}

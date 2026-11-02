"use client";

import { useCallback, useState } from "react";
import { Box, Text } from "@mantine/core";

import { ARENA_VIEWPORTS } from "./_arena-contract";
import type { ArenaState, ArenaViewport } from "./_arena-contract";
import type { BlindDataset } from "./_review";
import { WidgetFrame } from "./_widget-frame";

export function ArenaCapture({
  candidate,
  fixture,
  state,
  viewport,
}: {
  candidate: BlindDataset["candidates"][number];
  fixture: BlindDataset["cases"][number];
  state: ArenaState;
  viewport: ArenaViewport;
}) {
  const [failed, setFailed] = useState(candidate.status !== "ready" || !candidate.definition);
  const [ready, setReady] = useState(false);
  const onFailure = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);
  const dimensions = ARENA_VIEWPORTS.find(({ id }) => id === viewport) ?? ARENA_VIEWPORTS[0];
  let status = "rendering";
  if (ready) status = "ready";
  if (failed) status = "unavailable";
  return (
    <Box
      data-arena-capture
      data-arena-capture-status={status}
      w={`${dimensions.width}px`}
      h={`${dimensions.height}px`}
      bg="var(--mantine-color-body)"
      style={{ overflow: "hidden" }}
    >
      {failed ? (
        <Box p="md">
          <Text c="dimmed">Candidate unavailable</Text>
        </Box>
      ) : (
        <WidgetFrame
          candidate={candidate}
          fixture={fixture}
          state={state}
          viewport={viewport}
          onFailure={onFailure}
          onReady={onReady}
        />
      )}
    </Box>
  );
}

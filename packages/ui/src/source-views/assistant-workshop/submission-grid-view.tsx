"use client";

import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

import type { WorkshopSubmissionGridViewProps } from "./contracts";

export function WorkshopSubmissionGridView({
  state,
  ariaLabel,
  emptyState,
  cols = { base: 1, sm: 2, lg: 3 },
  unavailableTitle,
  unavailableDescription,
  retryLabel,
}: WorkshopSubmissionGridViewProps) {
  if (state.status === "loading") {
    return (
      <SimpleGrid cols={cols} spacing="md">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} h={320} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  if (state.status === "failed") {
    return (
      <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title={unavailableTitle}>
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{unavailableDescription}</Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconRefresh size={14} />}
            loading={state.retryPending}
            onClick={state.onRetry}
          >
            {retryLabel}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (state.status === "unavailable") return <>{state.content}</>;

  if (!state.cards.length) return <>{emptyState}</>;

  return (
    <SimpleGrid
      component="ul"
      aria-label={ariaLabel}
      cols={cols}
      spacing="md"
      m={0}
      p={0}
      style={{ listStyle: "none" }}
    >
      {state.cards}
    </SimpleGrid>
  );
}

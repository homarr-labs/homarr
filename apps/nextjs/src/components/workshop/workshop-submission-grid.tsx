"use client";

import type { ReactNode } from "react";
import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import type { StyleProp } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import type { UseQueryResult } from "@tanstack/react-query";

import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopBackend, WorkshopPage } from "@homarr/workshop/backend";
import type { WorkshopSubmissionSummary } from "@homarr/workshop/schema";

import { WorkshopSubmissionCard } from "./workshop-submission-card";

interface WorkshopSubmissionGridProps {
  client: WorkshopBackend;
  query: UseQueryResult<WorkshopPage<WorkshopSubmissionSummary>>;
  ariaLabel: string;
  emptyState: ReactNode;
  cols?: StyleProp<number>;
  renderActions(item: WorkshopSubmissionSummary): ReactNode;
}

/**
 * Loading, failure, empty and loaded states for a page of Workshop submissions.
 * Shared so the widget browser and the Custom CSS picker behave identically.
 */
export function WorkshopSubmissionGrid({
  client,
  query,
  ariaLabel,
  emptyState,
  cols = { base: 1, sm: 2, lg: 3 },
  renderActions,
}: WorkshopSubmissionGridProps) {
  const t = useScopedI18n("workshop");

  if (query.isLoading) {
    return (
      <SimpleGrid cols={cols} spacing="md">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} h={320} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  if (query.isError) {
    return (
      <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title={t("unavailableTitle")}>
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{t("unavailable")}</Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconRefresh size={14} />}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {t("retry")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!query.data?.items.length) return <>{emptyState}</>;

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
      {query.data.items.map((item) => (
        <WorkshopSubmissionCard key={item.id} client={client} item={item} actions={renderActions(item)} />
      ))}
    </SimpleGrid>
  );
}

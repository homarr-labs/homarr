import type { ReactNode } from "react";
import { Box, Group, Paper, Stack } from "@mantine/core";

import type { ManagePageLayoutProps } from "./manage-page-layout";
import { ManagePageLayout } from "./manage-page-layout";

export interface ManageCollectionPageProps extends Omit<ManagePageLayoutProps, "children"> {
  ariaLabel: string;
  itemCount: number;
  emptyState: ReactNode;
  children: ReactNode;
}

export const ManageCollectionPage = ({
  ariaLabel,
  itemCount,
  emptyState,
  children,
  ...layoutProps
}: ManageCollectionPageProps) => (
  <ManagePageLayout {...layoutProps}>
    {itemCount === 0 ? emptyState : <ManageCollectionList ariaLabel={ariaLabel}>{children}</ManageCollectionList>}
  </ManagePageLayout>
);

/** The `ul` wrapper used by every manage list, so collections rendered outside `ManageCollectionPage` still match. */
export const ManageCollectionList = ({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) => (
  <Stack component="ul" aria-label={ariaLabel} gap="sm" m={0} p={0} style={{ listStyle: "none" }}>
    {children}
  </Stack>
);

export interface ManageCollectionItemProps {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  actionsAlignment?: "flex-start" | "center";
}

export const ManageCollectionItem = ({
  leading,
  title,
  description,
  metadata,
  badges,
  actions,
  actionsAlignment = "flex-start",
}: ManageCollectionItemProps) => (
  <Paper component="li" p="sm" withBorder radius="md">
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
      {leading && <Box style={{ flexShrink: 0 }}>{leading}</Box>}
      <Stack gap={4} flex={1} miw={0}>
        <Group gap="xs" wrap="wrap">
          {title}
          {badges && <Box style={{ flexShrink: 0 }}>{badges}</Box>}
        </Group>
        {description}
        {metadata}
      </Stack>
      {actions && (
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0, alignSelf: actionsAlignment }}>
          {actions}
        </Group>
      )}
    </Group>
  </Paper>
);

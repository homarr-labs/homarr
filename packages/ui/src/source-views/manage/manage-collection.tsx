import { Box, Group, Paper, Stack } from "@mantine/core";

import type { ManageCollectionItemProps, ManageCollectionListProps, ManageCollectionPageProps } from "./contracts";
import { ManagePageLayoutView } from "./manage-page-layout-view";

export const ManageCollectionPage = ({
  ariaLabel,
  itemCount,
  emptyState,
  children,
  ...layoutProps
}: ManageCollectionPageProps) => (
  <ManagePageLayoutView {...layoutProps}>
    {itemCount === 0 ? emptyState : <ManageCollectionList ariaLabel={ariaLabel}>{children}</ManageCollectionList>}
  </ManagePageLayoutView>
);

export const ManageCollectionList = ({ ariaLabel, children }: ManageCollectionListProps) => (
  <Stack component="ul" aria-label={ariaLabel} gap="sm" m={0} p={0} style={{ listStyle: "none" }}>
    {children}
  </Stack>
);

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

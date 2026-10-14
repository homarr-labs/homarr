import { Group, Stack, Title } from "@mantine/core";

import type { ManagePageLayoutViewProps } from "./contracts";
import { ManageContainer } from "./manage-container";

export const ManagePageLayoutView = ({
  title,
  breadcrumb,
  primaryAction,
  toolbar,
  footer,
  floatingPrimaryAction,
  floatingActionBottomOffset,
  size,
  children,
}: ManagePageLayoutViewProps) => {
  const titleNode = typeof title === "string" ? <Title>{title}</Title> : title;

  return (
    <ManageContainer size={size}>
      {breadcrumb}
      <Stack pb={floatingPrimaryAction ? { base: floatingActionBottomOffset, md: 0 } : undefined}>
        <Group justify="space-between" align="center">
          {titleNode}
          {primaryAction}
        </Group>
        {toolbar}
        {children}
        {footer && <Group justify="end">{footer}</Group>}
      </Stack>
    </ManageContainer>
  );
};

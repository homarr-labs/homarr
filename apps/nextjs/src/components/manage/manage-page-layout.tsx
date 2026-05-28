import type { ReactNode } from "react";
import type { MantineSize } from "@mantine/core";
import { Group, Stack, Title } from "@mantine/core";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ManageContainer } from "./manage-container";
import { MANAGE_FLOATING_ACTION_BOTTOM_OFFSET } from "./manage-page.constants";

interface ManagePageLayoutProps {
  title: ReactNode;
  primaryAction?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  floatingPrimaryAction?: boolean;
  size?: MantineSize;
  children: ReactNode;
}

export const ManagePageLayout = ({
  title,
  primaryAction,
  toolbar,
  footer,
  floatingPrimaryAction,
  size,
  children,
}: ManagePageLayoutProps) => {
  const titleNode = typeof title === "string" ? <Title>{title}</Title> : title;

  return (
    <ManageContainer size={size}>
      <DynamicBreadcrumb />
      <Stack pb={floatingPrimaryAction ? { base: MANAGE_FLOATING_ACTION_BOTTOM_OFFSET, md: 0 } : undefined}>
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

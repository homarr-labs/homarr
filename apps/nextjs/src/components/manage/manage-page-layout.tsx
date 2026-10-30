import type { ReactNode } from "react";
import type { MantineSize } from "@mantine/core";
import { Group, Stack, Title } from "@mantine/core";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ManageContainer } from "./manage-container";
import { MANAGE_FLOATING_ACTION_BOTTOM_OFFSET } from "./manage-page.constants";

export interface ManagePageLayoutProps {
  title: ReactNode;
  /** Overrides the default breadcrumb, e.g. to map a dynamic route segment onto a readable name. */
  breadcrumb?: ReactNode;
  primaryAction?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  floatingPrimaryAction?: boolean;
  size?: MantineSize;
  children: ReactNode;
}

export const ManagePageLayout = ({
  title,
  breadcrumb,
  primaryAction,
  toolbar,
  footer,
  floatingPrimaryAction,
  size,
  children,
}: ManagePageLayoutProps) => {
  return (
    <ManageContainer size={size}>
      {breadcrumb ?? <DynamicBreadcrumb />}
      <Stack pb={floatingPrimaryAction ? { base: MANAGE_FLOATING_ACTION_BOTTOM_OFFSET, md: 0 } : undefined}>
        <ManagePageHeader title={title} primaryAction={primaryAction} />
        {toolbar}
        {children}
        {footer && <Group justify="end">{footer}</Group>}
      </Stack>
    </ManageContainer>
  );
};

export const ManagePageHeader = ({ title, primaryAction }: Pick<ManagePageLayoutProps, "title" | "primaryAction">) => (
  <Group justify="space-between" align="center">
    {typeof title === "string" ? <Title>{title}</Title> : title}
    {primaryAction}
  </Group>
);

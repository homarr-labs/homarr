import type { ReactNode } from "react";
import type { MantineSize } from "@mantine/core";
import { Container, Group, Stack, Title } from "@mantine/core";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ManageContainer } from "./manage-container";
import { MANAGE_FLOATING_ACTION_BOTTOM_OFFSET } from "./manage-page.constants";

export interface ManagePageLayoutProps {
  title: ReactNode;
  /** Overrides the default breadcrumb, e.g. to map a dynamic route segment onto a readable name. */
  breadcrumb?: ReactNode;
  /** Uses the management frame by default; forms can retain native padding and tools can span the shell. */
  container?: "manage" | "default" | false;
  breadcrumbPlacement?: "inside" | "outside";
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
  container = "manage",
  breadcrumbPlacement = "inside",
  primaryAction,
  toolbar,
  footer,
  floatingPrimaryAction,
  size,
  children,
}: ManagePageLayoutProps) => {
  const titleNode = typeof title === "string" ? <Title>{title}</Title> : title;
  const breadcrumbNode = breadcrumb ?? <DynamicBreadcrumb />;

  let content = (
    <>
      {breadcrumbPlacement === "inside" && breadcrumbNode}
      <Stack pb={floatingPrimaryAction ? { base: MANAGE_FLOATING_ACTION_BOTTOM_OFFSET, md: 0 } : undefined}>
        <Group justify="space-between" align="center">
          {titleNode}
          {primaryAction}
        </Group>
        {toolbar}
        {children}
        {footer && <Group justify="end">{footer}</Group>}
      </Stack>
    </>
  );

  if (container === "manage") {
    content = <ManageContainer size={size}>{content}</ManageContainer>;
  } else if (container === "default") {
    content = <Container size={size}>{content}</Container>;
  }

  return (
    <>
      {breadcrumbPlacement === "outside" && breadcrumbNode}
      {content}
    </>
  );
};

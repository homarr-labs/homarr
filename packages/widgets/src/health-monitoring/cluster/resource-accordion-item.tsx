import type { PropsWithChildren } from "react";
import type { MantineColor } from "@mantine/core";
import { Accordion, Badge, Group, Text } from "@mantine/core";

import type { TablerIcon } from "@homarr/ui";

interface ResourceAccordionItemProps {
  value: string;
  title: string;
  icon: TablerIcon;
  badge: {
    color: MantineColor;
    activeCount: number;
    totalCount: number;
  };
}

export const ResourceAccordionItem = ({
  value,
  title,
  icon: Icon,
  badge,
  children,
}: PropsWithChildren<ResourceAccordionItemProps>) => {
  return (
    <Accordion.Item value={value}>
      <Accordion.Control icon={<Icon />}>
        <Group style={{ rowGap: "0" }}>
          <Text>{title}</Text>
          <Badge variant="dot" color={badge.color} size="lg">
            {badge.activeCount} / {badge.totalCount}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>{children}</Accordion.Panel>
    </Accordion.Item>
  );
};

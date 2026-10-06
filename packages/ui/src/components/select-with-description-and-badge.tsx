"use client";

import type { MantineColor } from "@mantine/core";
import { Badge, Group, Text } from "@mantine/core";

import type { SelectWithCustomItemsProps } from "./select-with-custom-items";
import { SelectWithCustomItems } from "./select-with-custom-items";

export interface SelectItemWithDescriptionBadge {
  value: string;
  label: string;
  badge?: { label: string; color: MantineColor };
  description: string;
}
type Props = SelectWithCustomItemsProps<SelectItemWithDescriptionBadge>;

export const SelectWithDescriptionBadge = (props: Props) => {
  return <SelectWithCustomItems<SelectItemWithDescriptionBadge> {...props} SelectOption={SelectOption} />;
};

const SelectOption = ({
  label,
  description,
  badge,
  selected = false,
}: SelectItemWithDescriptionBadge & { selected?: boolean }) => {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs" w="100%">
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text fz="sm" fw={500} truncate={selected}>
          {label}
        </Text>
        <Text fz="xs" opacity={0.6} truncate={selected}>
          {description}
        </Text>
      </div>

      {badge && (
        <Badge color={badge.color} variant="outline" size="sm" style={{ flexShrink: 0 }}>
          {badge.label}
        </Badge>
      )}
    </Group>
  );
};

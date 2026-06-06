"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Card, Group, Text } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

export function DisplayNode({ data }: NodeProps) {
  const t = useScopedI18n("customWidget.flowEditor");
  return (
    <Card withBorder p="xs" w={200} style={{ borderColor: "var(--mantine-color-green-6)" }}>
      <Handle type="target" position={Position.Top} id="value" />
      <Group gap="xs" wrap="nowrap">
        <IconEye size={16} color="var(--mantine-color-green-6)" />
        <Text size="xs" fw={600} lineClamp={1}>
          {(data.label as string) ?? t("category.displays")}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
        {(data.displayLabel as string) ?? ""}
      </Text>
    </Card>
  );
}

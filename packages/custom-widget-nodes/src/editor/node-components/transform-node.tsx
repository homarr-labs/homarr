"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Card, Group, Text } from "@mantine/core";
import { IconTransform } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

export function TransformNode({ data }: NodeProps) {
  const t = useScopedI18n("customWidget.flowEditor");
  return (
    <Card withBorder p="xs" w={200}>
      <Handle type="target" position={Position.Top} id="json" />
      <Group gap="xs" wrap="nowrap">
        <IconTransform size={16} />
        <Text size="xs" fw={600} lineClamp={1}>
          {(data.label as string) ?? t("category.transforms")}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
        {(data.expression as string) ?? (data.template as string) ?? ""}
      </Text>
      <Handle type="source" position={Position.Bottom} id="value" />
    </Card>
  );
}

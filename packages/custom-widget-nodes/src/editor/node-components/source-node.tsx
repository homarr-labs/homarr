"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Card, Group, Text } from "@mantine/core";
import { IconCloud } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

export function SourceNode({ data }: NodeProps) {
  const t = useScopedI18n("customWidget.flowEditor");
  return (
    <Card withBorder p="xs" w={200}>
      <Group gap="xs" wrap="nowrap">
        <IconCloud size={16} />
        <Text size="xs" fw={600} lineClamp={1}>
          {(data.label as string) ?? t("node.httpRequest")}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
        {(data.url as string) ?? ""}
      </Text>
      <Handle type="source" position={Position.Bottom} id="response" />
    </Card>
  );
}

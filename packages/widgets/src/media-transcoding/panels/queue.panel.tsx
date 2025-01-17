import { Center, Group, ScrollArea, Table, Text, Title, Tooltip } from "@mantine/core";
import { IconHeartbeat, IconTransform } from "@tabler/icons-react";

import { humanFileSize } from "@homarr/common";
import type { TdarrQueue } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

interface QueuePanelProps {
  queue: TdarrQueue;
}

export function QueuePanel(props: QueuePanelProps) {
  const { queue } = props;

  const t = useI18n("widget.mediaTranscoding.panel.queue");

  if (queue.array.length === 0) {
    return (
      <Center style={{ flex: "1" }}>
        <Title order={3}>{t("empty")}</Title>
      </Center>
    );
  }

  return (
    <ScrollArea style={{ flex: "1" }}>
      <Table style={{ tableLayout: "fixed" }}>
        <Table.Thead>
          <tr>
            <th>{t("table.file")}</th>
            <th style={{ width: 80 }}>{t("table.size")}</th>
          </tr>
        </Table.Thead>
        <Table.Tbody>
          {queue.array.map((item) => (
            <tr key={item.id}>
              <td>
                <Group gap="xs" wrap="nowrap">
                  <div>
                    {item.type === "transcode" ? (
                      <Tooltip label={t("table.transcode")}>
                        <IconTransform size={14} />
                      </Tooltip>
                    ) : (
                      <Tooltip label={t("table.healthCheck")}>
                        <IconHeartbeat size={14} />
                      </Tooltip>
                    )}
                  </div>
                  <Text lineClamp={1} size="xs">
                    {item.filePath.split("\\").pop()?.split("/").pop() ?? item.filePath}
                  </Text>
                </Group>
              </td>
              <td>
                <Text size="xs">{humanFileSize(item.fileSize)}</Text>
              </td>
            </tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

import {
  Center,
  Group,
  ScrollArea,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconHeartbeat, IconTransform } from "@tabler/icons-react";

import { formatBytes } from "@homarr/common";
import type { TdarrQueue } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

interface QueuePanelProps {
  queue: TdarrQueue;
}

export function QueuePanel(props: QueuePanelProps) {
  const { queue } = props;

  const t = useI18n("widget.mediaTranscoding.panel.queue");

  if (queue.array.length === 0) {
    return (
      <Center style={{ flex: "1" }}>
        <Title order={6}>{t("empty")}</Title>
      </Center>
    );
  }

  return (
    <ScrollArea style={{ flex: "1" }}>
      <Table style={{ tableLayout: "fixed" }}>
        <TableThead>
          <TableTr>
            <TableTh ta="start" py={4}>
              <Text size="xs" fw="bold">
                {t("table.file")}
              </Text>
            </TableTh>
            <TableTh ta="start" py={4}>
              <Text size="xs" fw="bold">
                {t("table.size")}
              </Text>
            </TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {queue.array.map((item) => (
            <TableTr key={item.id}>
              <TableTd py={2}>
                <Group gap={4} wrap="nowrap">
                  {item.type === "transcode" ? (
                    <Tooltip label={t("table.transcode")}>
                      <IconTransform style={iconSizes.xs} />
                    </Tooltip>
                  ) : (
                    <Tooltip label={t("table.healthCheck")}>
                      <IconHeartbeat style={iconSizes.xs} />
                    </Tooltip>
                  )}
                  <Text lineClamp={1} size="xs">
                    {item.filePath.split("\\").pop()?.split("/").pop() ?? item.filePath}
                  </Text>
                </Group>
              </TableTd>
              <TableTd py={2}>
                <Text size="xs">{formatBytes(item.fileSize)}</Text>
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    </ScrollArea>
  );
}

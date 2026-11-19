import { Group, TableTd, TableTh, TableTr, Text, Tooltip } from "@mantine/core";
import { IconHeartbeat, IconTransform } from "@tabler/icons-react";

import type { TdarrQueue } from "@homarr/integrations";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import { TranscodingPanelTable } from "./panel-table";

interface QueuePanelProps {
  queue: TdarrQueue;
}

export function QueuePanel(props: QueuePanelProps) {
  const { queue } = props;
  const { formatBytes } = useByteFormatter();

  const tFields = useI18n("common.field");
  const tCommon = useI18n("widget.mediaTranscoding.panel.common");

  return (
    <TranscodingPanelTable
      empty={queue.array.length === 0}
      head={
        <>
          <TableTh>{tCommon("file")}</TableTh>
          <TableTh>{tFields("size")}</TableTh>
        </>
      }
    >
      {queue.array.map((item) => (
        <TableTr key={item.id}>
          <TableTd>
            <Group gap={4} wrap="nowrap">
              {item.type === "transcode" ? (
                <Tooltip label={tCommon("transcode")}>
                  <IconTransform size="var(--mantine-font-size-xs)" style={{ flexShrink: 0 }} />
                </Tooltip>
              ) : (
                <Tooltip label={tCommon("healthCheck")}>
                  <IconHeartbeat size="var(--mantine-font-size-xs)" style={{ flexShrink: 0 }} />
                </Tooltip>
              )}
              <Text lineClamp={1} size="xs">
                {item.filePath.split("\\").pop()?.split("/").pop() ?? item.filePath}
              </Text>
            </Group>
          </TableTd>
          <TableTd>
            <Text size="xs">{formatBytes(item.fileSize)}</Text>
          </TableTd>
        </TableTr>
      ))}
    </TranscodingPanelTable>
  );
}

import { Center, Group, Progress, ScrollArea, Table, Text, Title, Tooltip } from "@mantine/core";
import { IconHeartbeat, IconTransform } from "@tabler/icons-react";

import type { TdarrWorker } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

interface WorkersPanelProps {
  workers: TdarrWorker[];
}

export function WorkersPanel(props: WorkersPanelProps) {
  const t = useI18n("widget.mediaTranscoding.panel.workers");

  if (props.workers.length === 0) {
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
            <th style={{ width: 60 }}>{t("table.eta")}</th>
            <th style={{ width: 175 }}>{t("table.progress")}</th>
          </tr>
        </Table.Thead>
        <Table.Tbody>
          {props.workers.map((worker) => (
            <tr key={worker.id}>
              <td>
                <Group gap="xs" wrap="nowrap">
                  <div>
                    {worker.jobType === "transcode" ? (
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
                    {worker.filePath.split("\\").pop()?.split("/").pop() ?? worker.filePath}
                  </Text>
                </Group>
              </td>
              <td>
                <Text size="xs">{worker.ETA.startsWith("0:") ? worker.ETA.substring(2) : worker.ETA}</Text>
              </td>
              <td>
                <Group wrap="nowrap" gap="xs">
                  <Text size="xs">{worker.step}</Text>
                  <Progress
                    value={worker.percentage}
                    size="lg"
                    radius="xl"
                    style={{
                      flex: 1,
                    }}
                  />
                  <Text size="xs">{Math.round(worker.percentage)}%</Text>
                </Group>
              </td>
            </tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

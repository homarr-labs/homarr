import { Group, Progress, TableTd, TableTh, TableTr, Text, Tooltip } from "@mantine/core";
import { IconHeartbeat, IconTransform } from "@tabler/icons-react";

import type { TdarrWorker } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

import { TranscodingPanelTable } from "./panel-table";

interface WorkersPanelProps {
  workers: TdarrWorker[];
  isTiny: boolean;
}

export function WorkersPanel(props: WorkersPanelProps) {
  const t = useI18n("widget.mediaTranscoding.panel.workers");
  const tCommon = useI18n("widget.mediaTranscoding.panel.common");

  return (
    <TranscodingPanelTable
      empty={props.workers.length === 0}
      head={
        <>
          <TableTh>{tCommon("file")}</TableTh>
          <TableTh w={50}>{t("table.eta")}</TableTh>
          <TableTh>{t("table.progress")}</TableTh>
        </>
      }
    >
      {props.workers.map((worker) => {
        const fileName = worker.filePath.split("\\").pop()?.split("/").pop() ?? worker.filePath;
        return (
          <TableTr key={worker.id}>
            <TableTd>
              <Group gap="xs" wrap="nowrap">
                <div>
                  {worker.jobType === "transcode" ? (
                    <Tooltip label={tCommon("transcode")}>
                      <IconTransform size="var(--mantine-font-size-sm)" style={{ flexShrink: 0 }} />
                    </Tooltip>
                  ) : (
                    <Tooltip label={tCommon("healthCheck")}>
                      <IconHeartbeat size="var(--mantine-font-size-sm)" style={{ flexShrink: 0 }} />
                    </Tooltip>
                  )}
                </div>
                <Text lineClamp={1} size="xs" title={fileName}>
                  {fileName}
                </Text>
              </Group>
            </TableTd>
            <TableTd>
              <Text size="xs">{worker.ETA.startsWith("0:") ? worker.ETA.substring(2) : worker.ETA}</Text>
            </TableTd>
            <TableTd>
              <Group wrap="nowrap" gap="xs">
                {!props.isTiny && (
                  <>
                    <Text size="xs">{worker.step}</Text>
                    <Progress
                      value={worker.percentage}
                      size="lg"
                      radius="xl"
                      style={{
                        flex: 1,
                      }}
                    />
                  </>
                )}
                <Text size="xs">{Math.round(worker.percentage)}%</Text>
              </Group>
            </TableTd>
          </TableTr>
        );
      })}
    </TranscodingPanelTable>
  );
}

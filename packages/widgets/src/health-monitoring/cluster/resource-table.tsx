import {
  Group,
  Indicator,
  Popover,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";

import { invariantTechnicalLabels } from "@homarr/definitions";
import type { Resource } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { ResourcePopover } from "./resource-popover";

interface ResourceTableProps {
  type: Resource["type"];
  data: Resource[];
  isTiny: boolean;
}

export const ResourceTable = ({ type, data, isTiny }: ResourceTableProps) => {
  const t = useI18n("widget.healthMonitoring");
  return (
    <Table highlightOnHover>
      <TableThead>
        <TableTr fz="xs">
          <TableTh ta="start" p={0}>
            {t("cluster.table.header.name")}
          </TableTh>
          {!isTiny && type !== "storage" ? (
            <TableTh ta="start" p={0}>
              {invariantTechnicalLabels.cpu}
            </TableTh>
          ) : null}
          {!isTiny && type !== "storage" ? (
            <TableTh ta="start" p={0}>
              {invariantTechnicalLabels.ram}
            </TableTh>
          ) : null}
          {!isTiny && type === "storage" ? (
            <TableTh ta="start" p={0}>
              {t("cluster.table.header.node")}
            </TableTh>
          ) : null}
        </TableTr>
      </TableThead>
      <TableTbody>
        {data
          .toSorted((itemA, itemB) => {
            const nodeResult = itemA.node.localeCompare(itemB.node);
            if (nodeResult !== 0) return nodeResult;
            return itemA.name.localeCompare(itemB.name);
          })
          .map((item) => {
            return (
              <ResourcePopover key={item.id} item={item}>
                <Popover.Target>
                  <TableTr fz="xs">
                    <TableTd>
                      <Group wrap="nowrap" gap={isTiny ? 8 : "xs"}>
                        <Indicator size={isTiny ? 6 : 8} color={item.isRunning ? "green" : "yellow"}>
                          {null}
                        </Indicator>
                        <Text lineClamp={1} fz="xs">
                          {item.name}
                        </Text>
                      </Group>
                    </TableTd>
                    {isTiny ? null : item.type === "storage" ? (
                      <TableTd style={{ WebkitLineClamp: "1" }}>{item.node}</TableTd>
                    ) : (
                      <>
                        <TableTd style={{ whiteSpace: "nowrap" }}>{(item.cpu.utilization * 100).toFixed(1)}%</TableTd>
                        <TableTd style={{ whiteSpace: "nowrap" }}>
                          {(item.memory.total ? (item.memory.used / item.memory.total) * 100 : 0).toFixed(1)}%
                        </TableTd>
                      </>
                    )}
                  </TableTr>
                </Popover.Target>
              </ResourcePopover>
            );
          })}
      </TableTbody>
    </Table>
  );
};

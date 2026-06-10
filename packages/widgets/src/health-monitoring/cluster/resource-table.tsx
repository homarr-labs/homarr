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

import type { Resource } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { ResourcePopover } from "./resource-popover";

interface ResourceTableProps {
  type: Resource["type"];
  data: Resource[];
  isTiny: boolean;
}

export const ResourceTable = ({ type, data, isTiny }: ResourceTableProps) => {
  const t = useI18n();
  return (
    <Table highlightOnHover>
      <TableThead>
        <TableTr fz={isTiny ? "8px" : "xs"}>
          <TableTh ta="start" p={0}>
            {t("widget.healthMonitoring.cluster.table.header.name")}
          </TableTh>
          {type !== "storage" ? (
            <TableTh ta="start" p={0}>
              {t("widget.healthMonitoring.cluster.table.header.cpu")}
            </TableTh>
          ) : null}
          {type !== "storage" ? (
            <TableTh ta="start" p={0}>
              {t("widget.healthMonitoring.cluster.table.header.memory")}
            </TableTh>
          ) : null}
          {type === "storage" ? (
            <TableTh ta="start" p={0}>
              {t("widget.healthMonitoring.cluster.table.header.node")}
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
                  <TableTr fz={isTiny ? "8px" : "xs"}>
                    <TableTd>
                      <Group wrap="nowrap" gap={isTiny ? 8 : "xs"}>
                        <Indicator size={isTiny ? 4 : 8} color={item.isRunning ? "green" : "yellow"}>
                          {null}
                        </Indicator>
                        <Text lineClamp={1} fz={isTiny ? "8px" : "xs"}>
                          {item.name}
                        </Text>
                      </Group>
                    </TableTd>
                    {item.type === "storage" ? (
                      <td style={{ WebkitLineClamp: "1" }}>{item.node}</td>
                    ) : (
                      <>
                        <td style={{ whiteSpace: "nowrap" }}>{(item.cpu.utilization * 100).toFixed(1)}%</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {(item.memory.total ? (item.memory.used / item.memory.total) * 100 : 0).toFixed(1)}%
                        </td>
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

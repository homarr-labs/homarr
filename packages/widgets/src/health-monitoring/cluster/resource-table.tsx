import { Group, Indicator, Popover, Table, Text } from "@mantine/core";

import type { Resource } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { ResourcePopover } from "./resource-popover";

interface ResourceTableProps {
  type: Resource["type"];
  data: Resource[];
}

export const ResourceTable = ({ type, data }: ResourceTableProps) => {
  const t = useI18n();
  return (
    <Table highlightOnHover>
      <thead>
        <tr>
          <Table.Th ta="start">{t("widget.healthMonitoring.cluster.table.header.name")}</Table.Th>
          {type !== "storage" ? (
            <Table.Th ta="start">{t("widget.healthMonitoring.cluster.table.header.cpu")}</Table.Th>
          ) : null}
          {type !== "storage" ? (
            <Table.Th ta="start">{t("widget.healthMonitoring.cluster.table.header.memory")}</Table.Th>
          ) : null}
          {type === "storage" ? (
            <Table.Th ta="start">{t("widget.healthMonitoring.cluster.table.header.node")}</Table.Th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => {
          return (
            <ResourcePopover key={item.name} item={item}>
              <Popover.Target>
                <tr>
                  <td>
                    <Group wrap="nowrap">
                      <Indicator size={14} children={null} color={item.isRunning ? "green" : "yellow"} />
                      <Text lineClamp={1}>{item.name}</Text>
                    </Group>
                  </td>
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
                </tr>
              </Popover.Target>
            </ResourcePopover>
          );
        })}
      </tbody>
    </Table>
  );
};

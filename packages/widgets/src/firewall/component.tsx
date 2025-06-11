"use client";

import { ScrollArea, Tabs, RingProgress, Center, Text, Table, TableTbody, TableThead, TableTr, Popover } from "@mantine/core";
import {
  IconCpu,
} from "@tabler/icons-react";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { useRequiredBoard } from "@homarr/boards/context";
import type { WidgetComponentProps } from "../definition";
import { progressColor } from "../health-monitoring/system-health";

dayjs.extend(duration);

export default function FirewallWidget({
                                         options,
                                         integrationIds,
                                         width,
                                       }: WidgetComponentProps<"firewall">) {
  const [firewallsData] = clientApi.widget.firewall.getFirewallStatus.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    }
  );

  console.log("Firewalls: ", firewallsData);

  const t = useI18n();
  const isTiny = width < 256;

  return (
    <ScrollArea h="100%">
      {firewallsData.map(({ integration, summary }) => (
        <Tabs key={integration.name} variant="outline">
          <Tabs.List grow>
            <Tabs.Tab value="system" fz="xs">
              <b>{t("widget.firewall.tab.system") + " " + integration.name}</b>
            </Tabs.Tab>
            <Tabs.Tab value="interfaces" fz="xs">
              <b>{t("widget.firewall.tab.interfaces") + " " + integration.name}</b>
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="system">
            <RingProgress
              className="firewall-cpu"
              roundCaps
              size={isTiny ? 50 : 100}
              thickness={isTiny ? 4 : 8}
              label={
                <Center style={{ flexDirection: "column" }}>
                  <Text className="firewall-cpu-utilization-value" size={isTiny ? "8px" : "xs"}>
                    {`${summary.cpu.idle.toFixed(2)}%`}
                  </Text>
                  <IconCpu className="firewall-cpu-utilization-icon" size={isTiny ? 8 : 16} />
                </Center>
              }
              sections={[
                {
                  value: Number(summary.cpu.idle.toFixed(2)),
                  color: progressColor(Number(summary.cpu.idle.toFixed(2))),
                },
              ]}
            />
            <RingProgress
              className="firewall-memory"
              roundCaps
              size={isTiny ? 50 : 100}
              thickness={isTiny ? 4 : 8}
              label={
                <Center style={{ flexDirection: "column" }}>
                  <Text className="firewall-memory-utilization-value" size={isTiny ? "8px" : "xs"}>
                    {`${summary.memory.percent.toFixed(2)}%`}
                  </Text>
                  <IconCpu className="firewall-memory-utilization-icon" size={isTiny ? 8 : 16} />
                </Center>
              }
              sections={[
                {
                  value: Number(summary.memory.percent.toFixed(2)),
                  color: progressColor(Number(summary.memory.percent.toFixed(2))),
                },
              ]}
            />
          </Tabs.Panel>
          <Tabs.Panel value="interfaces">
            <Table highlightOnHover>
              <TableThead>
                <TableTr fz={isTiny ? "8px" : "xs"}>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.interfaces.name")}
                  </Table.Th>
                    <Table.Th ta="start" p={0}>
                      {t("widget.firewall.widget.interfaces.trans")}
                    </Table.Th>
                    <Table.Th ta="start" p={0}>
                      {t("widget.firewall.widget.interfaces.recv")}
                    </Table.Th>
                </TableTr>
              </TableThead>
              <TableTbody>
                {summary.interfaces
                  .map((item) => {
                    return (
                          <TableTr fz={isTiny ? "8px" : "xs"}>
                            <td>
                              {item.name}
                            </td>
                            <td style={{ WebkitLineClamp: "1" }}>
                              {item.trans}
                            </td>
                            <td>
                              {item.recv}
                            </td>
                          </TableTr>
                    );
                  })}
              </TableTbody>
            </Table>

          </Tabs.Panel>
        </Tabs>
      ))}
    </ScrollArea>
  );
}
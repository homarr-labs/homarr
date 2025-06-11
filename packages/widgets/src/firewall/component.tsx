"use client";

import { ScrollArea, Tabs, RingProgress, Center, Text, Table, TableTbody, TableThead, TableTr, Flex, Accordion } from "@mantine/core";
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

  function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }
  return (
  <ScrollArea h="100%" >
      {firewallsData.map(({ integration, summary }) => (
        <Tabs key={integration.name} variant="outline">
          <Tabs.List grow>
            <Tabs.Tab value={integration.name} fz="xs">
              <b>{integration.name}</b>
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value={integration.name}>
            <Flex gap="sm"
                   className="firewall"
                   p="sm"
                   pos="relative"
            >
              <Text w="100%" pos="relative" align="center" top={8} left={8}>Version: <br/>{summary.version}</Text>
              <RingProgress
                className="firewall-cpu"
                roundCaps
                size={isTiny ? 50 : 100}
                thickness={isTiny ? 4 : 8}
                pos="relative"
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
                pos="relative"
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
            </Flex>
            <Accordion>
              <Accordion.Item value="interfaces">
                <Accordion.Control>{t("widget.firewall.widget.interfaces.title")}</Accordion.Control>
                <Accordion.Panel>
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
                      {summary.interfaces.map((item) => (
                        <TableTr key={item.name} fz={isTiny ? "8px" : "xs"}>
                          <td>{item.name}</td>
                          <td style={{ WebkitLineClamp: "1" }}>{formatBytes(item.trans)}</td>
                          <td>{formatBytes(item.recv)}</td>
                        </TableTr>
                      ))}
                    </TableTbody>
                  </Table>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Tabs.Panel>
        </Tabs>
      ))}
    </ScrollArea>
  )
}
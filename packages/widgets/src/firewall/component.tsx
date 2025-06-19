"use client";

import { Accordion, Progress, ScrollArea, Table, TableTbody, TableThead, TableTr, Tabs } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import type { FirewallInterfacesSummary, FirewallInterface } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(duration);

export function FirewallWidget({ integrationIds, width }: WidgetComponentProps<"firewall">) {
  const [firewallsCpuData] = clientApi.widget.firewall.getFirewallCpuStatus.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const [firewallsMemoryData] = clientApi.widget.firewall.getFirewallMemoryStatus.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const [firewallsInterfacesData] = clientApi.widget.firewall.getFirewallInterfacesStatus.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const [firewallsVersionData] = clientApi.widget.firewall.getFirewallVersionStatus.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();

  clientApi.widget.firewall.subscribeFirewallCpuStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.firewall.getFirewallCpuStatus.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }

            return prevData.map((item) =>
              item.integration.id === data.integration.id ? { ...item, summary: data.summary } : item,
            );
          },
        );
      },
    },
  );

  clientApi.widget.firewall.subscribeFirewallVersionStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.firewall.getFirewallVersionStatus.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }

            return prevData.map((item) =>
              item.integration.id === data.integration.id ? { ...item, summary: data.summary } : item,
            );
          },
        );
      },
    },
  );

  clientApi.widget.firewall.subscribeFirewallMemoryStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.firewall.getFirewallMemoryStatus.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }

            return prevData.map((item) =>
              item.integration.id === data.integration.id ? { ...item, summary: data.summary } : item,
            );
          },
        );
      },
    },
  );
  clientApi.widget.firewall.subscribeFirewallInterfacesStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        console.log("Ondata");
        utils.widget.firewall.getFirewallInterfacesStatus.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }
            console.log("Datas: ", data);
            return prevData.map((item) =>
              item.integration.id === data.integration.id ? { ...item, summary: data.summary } : item,
            );
          },
        );
      },
    },
  );
  const t = useI18n();
  const isTiny = width < 256;

  function formatBitsPerSec(bytes: number, decimals: number): string {
    if (bytes === 0) return "0 Bytes";

    const kilobyte = 1024;
    const sizes = ["bps", "Kbps", "Mbps", "Gbps", "Tbps", "Pbps", "Ebps", "Zbps", "Ybps"];

    const i = Math.floor(Math.log(bytes) / Math.log(kilobyte));

    return parseFloat((bytes / Math.pow(kilobyte, i)).toFixed(decimals)) + " " + sizes[i];
  }

  function calculateBandwidth(data: FirewallInterfacesSummary[]): { data: FirewallInterface[] } {
    const time1 = new Date(data[0].timestamp);
    const time2 = new Date(data[1].timestamp);
    const timeDiffInSeconds = (time1 - time2) / 1000;

    const result = {
      data: [] as FirewallInterface[],
      timestamp: new Date().toISOString(),
    };

    data[0].data.forEach((iface) => {
      const ifaceName = iface.name;
      const recv1 = iface.recv;
      const trans1 = iface.trans;

      const iface2 = data[1].data.find((i) => i.name === ifaceName);
      if (iface2) {
        const recv2 = iface2.recv;
        const trans2 = iface2.trans;

        const recvDiff = recv1 - recv2;
        const transDiff = trans1 - trans2;

        result.data.push({
          name: ifaceName,
          recv: (8 * recvDiff) / timeDiffInSeconds,
          trans: (8 * transDiff) / timeDiffInSeconds,
        });
      }
    });

    return result;
  }


  return (
    <ScrollArea h="100%">
      <Accordion>
        <Accordion.Item value="version">
          <Accordion.Control size={isTiny ? "8px" : "xs"}>{t("widget.firewall.widget.versiontitle")}</Accordion.Control>

          <Accordion.Panel>
            <Table highlightOnHover>
              <TableThead>
                <TableTr fz={isTiny ? "8px" : "xs"}>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.fwname")}
                  </Table.Th>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.version")}
                  </Table.Th>
                </TableTr>
              </TableThead>
              <TableTbody>
                {firewallsVersionData.map(({ integration, summary }) => (
                  <TableTr key={integration.name} fz={isTiny ? "8px" : "xs"}>
                    <td>{integration.name}</td>
                    <td style={{ WebkitLineClamp: "1" }}>{summary.version}</td>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <Accordion>
        <Accordion.Item value="cpu">
          <Accordion.Control size={isTiny ? "8px" : "xs"}>{t("widget.firewall.widget.cputitle")}</Accordion.Control>
          <Accordion.Panel>
            <Table highlightOnHover>
              <TableThead>
                <TableTr fz={isTiny ? "8px" : "xs"}>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.fwname")}
                  </Table.Th>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.cpu")}
                  </Table.Th>
                </TableTr>
              </TableThead>
              <TableTbody>
                {firewallsCpuData.map(({ integration, summary }) => (
                  <TableTr key={integration.name} fz={isTiny ? "8px" : "xs"}>
                    <Table.Td>{integration.name}</Table.Td>
                    <Table.Td style={{ WebkitLineClamp: "1" }}>
                      <Progress.Root>
                        <Progress.Section
                          value={summary.total}
                          color={summary.total < 75 ? "yellow" : "red"}
                          radius="lg"
                        />
                      </Progress.Root>
                      {summary.total}%
                    </Table.Td>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <Accordion>
        <Accordion.Item value="memory">
          <Accordion.Control size={isTiny ? "8px" : "xs"}>{t("widget.firewall.widget.memorytitle")}</Accordion.Control>
          <Accordion.Panel>
            <Table highlightOnHover>
              <TableThead>
                <TableTr fz={isTiny ? "8px" : "xs"}>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.fwname")}
                  </Table.Th>
                  <Table.Th ta="start" p={0}>
                    {t("widget.firewall.widget.memory")}
                  </Table.Th>
                </TableTr>
                <TableTbody>
                  {firewallsMemoryData.map(({ integration, summary }) => (
                    <TableTr key={integration.name} fz={isTiny ? "8px" : "xs"}>
                      <Table.Td>{integration.name}</Table.Td>
                      <Table.Td style={{ WebkitLineClamp: "1" }}>
                        <Progress.Root>
                          <Progress.Section
                            value={summary.percent}
                            color={summary.percent.toFixed(1) < 75 ? "yellow" : "red"}
                            radius="lg"
                          />
                        </Progress.Root>
                        {summary.percent.toFixed(1)}%
                      </Table.Td>
                    </TableTr>
                  ))}
                </TableTbody>
              </TableThead>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion>
        <Accordion.Item value="interfaces">
          <Accordion.Control size={isTiny ? "8px" : "xs"}>
            {t("widget.firewall.widget.interfaces.title")}
          </Accordion.Control>
          <Accordion.Panel>
            {firewallsInterfacesData.map(({ integration, summary }) => (
              <Tabs key={integration.name} defaultValue={firewallsInterfacesData[0].integration.name} variant="outline">
                <Tabs.List grow>
                  <Tabs.Tab value={integration.name} fz="xs">
                    <b>{integration.name}</b>
                  </Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value={integration.name}>
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
                      {Array.isArray(summary) && summary.every(item => Array.isArray(item.data)) ? (
                        calculateBandwidth(summary).data.map(({ name, recv, trans }) => (
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                          <TableTr key={name} fz={isTiny ? "8px" : "xs"}>
                            <Table.Td>{name}</Table.Td>
                            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */}
                            <Table.Td style={{ WebkitLineClamp: "1" }}>{formatBitsPerSec(trans, 2)}</Table.Td>
                            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */}
                            <Table.Td>{formatBitsPerSec(recv, 2)}</Table.Td>
                          </TableTr>
                        ))
                      ) : (
                        <TableTr></TableTr>
                      )}

                    </TableTbody>
                  </Table>
                </Tabs.Panel>
              </Tabs>
            ))}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </ScrollArea>
  );
}

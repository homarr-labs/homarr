"use client";

import { Accordion, Progress, ScrollArea, Table, TableTbody, TableThead, TableTr, Tabs } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { FirewallInterface, FirewallInterfacesSummary } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function FirewallWidget({ integrationIds, width }: WidgetComponentProps<"firewall">) {
  const firewallsCpuData = useUpdatingCpuStatus(integrationIds);
  const firewallsMemoryData = useUpdatingMemoryStatus(integrationIds);
  const firewallsVersionData = useUpdatingVersionStatus(integrationIds);
  const firewallsInterfacesData = useUpdatingInterfacesStatus(integrationIds);

  const t = useI18n();
  const isTiny = width < 256;

  const defaultTabValue = firewallsInterfacesData[0] ? firewallsInterfacesData[0].integration.name : "";

  return (
    <ScrollArea h="100%">
      <Accordion>
        <Accordion.Item value="version">
          <Accordion.Control>{t("widget.firewall.widget.versiontitle")}</Accordion.Control>

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
                    <td>{summary.version}</td>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <Accordion>
        <Accordion.Item value="cpu">
          <Accordion.Control>{t("widget.firewall.widget.cputitle")}</Accordion.Control>
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
                          color={summary.total > 50 ? (summary.total < 75 ? "yellow" : "red") : "green"}
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
          <Accordion.Control>{t("widget.firewall.widget.memorytitle")}</Accordion.Control>
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
              </TableThead>
              <TableTbody>
                {firewallsMemoryData.map(({ integration, summary }) => (
                  <TableTr key={integration.name} fz={isTiny ? "8px" : "xs"}>
                    <Table.Td>{integration.name}</Table.Td>
                    <Table.Td style={{ WebkitLineClamp: "1" }}>
                      <Progress.Root>
                        <Progress.Section
                          value={summary.percent}
                          color={summary.percent > 50 ? (summary.percent < 75 ? "yellow" : "red") : "green"}
                        />
                      </Progress.Root>
                      {summary.percent.toFixed(1)}%
                    </Table.Td>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion>
        <Accordion.Item value="interfaces">
          <Accordion.Control>{t("widget.firewall.widget.interfaces.title")}</Accordion.Control>
          <Accordion.Panel>
            {firewallsInterfacesData.map(({ integration, summary }) => (
              <Tabs key={integration.name} defaultValue={defaultTabValue} variant="outline">
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
                      {Array.isArray(summary) && summary.every((item) => Array.isArray(item.data)) ? (
                        calculateBandwidth(summary).data.map(({ name, receive, transmit }) => (
                          <TableTr key={name} fz={isTiny ? "8px" : "xs"}>
                            <Table.Td>{name}</Table.Td>
                            <Table.Td style={{ WebkitLineClamp: "1" }}>{formatBitsPerSec(transmit, 2)}</Table.Td>
                            <Table.Td>{formatBitsPerSec(receive, 2)}</Table.Td>
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

export const useUpdatingCpuStatus = (integrationIds: string[]) => {
  const utils = clientApi.useUtils();
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

  return firewallsCpuData;
};

export const useUpdatingMemoryStatus = (integrationIds: string[]) => {
  const utils = clientApi.useUtils();
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

  return firewallsMemoryData;
};

export const useUpdatingVersionStatus = (integrationIds: string[]) => {
  const utils = clientApi.useUtils();
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
  return firewallsVersionData;
};

export const useUpdatingInterfacesStatus = (integrationIds: string[]) => {
  const utils = clientApi.useUtils();
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

  clientApi.widget.firewall.subscribeFirewallInterfacesStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.firewall.getFirewallInterfacesStatus.setData(
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

  return firewallsInterfacesData;
};

export function formatBitsPerSec(bytes: number, decimals: number): string {
  if (bytes === 0) return "0 Bytes";

  const kilobyte = 1024;
  const sizes = ["b/s", "kb/s", "Mb/s", "Gb/s", "Tb/s", "Pb/s", "Eb/s", "Zb/s", "Yb/s"];

  const i = Math.floor(Math.log(bytes) / Math.log(kilobyte));

  return `${parseFloat((bytes / Math.pow(kilobyte, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function calculateBandwidth(data: FirewallInterfacesSummary[]): { data: FirewallInterface[] } {
  const result = {
    data: [] as FirewallInterface[],
    timestamp: new Date().toISOString(),
  };

  if (data.length > 1) {
    const firstData = data[0];
    const secondData = data[1];

    if (firstData && secondData) {
      const time1 = new Date(firstData.timestamp);
      const time2 = new Date(secondData.timestamp);
      const timeDiffInSeconds = (time1.getTime() - time2.getTime()) / 1000;

      firstData.data.forEach((iface) => {
        const ifaceName = iface.name;
        const recv1 = iface.receive;
        const trans1 = iface.transmit;

        const iface2 = secondData.data.find((i) => i.name === ifaceName);

        if (iface2) {
          const recv2 = iface2.receive;
          const trans2 = iface2.transmit;
          const recvDiff = recv1 - recv2;
          const transDiff = trans1 - trans2;

          result.data.push({
            name: ifaceName,
            receive: (8 * recvDiff) / timeDiffInSeconds,
            transmit: (8 * transDiff) / timeDiffInSeconds,
          });
        }
      });
    }
  }

  return result;
}

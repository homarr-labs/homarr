"use client";

import { Accordion, Progress, ScrollArea, Table, TableTbody, TableThead, TableTr, Tabs } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import { FirewallInterfacesSummary } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(duration);

export default function FirewallWidget({ integrationIds, width }: WidgetComponentProps<"firewall">) {
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
        utils.widget.firewall.getFirewallInterfacesStatus.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }

            // compute the delta between prevData and data
            console.log(prevData, data);
            const prevInterfacesMap: { [key: string]: FirewallInterfacesSummary } = {};
            prevData[0].summary.forEach((iface) => {
              prevInterfacesMap[iface.name] = iface;
            });

            return prevData.map((item) =>
              item.integration.id === data.integration.id
                ? {
                    ...item,
                    summary: data.summary.map((iface) => ({
                      name: iface.name,
                      recv: iface.recv - prevInterfacesMap[iface.name].recv,
                      trans: iface.trans - prevInterfacesMap[iface.name].trans,
                    })),
                  }
                : item,
            );
          },
        );
      },
    },
  );
  const t = useI18n();
  const isTiny = width < 256;

  function formatBytes(bytes: number, decimals: number): string {
    if (bytes === 0) return "0 Bytes";

    const kilobyte = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(kilobyte));

    return parseFloat((bytes / Math.pow(kilobyte, i)).toFixed(decimals)) + " " + sizes[i];
  }
  /*console.log("firewallsCpuData: ", firewallsCpuData);
  console.log("firewallsVersionData: ", firewallsVersionData);
  console.log("firewallsInterfacesData: ", firewallsInterfacesData);
  console.log("firewallsMemoryData: ", firewallsMemoryData);
*/

  if (
    !Array.isArray(firewallsCpuData) ||
    !Array.isArray(firewallsVersionData) ||
    !Array.isArray(firewallsMemoryData) ||
    !Array.isArray(firewallsInterfacesData)
  ) {
    console.log("ERROR firewallsCpuData: ", firewallsCpuData);
    console.log("ERROR firewallsMemoryData: ", firewallsMemoryData);
    console.log("ERROR firewallsInterfacesData: ", firewallsInterfacesData);
    console.log("ERROR firewallsVersionData: ", firewallsInterfacesData);
    return <div>No data available</div>;
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
                        { summary.total }%
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
                        { summary.percent.toFixed(1) }%
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
                      {summary.map((item) => (
                        <TableTr key={item.name} fz={isTiny ? "8px" : "xs"}>
                          <td>{item.name}</td>
                          <td style={{ WebkitLineClamp: "1" }}>{formatBytes(item.trans, 2)}</td>
                          <td>{formatBytes(item.recv, 2)}</td>
                        </TableTr>
                      ))}
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

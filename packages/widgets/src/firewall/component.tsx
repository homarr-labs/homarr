"use client";

import { Accordion, Progress, ScrollArea, Table, TableTbody, TableThead, TableTr, Tabs } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { calculateBandwidth, formatBitsPerSec } from "./functions";
import {
  useUpdatingCpuStatus,
  useUpdatingInterfacesStatus,
  useUpdatingMemoryStatus,
  useUpdatingVersionStatus,
} from "./hooks/datas";

dayjs.extend(duration);

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

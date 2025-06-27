"use client";

import { useState } from 'react';
import { Accordion, Center, Group, ScrollArea, RingProgress, Table, Menu, UnstyledButton, Text, Flex } from "@mantine/core";
import { IconChevronDown, IconCpu, IconBrain, IconArrowBarDown, IconArrowBarUp } from '@tabler/icons-react';
import { clientApi } from "@homarr/api/client";
import type { FirewallInterface, FirewallInterfacesSummary } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "../definition";

export default function FirewallWidget({ integrationIds, width }: WidgetComponentProps<"firewall">) {
  const firewallsCpuData = useUpdatingCpuStatus(integrationIds);
  const firewallsMemoryData = useUpdatingMemoryStatus(integrationIds);
  const firewallsVersionData = useUpdatingVersionStatus(integrationIds);
  const firewallsInterfacesData = useUpdatingInterfacesStatus(integrationIds);

  const [opened, setOpened] = useState(false);
  const initialSelectedFirewall = firewallsVersionData[0] ?? {
    integration: {
      id: 'default-id',
      name: 'Default Firewall',
      kind: 'opnsense',
      updatedAt: new Date(),
    },
    summary: {
      version: '0.0.0_0',
    },
  };


  interface FirewallIntegration {
    id: string;
    name: string;
    kind: string;
    updatedAt: Date;
  }

  interface FirewallSummary {
    version: string;
  }

  interface Firewall {
    integration: FirewallIntegration;
    summary: FirewallVersionSummary;
  }
  const [selectedFirewall, setSelectedFirewall] = useState<Firewall>(initialSelectedFirewall);


  const dropdownItems = firewallsVersionData.map(({ integration }) => (
    <Menu.Item onClick={() => setSelectedFirewall(integration)} key={integration.id}>
      {integration.name}
    </Menu.Item>
  ));

  const t = useI18n();
  const isTiny = width < 256;

  return (
    <ScrollArea h="100%">
      <Flex justify="space-beetween" align-items="center"> 
      <Menu
        onOpen={() => setOpened(true)}
        onClose={() => setOpened(false)}
        radius="md"
        width="target"
        withinPortal
      >
        <Menu.Target>
          <UnstyledButton data-expanded={opened || undefined}>
            <Group gap="xs">
              <span>{selectedFirewall.integration?.name}</span>
              <IconChevronDown size={16} stroke={1.5} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>{dropdownItems}</Menu.Dropdown>
      </Menu>

      <Text margin-left="auto">
        {firewallsVersionData
          .filter(({ integration }) => integration.id === selectedFirewall.integration?.id)
          .map(({ summary }) => (
            <span key={summary.version}>{formatVersion(summary.version)}</span>
          ))}
      </Text>
      </Flex>
      <Flex justify="center" align="center" wrap="wrap">
      {firewallsCpuData
        .filter(({ integration }) => integration.id === selectedFirewall.integration?.id)
        .map(({ summary }, index) => (
          <RingProgress
            key={index}
            roundCaps
            size={isTiny ? 50 : 100}
            thickness={isTiny ? 4 : 8}
            label={
              <Center style={{ flexDirection: "column" }}>
                <Text size={isTiny ? "8px" : "xs"}>
                  {`${summary.total.toFixed(2)}%`}
                </Text>
                <IconCpu size={isTiny ? 8 : 16} />
              </Center>
            }
            sections={[
              {
                value: Number(summary.total.toFixed(1)),
                color: summary.total > 50 ? summary.total < 75 ? "yellow" : "red" : "green",
              },
            ]}
          />
        ))}
      {firewallsMemoryData
        .filter(({ integration }) => integration.id === selectedFirewall.integration?.id)
        .map(({ summary }, index) => (
          <RingProgress
            key={index}
            roundCaps
            size={isTiny ? 50 : 100}
            thickness={isTiny ? 4 : 8}
            label={
              <Center style={{ flexDirection: "column" }}>
                <Text size={isTiny ? "8px" : "xs"}>
                  {`${summary.percent.toFixed(1)}%`}
                </Text>
                <IconBrain size={isTiny ? 8 : 16} />
              </Center>
            }
            sections={[
              {
                value: Number(summary.percent.toFixed(1)),
                color: summary.percent > 50 ? summary.percent < 75 ? "yellow" : "red" : "green",
              },
            ]}
          />
        ))}
</Flex>
      <Accordion>
        <Accordion.Item value="interfaces">
          <Accordion.Control>{t("widget.firewall.widget.interfaces.title")}</Accordion.Control>
          <Accordion.Panel>
            {firewallsInterfacesData.map(({ integration, summary }) => (
              <Table key={integration.name} highlightOnHover>
                <Table.Tbody>
                  {Array.isArray(summary) && summary.every((item) => Array.isArray(item.data)) ? (
                    calculateBandwidth(summary).data.map(({ name, receive, transmit }) => (
                      <Table.Tr key={name}>
                        <Table.Td style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Text size={isTiny ? "8px" : "xs"} color="lightblue">{name}</Text></Table.Td>
                        <Table.Td><Flex align-items="center" gap="4"><IconArrowBarUp /><Text size={isTiny ? "8px" : "xs"} color="lightgreen">{formatBitsPerSec(transmit, 2)}</Text></Flex></Table.Td>
                        <Table.Td><Flex align-items="center" gap="4"><IconArrowBarDown /><Text size={isTiny ? "8px" : "xs"} color="yellow">{formatBitsPerSec(receive, 2)}</Text></Flex></Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr></Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
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
  if (bytes === 0) return "0 b/s";

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

export function formatVersion(inputString: string): string {
  const regex = /(\d+\.\d+\.\d+_\d+)/;
  const match = regex.exec(inputString);
  if (match?.[1]) {
    return match[1];
  } else {
    return "Unknown Version";
  }
}
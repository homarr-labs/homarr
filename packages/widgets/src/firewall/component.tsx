"use client";

import { ScrollArea, Tabs, RingProgress, Center, Text } from "@mantine/core";
import {
  IconBrain,
  IconClock,
  IconCpu,
  IconCpu2,
  IconFileReport,
  IconInfoCircle,
  IconServer,
  IconTemperature,
  IconVersions,
} from "@tabler/icons-react";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { useRequiredBoard } from "@homarr/boards/context";
import type { WidgetComponentProps } from "../definition";
import { progressColor } from "../health-monitoring/system-health";


dayjs.extend(duration);

export default function firewallWidget({
                                         options,
                                         integrationIds,
                                         width,
                                       }:WidgetComponentProps<"firewall">) {
  const [firewallData] = clientApi.widget.firewall.FirewallMonitoring.getFirewallStatus.useSuspenseQuery(
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
  clientApi.widget.firewall.subscribeFirewallStatus.useSubscription(
    { integrationIds },
    {
      onData(data) {
        utils.widget.firewall.getFirewallStatus.setData({ integrationIds }, (prevData) => {
          if (!prevData) {
            return undefined;
          }
          return prevData.map((item) =>
            item.integrationId === data.integrationId
              ? { ...item, healthInfo: data.healthInfo, updatedAt: data.timestamp }
              : item,
          );
        });
      },
    },
  );
  const t = useI18n();
  const board = useRequiredBoard();
  console.log(integrations)

  const isTiny = width < 256;
  return (
    <ScrollArea h="100%">
      <Tabs variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="system" fz="xs">
            <b>{t("widget.firewall.tab.system")}</b>
          </Tabs.Tab>
          <Tabs.Tab value="interfaces" fz="xs">
            <b>{t("widget.firewall.tab.interfaces")}</b>
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
                <Text
                  className="firewall-cpu-utilization-value"
                  size={isTiny ? "8px" : "xs"}
                >{`${data.cpuidle.toFixed(2)}%`}</Text>
                <IconCpu className="firewall-cpu-utilization-icon" size={isTiny ? 8 : 16} />
              </Center>
            }
            sections={[
              {
                value: Number(data.cpuidle.toFixed(2)),
                color: progressColor(Number(data.cpuidle.toFixed(2))),
              },
            ]}
          />
        </Tabs.Panel>
        <Tabs.Panel value="interfaces">

        </Tabs.Panel>
      </Tabs>
    </ScrollArea>
  );
}

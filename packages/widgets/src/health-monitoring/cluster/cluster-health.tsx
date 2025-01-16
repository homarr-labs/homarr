import { Accordion, Center, Flex, Group, RingProgress, Stack, Text } from "@mantine/core";
import { IconBrain, IconCpu, IconCube, IconDatabase, IconDeviceLaptop, IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { Resource } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { formatUptime } from "../system-health";
import { ResourceAccordionItem } from "./resource-accordion-item";
import { ResourceTable } from "./resource-table";

const addBadgeColor = ({
  activeCount,
  totalCount,
  sectionIndicatorRequirement,
}: {
  activeCount: number;
  totalCount: number;
  sectionIndicatorRequirement: WidgetComponentProps<"healthMonitoring">["options"]["sectionIndicatorRequirement"];
}) => ({
  color: activeCount === totalCount || (sectionIndicatorRequirement === "any" && activeCount >= 1) ? "green" : "orange",
  activeCount,
  totalCount,
});

const running = (total: number, current: Resource) => {
  return current.isRunning ? total + 1 : total;
};

export const ClusterHealthMonitoring = ({
  integrationId,
  options,
}: WidgetComponentProps<"healthMonitoring"> & { integrationId: string }) => {
  const t = useI18n();
  const [healthData] = clientApi.widget.healthMonitoring.getClusterHealthStatus.useSuspenseQuery(
    {
      integrationId,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const utils = clientApi.useUtils();
  clientApi.widget.healthMonitoring.subscribeClusterHealthStatus.useSubscription(
    { integrationId },
    {
      onData(data) {
        utils.widget.healthMonitoring.getClusterHealthStatus.setData({ integrationId }, data);
      },
    },
  );

  const activeNodes = healthData.nodes.reduce(running, 0);
  const activeVMs = healthData.vms.reduce(running, 0);
  const activeLXCs = healthData.lxcs.reduce(running, 0);
  const activeStorage = healthData.storages.reduce(running, 0);

  const usedMem = healthData.nodes.reduce((sum, item) => (item.isRunning ? item.memory.used + sum : sum), 0);
  const maxMem = healthData.nodes.reduce((sum, item) => (item.isRunning ? item.memory.total + sum : sum), 0);
  const maxCpu = healthData.nodes.reduce((sum, item) => (item.isRunning ? item.cpu.cores + sum : sum), 0);
  const usedCpu = healthData.nodes.reduce(
    (sum, item) => (item.isRunning ? item.cpu.utilization * item.cpu.cores + sum : sum),
    0,
  );
  const uptime = healthData.nodes.reduce((sum, { uptime }) => (sum > uptime ? sum : uptime), 0);

  const cpuPercent = maxCpu ? (usedCpu / maxCpu) * 100 : 0;
  const memPercent = maxMem ? (usedMem / maxMem) * 100 : 0;

  console.log("ClusterHealthMonitoring", healthData);

  return (
    <Stack h="100%">
      <Group justify="center" wrap="nowrap" pt="md">
        <Text fz="md" tt="uppercase" fw={700} c="dimmed" ta="center">
          {formatUptime(uptime, t)}
        </Text>
      </Group>
      <SummaryHeader cpu={cpuPercent} memory={memPercent} />
      <Accordion variant="contained" chevronPosition="right" multiple defaultValue={["node"]}>
        <ResourceAccordionItem
          value="node"
          title={t("widget.healthMonitoring.cluster.resource.node.name")}
          icon={IconServer}
          badge={addBadgeColor({
            activeCount: activeNodes,
            totalCount: healthData.nodes.length,
            sectionIndicatorRequirement: options.sectionIndicatorRequirement,
          })}
        >
          <ResourceTable type="node" data={healthData.nodes} />
        </ResourceAccordionItem>

        <ResourceAccordionItem
          value="qemu"
          title={t("widget.healthMonitoring.cluster.resource.qemu.name")}
          icon={IconDeviceLaptop}
          badge={addBadgeColor({
            activeCount: activeVMs,
            totalCount: healthData.vms.length,
            sectionIndicatorRequirement: options.sectionIndicatorRequirement,
          })}
        >
          <ResourceTable type="qemu" data={healthData.vms} />
        </ResourceAccordionItem>

        <ResourceAccordionItem
          value="lxc"
          title={t("widget.healthMonitoring.cluster.resource.lxc.name")}
          icon={IconCube}
          badge={addBadgeColor({
            activeCount: activeLXCs,
            totalCount: healthData.lxcs.length,
            sectionIndicatorRequirement: options.sectionIndicatorRequirement,
          })}
        >
          <ResourceTable type="lxc" data={healthData.lxcs} />
        </ResourceAccordionItem>

        <ResourceAccordionItem
          value="storage"
          title={t("widget.healthMonitoring.cluster.resource.storage.name")}
          icon={IconDatabase}
          badge={addBadgeColor({
            activeCount: activeStorage,
            totalCount: healthData.storages.length,
            sectionIndicatorRequirement: options.sectionIndicatorRequirement,
          })}
        >
          <ResourceTable type="storage" data={healthData.storages} />
        </ResourceAccordionItem>
      </Accordion>
    </Stack>
  );
};

interface SummaryHeaderProps {
  cpu: number;
  memory: number;
}

const SummaryHeader = ({ cpu, memory }: SummaryHeaderProps) => {
  const t = useI18n();
  return (
    <Center>
      <Group wrap="nowrap">
        <Flex direction="row">
          <RingProgress
            roundCaps
            size={60}
            thickness={6}
            label={
              <Center>
                <IconCpu />
              </Center>
            }
            sections={[{ value: cpu, color: cpu > 75 ? "orange" : "green" }]}
          />
          <Stack align="center" justify="center" gap={0}>
            <Text fw={500}>{t("widget.healthMonitoring.cluster.summary.cpu")}</Text>
            <Text>{cpu.toFixed(1)}%</Text>
          </Stack>
        </Flex>
        <Flex>
          <RingProgress
            roundCaps
            size={60}
            thickness={6}
            label={
              <Center>
                <IconBrain />
              </Center>
            }
            sections={[{ value: memory, color: memory > 75 ? "orange" : "green" }]}
          />
          <Stack align="center" justify="center" gap={0}>
            <Text fw={500}>{t("widget.healthMonitoring.cluster.summary.memory")}</Text>
            <Text>{memory.toFixed(1)}%</Text>
          </Stack>
        </Flex>
      </Group>
    </Center>
  );
};

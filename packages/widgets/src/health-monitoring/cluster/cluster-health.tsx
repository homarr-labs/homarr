import { useState } from "react";
import { Accordion, Center, Flex, Group, RingProgress, Stack, Text } from "@mantine/core";
import { IconBrain, IconCpu, IconCube, IconDatabase, IconDeviceLaptop, IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import type { Resource } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import { getUsableWidgetQueryData } from "../../common/query-state";
import type { WidgetComponentProps } from "../../definition";
import { formatUptime } from "../system-health";
import { getClusterAccordionDefault, getClusterVisibleSections } from "./accordion-state";
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
  width,
  displayMode,
}: WidgetComponentProps<"healthMonitoring"> & { integrationId: string }) => {
  const t = useI18n("widget.healthMonitoring");
  const healthQuery = clientApi.widget.healthMonitoring.getClusterHealthStatus.useQuery({ integrationId });
  const healthData = getUsableWidgetQueryData(healthQuery);
  const visibleSections = getClusterVisibleSections(displayMode, options.visibleClusterSections);
  const accordionScope = `${displayMode}:${visibleSections.join(",")}`;
  const accordionDefault = getClusterAccordionDefault(displayMode, visibleSections);
  const [accordionValues, setAccordionValues] = useState<Record<string, string[]>>({});
  const accordionValue = accordionValues[accordionScope] ?? accordionDefault;

  if (!healthData) return <WidgetEmptyState />;

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
  const uptime = healthData.nodes.reduce((sum, { uptime: nodeUptime }) => (sum > nodeUptime ? sum : nodeUptime), 0);

  const cpuPercent = maxCpu ? (usedCpu / maxCpu) * 100 : 0;
  const memPercent = maxMem ? (usedMem / maxMem) * 100 : 0;
  const isAdvanced = displayMode === "advanced";
  const isTiny = displayMode !== "advanced" && width < 256;
  return (
    <Stack h={isAdvanced ? "auto" : "100%"} p="xs" gap={isTiny ? "xs" : "md"} pos="relative">
      {(isAdvanced || options.showUptime) && !isTiny && (
        <Group justify="center" wrap="nowrap">
          <Text fz="xs" fw={700} c="dimmed" ta="center">
            {formatUptime(uptime, t)}
          </Text>
        </Group>
      )}
      <SummaryHeader
        cpu={{
          value: cpuPercent,
          hidden: !isAdvanced && !options.cpu,
        }}
        memory={{
          value: memPercent,
          hidden: !isAdvanced && !options.memory,
        }}
        isTiny={isTiny}
      />
      {visibleSections.length >= 1 && (
        <Accordion
          variant="contained"
          chevronPosition="right"
          multiple
          value={accordionValue}
          onChange={(value) => setAccordionValues((current) => ({ ...current, [accordionScope]: value }))}
        >
          {visibleSections.includes("node") && (
            <ResourceAccordionItem
              value="node"
              title={t("cluster.resource.node.name")}
              icon={IconServer}
              badge={addBadgeColor({
                activeCount: activeNodes,
                totalCount: healthData.nodes.length,
                sectionIndicatorRequirement: options.sectionIndicatorRequirement,
              })}
              isTiny={isTiny}
            >
              <ResourceTable type="node" data={healthData.nodes} isTiny={isTiny} />
            </ResourceAccordionItem>
          )}

          {visibleSections.includes("qemu") && (
            <ResourceAccordionItem
              value="qemu"
              title={t("cluster.resource.qemu.name")}
              icon={IconDeviceLaptop}
              badge={addBadgeColor({
                activeCount: activeVMs,
                totalCount: healthData.vms.length,
                sectionIndicatorRequirement: options.sectionIndicatorRequirement,
              })}
              isTiny={isTiny}
            >
              <ResourceTable type="qemu" data={healthData.vms} isTiny={isTiny} />
            </ResourceAccordionItem>
          )}

          {visibleSections.includes("lxc") && (
            <ResourceAccordionItem
              value="lxc"
              title={t("cluster.resource.lxc.name")}
              icon={IconCube}
              badge={addBadgeColor({
                activeCount: activeLXCs,
                totalCount: healthData.lxcs.length,
                sectionIndicatorRequirement: options.sectionIndicatorRequirement,
              })}
              isTiny={isTiny}
            >
              <ResourceTable type="lxc" data={healthData.lxcs} isTiny={isTiny} />
            </ResourceAccordionItem>
          )}

          {visibleSections.includes("storage") && (
            <ResourceAccordionItem
              value="storage"
              title={t("cluster.resource.storage.name")}
              icon={IconDatabase}
              badge={addBadgeColor({
                activeCount: activeStorage,
                totalCount: healthData.storages.length,
                sectionIndicatorRequirement: options.sectionIndicatorRequirement,
              })}
              isTiny={isTiny}
            >
              <ResourceTable type="storage" data={healthData.storages} isTiny={isTiny} />
            </ResourceAccordionItem>
          )}
        </Accordion>
      )}
    </Stack>
  );
};

interface SummaryHeaderProps {
  cpu: { value: number; hidden: boolean };
  memory: { value: number; hidden: boolean };
  isTiny: boolean;
}

const SummaryHeader = ({ cpu, memory, isTiny }: SummaryHeaderProps) => {
  if (cpu.hidden && memory.hidden) return null;

  return (
    <Center>
      <Group wrap="wrap" justify="center" gap="xs">
        {!cpu.hidden && (
          <Flex direction="row">
            <RingProgress
              roundCaps
              size={isTiny ? 32 : 48}
              thickness={isTiny ? 2 : 4}
              label={
                <Center>
                  <IconCpu size={isTiny ? 12 : 20} />
                </Center>
              }
              sections={[{ value: cpu.value, color: cpu.value > 75 ? "orange" : "green" }]}
            />
            <Stack align="center" justify="center" gap={0}>
              {!isTiny && (
                <Text fw={500} size="sm">
                  {invariantTechnicalLabels.cpu}
                </Text>
              )}
              <Text size="xs">{cpu.value.toFixed(1)}%</Text>
            </Stack>
          </Flex>
        )}
        {!memory.hidden && (
          <Flex>
            <RingProgress
              roundCaps
              size={isTiny ? 32 : 48}
              thickness={isTiny ? 2 : 4}
              label={
                <Center>
                  <IconBrain size={isTiny ? 12 : 20} />
                </Center>
              }
              sections={[{ value: memory.value, color: memory.value > 75 ? "orange" : "green" }]}
            />
            <Stack align="center" justify="center" gap={0}>
              {!isTiny && (
                <Text size="sm" fw={500}>
                  {invariantTechnicalLabels.ram}
                </Text>
              )}
              <Text size="xs">{memory.value.toFixed(1)}%</Text>
            </Stack>
          </Flex>
        )}
      </Group>
    </Center>
  );
};

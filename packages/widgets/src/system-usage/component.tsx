import type { MantineColor } from "@mantine/core";
import { Box, Divider, Flex, Group, Progress, Stack, Text } from "@mantine/core";
import {
  IconCpu,
  IconHourglass,
  IconNetwork,
  IconSquareChevronRight,
  IconThermometer,
  IconWifi,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { humanFileSize, objectEntries } from "@homarr/common";
import type { System, SystemLoadStatus, SystemStatus } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { IconGpu, IconHardDrive, IconMemoryStick, IconWebsocket } from "@homarr/ui/icons";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors";

export default function SystemUsage({ integrationIds, options }: WidgetComponentProps<"systemUsage">) {
  const integrationId = integrationIds.at(0);
  if (!integrationId) {
    throw new NoIntegrationSelectedError();
  }

  return (
    <SystemUsageContent systemId={options.systemId} integrationId={integrationId} visibleItems={options.visibleItems} />
  );
}

interface SystemUsageContentProps {
  systemId: string;
  integrationId: string;
  visibleItems: (keyof typeof items)[];
}

const SystemUsageContent = ({ systemId, integrationId, visibleItems }: SystemUsageContentProps) => {
  const [systemDetails] = clientApi.widget.systemUsage.get.useSuspenseQuery(
    { systemId, integrationId },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const utils = clientApi.useUtils();
  clientApi.widget.systemUsage.subscribe.useSubscription(
    { systemId, integrationId },
    {
      onData(data) {
        utils.widget.systemUsage.get.setData({ systemId, integrationId }, data.system);
      },
    },
  );
  const t = useI18n();

  return (
    <Stack gap="sm" p="sm">
      <Group gap="sm" align="center">
        <Dot color={systemStatusColors[systemDetails.status]} />
        <Text fw="bold" size="sm">
          {systemDetails.name}
        </Text>
      </Group>
      <Divider />

      {objectEntries(items).map(([key, item]) =>
        ("hidden" in item && item.hidden(systemDetails)) || !visibleItems.includes(key) ? null : (
          <Item key={key} icon={item.icon} label={t(`widget.systemUsage.item.${key}.label`)}>
            <item.component system={systemDetails} />
          </Item>
        ),
      )}
    </Stack>
  );
};

const systemStatusColors = {
  up: "green",
  down: "red",
  paused: "gray",
  pending: "yellow",
} satisfies Record<SystemStatus, MantineColor>;

const loadStatusColors = {
  good: "green",
  warning: "yellow",
  critical: "red",
  unknown: "gray",
} satisfies Record<SystemLoadStatus, MantineColor>;

const ProgressValue = ({ value }: { value: number }) => (
  <Group gap="xs" align="center" w="100%" wrap="nowrap">
    <Text size="xs">{value}%</Text>
    <Progress value={value} color={progressColor(value)} w="100%" />
  </Group>
);

const progressColor = (value: number): MantineColor => {
  if (value < 50) return "green";
  if (value < 75) return "yellow";
  return "red";
};

const items = {
  cpu: {
    icon: IconCpu,
    component({ system }) {
      return <ProgressValue value={system.usage.cpuPercentage} />;
    },
  },
  memory: {
    icon: IconMemoryStick,
    component({ system }) {
      return <ProgressValue value={system.usage.memoryPercentage} />;
    },
  },
  disk: {
    icon: IconHardDrive,
    component({ system }) {
      return <ProgressValue value={system.usage.diskPercentage} />;
    },
  },
  gpu: {
    icon: IconGpu,
    component({ system }) {
      return <ProgressValue value={system.usage.gpuPercentage ?? 0} />;
    },
    hidden(system) {
      return system.usage.gpuPercentage === null;
    },
  },
  load: {
    icon: IconHourglass,
    component({ system }) {
      return (
        <Group gap="xs" align="center">
          <Dot color={loadStatusColors[system.usage.load.status]} />
          <Text size="xs">{system.usage.load.averages.one}</Text>
          <Text size="xs">{system.usage.load.averages.five}</Text>
          <Text size="xs">{system.usage.load.averages.fifteen}</Text>
        </Group>
      );
    },
  },
  network: {
    icon: IconNetwork,
    component({ system }) {
      return <Text size="xs">{humanFileSize(system.usage.networkBytes, "/s")}</Text>;
    },
  },
  temperature: {
    icon: IconThermometer,
    component({ system }) {
      return <Text size="xs">{system.usage.temperature ?? "N/A"} °C</Text>;
    },
    hidden(system) {
      return system.usage.temperature === null;
    },
  },
  agent: {
    icon: IconWifi,
    component({ system }) {
      return (
        <Group gap="xs" align="center">
          {system.agent.connectionType === "ssh" ? <IconSquareChevronRight size={14} stroke={1.5} /> : null}
          {system.agent.connectionType === "webSocket" ? <IconWebsocket size={14} stroke={1.5} /> : null}
          <Text size="xs">{system.agent.version}</Text>
        </Group>
      );
    },
  },
} satisfies Record<
  string,
  { icon: TablerIcon; component: (props: { system: System }) => React.ReactNode; hidden?: (system: System) => boolean }
>;

interface DotProps {
  color: MantineColor;
}

const Dot = ({ color }: DotProps) => <Box style={{ borderRadius: "100%" }} bg={color} h={8} w={8}></Box>;

interface ItemProps {
  icon: TablerIcon;
  label: string;
  children: React.ReactNode;
}

const Item = (props: ItemProps) => (
  <Group justify="space-between" align="center" wrap="nowrap" w="100%">
    <Group gap="xs" wrap="nowrap">
      <props.icon size={16} stroke={1.5} />
      <Text size="xs">{props.label}:</Text>
    </Group>

    <Flex c="white" justify="end" maw="50%" w="100%">
      {props.children}
    </Flex>
  </Group>
);

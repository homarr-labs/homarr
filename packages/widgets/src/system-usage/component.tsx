"use client";

import type { MantineColor } from "@mantine/core";
import { Divider, Group, Stack, Text } from "@mantine/core";
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
import { NoSystemSelectedError } from "./errors/no-system-selected-error";
import { Dot, Item, ProgressValue } from "./item";

export default function SystemUsage({ integrationIds, options, isEditMode }: WidgetComponentProps<"systemUsage">) {
  if (isEditMode) {
    return <SystemUsagePreview visibleItems={options.visibleItems} />;
  }

  const integrationId = integrationIds.at(0);
  if (!integrationId) {
    throw new NoIntegrationSelectedError();
  }

  if (!options.systemId) {
    throw new NoSystemSelectedError();
  }

  return (
    <SystemUsageContent
      systemId={options.systemId.value}
      integrationId={integrationId}
      visibleItems={options.visibleItems}
    />
  );
}

interface SystemUsagePreviewProps {
  visibleItems: (keyof typeof items)[];
}

const progressItems = new Set<keyof typeof items>(["cpu", "memory", "disk", "gpu"]);

const SystemUsagePreview = ({ visibleItems }: SystemUsagePreviewProps) => {
  const t = useI18n();

  return (
    <Stack gap="sm" p="sm">
      <Group gap="sm" align="center">
        <Dot color="green" />
        <Text fw="bold" size="sm">
          System Name
        </Text>
      </Group>
      <Divider />

      {objectEntries(items).map(([key, item]) =>
        ("hidden" in item && item.hidden({ usage: { gpuPercentage: null, temperature: null } } as System)) ||
        !visibleItems.includes(key) ? null : (
          <Item key={key} icon={item.icon} label={t(`widget.systemUsage.item.${key}.label`)}>
            {progressItems.has(key) ? <ProgressValue value={50} /> : <Text size="xs">—</Text>}
          </Item>
        ),
      )}
    </Stack>
  );
};

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
        <Group gap="xs" align="center" wrap="nowrap">
          <Dot color={loadStatusColors[system.usage.load.status]} />
          <Text size="xs" style={{ whiteSpace: "nowrap" }}>
            {system.usage.load.averages.one}
          </Text>
          <Text size="xs" style={{ whiteSpace: "nowrap" }}>
            {system.usage.load.averages.five}
          </Text>
          <Text size="xs" style={{ whiteSpace: "nowrap" }}>
            {system.usage.load.averages.fifteen}
          </Text>
        </Group>
      );
    },
  },
  network: {
    icon: IconNetwork,
    component({ system }) {
      return (
        <Text size="xs" style={{ whiteSpace: "nowrap" }}>
          {humanFileSize(system.usage.networkBytes, "/s")}
        </Text>
      );
    },
  },
  temperature: {
    icon: IconThermometer,
    component({ system }) {
      return (
        <Text size="xs" style={{ whiteSpace: "nowrap" }}>
          {system.usage.temperature ?? "N/A"} °C
        </Text>
      );
    },
    hidden(system) {
      return system.usage.temperature === null;
    },
  },
  agent: {
    icon: IconWifi,
    component({ system }) {
      return (
        <Group gap="xs" align="center" wrap="nowrap">
          {system.agent.connectionType === "ssh" ? <IconSquareChevronRight size={14} stroke={1.5} /> : null}
          {system.agent.connectionType === "webSocket" ? <IconWebsocket size={14} stroke={1.5} /> : null}
          <Text size="xs" style={{ whiteSpace: "nowrap" }}>
            {system.agent.version}
          </Text>
        </Group>
      );
    },
  },
} satisfies Record<
  string,
  { icon: TablerIcon; component: (props: { system: System }) => React.ReactNode; hidden?: (system: System) => boolean }
>;

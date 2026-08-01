"use client";

import { useCallback, useState } from "react";
import {
  Accordion,
  Badge,
  Center,
  Flex,
  Group,
  Paper,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconArrowBarDown, IconArrowBarUp, IconBrain, IconCpu, IconTopologyBus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { FirewallInterfacesSummary } from "@homarr/integrations";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { calculateBandwidth, formatBitsPerSec } from "./bandwidth";
import { FirewallMenu } from "./firewall-menu";
import { FirewallVersion, formatVersion } from "./firewall-version";

export interface Firewall {
  label: string;
  value: string;
}

export default function FirewallWidget({
  integrationIds,
  width,
  itemId,
  displayMode,
}: WidgetComponentProps<"firewall">) {
  const [selectedFirewall, setSelectedFirewall] = useState("");
  const isAdvanced = displayMode === "advanced";
  const isTiny = !isAdvanced && width < 256;
  const t = useI18n();

  const handleSelect = useCallback((value: string | null) => {
    setSelectedFirewall(value ?? "");
  }, []);

  const { data: firewallsCpuData = [] } = clientApi.widget.firewall.getFirewallCpuStatus.useQuery({ integrationIds });
  const { data: firewallsMemoryData = [] } = clientApi.widget.firewall.getFirewallMemoryStatus.useQuery({
    integrationIds,
  });
  const { data: firewallsVersionData = [] } = clientApi.widget.firewall.getFirewallVersionStatus.useQuery({
    integrationIds,
  });
  const { data: firewallsInterfacesData = [] } = clientApi.widget.firewall.getFirewallInterfacesStatus.useQuery({
    integrationIds,
  });

  const [accordionValue, setAccordionValue] = useLocalStorage<string | null>({
    key: `homarr-${itemId}-firewall`,
    defaultValue: "interfaces",
  });

  const initialSelectedFirewall = firewallsVersionData[0]?.integration.id ?? "";
  const activeFirewall = firewallsVersionData.some(({ integration }) => integration.id === selectedFirewall)
    ? selectedFirewall
    : initialSelectedFirewall;
  const displayedFirewallIds = isAdvanced
    ? firewallsVersionData.map(({ integration }) => integration.id)
    : activeFirewall
      ? [activeFirewall]
      : [];
  const dropdownItems = firewallsVersionData.map((firewall) => ({
    label: firewall.integration.name,
    value: firewall.integration.id,
  }));

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p={isAdvanced ? "xs" : 0}>
        {!isAdvanced && (
          <Group justify="space-between" w="100%" p="xs">
            <FirewallMenu
              onChange={handleSelect}
              selectedFirewall={activeFirewall}
              dropdownItems={dropdownItems}
              isTiny={isTiny}
            />
            <FirewallVersion
              firewallsVersionData={firewallsVersionData}
              selectedFirewall={activeFirewall}
              isTiny={isTiny}
            />
          </Group>
        )}

        <SimpleGrid cols={isAdvanced && width >= 720 ? 2 : 1} spacing="xs">
          {displayedFirewallIds.map((firewallId) => {
            const cpu = firewallsCpuData.find(({ integration }) => integration.id === firewallId);
            const memory = firewallsMemoryData.find(({ integration }) => integration.id === firewallId);
            const version = firewallsVersionData.find(({ integration }) => integration.id === firewallId);
            const interfaces = firewallsInterfacesData.find(({ integration }) => integration.id === firewallId);
            const hasError = Boolean(cpu?.error || memory?.error || version?.error || interfaces?.error);

            return (
              <FirewallPanel
                key={firewallId}
                name={version?.integration.name ?? cpu?.integration.name ?? firewallId}
                kind={version?.integration.kind}
                version={version?.summary.version}
                cpu={cpu?.summary.total}
                memory={memory?.summary.percent}
                interfaces={interfaces?.summary}
                hasError={hasError}
                isAdvanced={isAdvanced}
                isTiny={isTiny}
                accordionValue={accordionValue}
                setAccordionValue={setAccordionValue}
                noDataLabel={t("widget.firewall.error.internalServerError")}
                interfacesLabel={t("widget.firewall.widget.interfaces.title")}
                t={t}
              />
            );
          })}
        </SimpleGrid>
      </Stack>
    </ScrollArea>
  );
}

interface FirewallPanelProps {
  name: string;
  kind?: string;
  version?: string;
  cpu?: number;
  memory?: number;
  interfaces?: FirewallInterfacesSummary[];
  hasError: boolean;
  isAdvanced: boolean;
  isTiny: boolean;
  accordionValue: string | null;
  setAccordionValue: (value: string | null) => void;
  noDataLabel: string;
  interfacesLabel: string;
  t: TranslationFunction;
}

const FirewallPanel = ({
  name,
  kind,
  version,
  cpu,
  memory,
  interfaces,
  hasError,
  isAdvanced,
  isTiny,
  accordionValue,
  setAccordionValue,
  noDataLabel,
  interfacesLabel,
  t,
}: FirewallPanelProps) => (
  <Paper withBorder={isAdvanced} radius="sm" p={isAdvanced ? "xs" : 0}>
    <Stack gap="xs">
      {isAdvanced && (
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0} miw={0}>
            <Text size="sm" fw={600} truncate="end">
              {name}
            </Text>
            {kind && (
              <Text size="xs" c="dimmed">
                {kind}
              </Text>
            )}
          </Stack>
          <Group gap={4} wrap="nowrap">
            {hasError && (
              <Tooltip label={noDataLabel}>
                <Badge color="red" variant="light" size="xs">
                  {t("common.error")}
                </Badge>
              </Tooltip>
            )}
            <Badge variant="outline" color="gray" size="xs">
              {formatVersion(version ?? "", t("widget.firewall.versionUnknown"))}
            </Badge>
          </Group>
        </Group>
      )}

      <Flex justify="center" align="center" wrap="wrap">
        {cpu !== undefined && (
          <MetricRing value={cpu} icon={IconCpu} isTiny={isTiny} label={t("widget.firewall.widget.cpu")} t={t} />
        )}
        {memory !== undefined && (
          <MetricRing
            value={memory}
            icon={IconBrain}
            isTiny={isTiny}
            label={t("widget.firewall.widget.memory")}
            t={t}
          />
        )}
      </Flex>

      <InterfacesPanel
        summary={interfaces ?? []}
        isAdvanced={isAdvanced}
        isTiny={isTiny}
        accordionValue={accordionValue}
        setAccordionValue={setAccordionValue}
        noDataLabel={noDataLabel}
        label={interfacesLabel}
      />
    </Stack>
  </Paper>
);

interface MetricRingProps {
  value: number;
  icon: typeof IconCpu;
  isTiny: boolean;
  label: string;
  t: TranslationFunction;
}

const MetricRing = ({ value, icon: Icon, isTiny, label, t }: MetricRingProps) => {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const status = getMetricStatus(safeValue);
  const statusLabel = t(`widget.firewall.status.${status}`);

  return (
    <RingProgress
      aria-label={t("widget.firewall.metricAccessible", {
        metric: label,
        value: safeValue.toFixed(1),
        status: statusLabel,
      })}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      label={
        <Center style={{ flexDirection: "column" }}>
          <Text size={isTiny ? "8px" : "xs"}>{safeValue.toFixed(1)}%</Text>
          <Icon size={isTiny ? 8 : 16} />
          {!isTiny && <Text size="8px">{statusLabel}</Text>}
        </Center>
      }
      sections={[
        {
          value: safeValue,
          color: status === "warning" ? "yellow" : status === "critical" ? "red" : "green",
        },
      ]}
    />
  );
};

const getMetricStatus = (value: number): "normal" | "warning" | "critical" => {
  if (value >= 75) return "critical";
  if (value > 50) return "warning";
  return "normal";
};

interface InterfacesPanelProps {
  summary: FirewallInterfacesSummary[];
  isAdvanced: boolean;
  isTiny: boolean;
  accordionValue: string | null;
  setAccordionValue: (value: string | null) => void;
  noDataLabel: string;
  label: string;
}

const InterfacesPanel = ({
  summary,
  isAdvanced,
  isTiny,
  accordionValue,
  setAccordionValue,
  noDataLabel,
  label,
}: InterfacesPanelProps) => {
  const bandwidth = calculateBandwidth(summary).data;

  return (
    <Accordion
      value={isAdvanced ? "interfaces" : accordionValue}
      onChange={isAdvanced ? undefined : setAccordionValue}
      variant={isAdvanced ? "contained" : "default"}
    >
      <Accordion.Item value="interfaces">
        <Accordion.Control icon={isTiny ? null : <IconTopologyBus size={16} />}>
          <Text size={isTiny ? "8px" : "xs"}>{label}</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap={4}>
            {bandwidth.length > 0 ? (
              bandwidth.map(({ name, receive, transmit }) => (
                <Group key={name} gap="xs" wrap={isTiny ? "wrap" : "nowrap"} justify="space-between">
                  <Text size={isTiny ? "8px" : "xs"} c="blue.3" truncate="end" style={{ flex: 1 }}>
                    {name}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <IconArrowBarUp size={isTiny ? 8 : 12} color="lightgreen" />
                    <Text size={isTiny ? "8px" : "xs"} c="green.3">
                      {formatBitsPerSec(transmit, 2)}
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <IconArrowBarDown size={isTiny ? 8 : 12} color="yellow" />
                    <Text size={isTiny ? "8px" : "xs"} c="yellow.3">
                      {formatBitsPerSec(receive, 2)}
                    </Text>
                  </Group>
                </Group>
              ))
            ) : (
              <Text size="xs" c="dimmed">
                {noDataLabel}
              </Text>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

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

interface FirewallQueryState {
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  data?: readonly { error?: string; integration?: { id: string } }[];
}

export const hasTotalFirewallFailure = (queries: readonly FirewallQueryState[]) =>
  queries.every((query) => !query.isPending && !query.isFetching) &&
  queries.every(
    (query) =>
      (query.isError && query.data === undefined) ||
      (query.data !== undefined && query.data.length > 0 && query.data.every(({ error }) => error)),
  );

export const hasFirewallPartialFailure = (firewallId: string, queries: readonly FirewallQueryState[]) =>
  queries.some(
    (query) =>
      query.isError ||
      query.data?.some(({ error, integration }) => integration?.id === firewallId && Boolean(error)) === true,
  );

export default function FirewallWidget({
  integrationIds,
  width,
  height,
  itemId,
  displayMode,
}: WidgetComponentProps<"firewall">) {
  const [selectedFirewall, setSelectedFirewall] = useState("");
  const isAdvanced = displayMode === "advanced";
  const isTiny = !isAdvanced && (width < 256 || height < 180);
  const ringSize = isAdvanced ? 100 : height < 120 ? 44 : isTiny ? 64 : 100;
  const showInterfaces = isAdvanced || (!isTiny && height >= 120);
  const t = useI18n();

  const handleSelect = useCallback((value: string | null) => {
    setSelectedFirewall(value ?? "");
  }, []);

  const cpuQuery = clientApi.widget.firewall.getFirewallCpuStatus.useQuery({ integrationIds });
  const memoryQuery = clientApi.widget.firewall.getFirewallMemoryStatus.useQuery({
    integrationIds,
  });
  const versionQuery = clientApi.widget.firewall.getFirewallVersionStatus.useQuery({
    integrationIds,
  });
  const interfacesQuery = clientApi.widget.firewall.getFirewallInterfacesStatus.useQuery({
    integrationIds,
  });
  const firewallsCpuData = cpuQuery.data ?? [];
  const firewallsMemoryData = memoryQuery.data ?? [];
  const firewallsVersionData = versionQuery.data ?? [];
  const firewallsInterfacesData = interfacesQuery.data ?? [];
  const queries = [cpuQuery, memoryQuery, versionQuery, interfacesQuery];
  const hasTotalFailure = hasTotalFirewallFailure(queries);

  const [accordionValue, setAccordionValue] = useLocalStorage<string | null>({
    key: `homarr-${itemId}-firewall`,
    defaultValue: "interfaces",
  });

  if (hasTotalFailure) {
    throw new Error(t("widget.firewall.error.internalServerError"));
  }

  const firewallMetadata = new Map(
    [...firewallsVersionData, ...firewallsCpuData, ...firewallsMemoryData, ...firewallsInterfacesData].map(
      ({ integration }) => [integration.id, integration] as const,
    ),
  );
  const firewallIds = [...firewallMetadata.keys()];
  const initialSelectedFirewall = firewallIds[0] ?? "";
  const activeFirewall = firewallMetadata.has(selectedFirewall) ? selectedFirewall : initialSelectedFirewall;
  const displayedFirewallIds = isAdvanced ? firewallIds : activeFirewall ? [activeFirewall] : [];
  const firewallHasError = (firewallId: string) => hasFirewallPartialFailure(firewallId, queries);
  const dropdownItems = firewallIds.map((firewallId) => ({
    label: firewallMetadata.get(firewallId)?.name ?? firewallId,
    value: firewallId,
  }));

  if (firewallIds.length === 0) {
    const isLoading = queries.some((query) => query.isPending || query.isFetching);
    return (
      <Center h="100%" p="sm">
        <Text size="sm" c="dimmed" ta="center">
          {isLoading ? t("common.action.loading") : t("widget.firewall.empty.noInterfaces")}
        </Text>
      </Center>
    );
  }

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
            <Group gap={4} wrap="nowrap">
              {activeFirewall && firewallHasError(activeFirewall) && (
                <Tooltip label={t("widget.firewall.error.internalServerError")}>
                  <Badge color="red" variant="light" size="xs">
                    {t("common.error")}
                  </Badge>
                </Tooltip>
              )}
              <FirewallVersion
                firewallsVersionData={firewallsVersionData.filter(({ error }) => !error)}
                selectedFirewall={activeFirewall}
                isTiny={isTiny}
              />
            </Group>
          </Group>
        )}

        <SimpleGrid cols={isAdvanced && width >= 720 ? 2 : 1} spacing="xs">
          {displayedFirewallIds.map((firewallId) => {
            const cpu = firewallsCpuData.find(({ integration }) => integration.id === firewallId);
            const memory = firewallsMemoryData.find(({ integration }) => integration.id === firewallId);
            const version = firewallsVersionData.find(({ integration }) => integration.id === firewallId);
            const interfaces = firewallsInterfacesData.find(({ integration }) => integration.id === firewallId);
            const hasError = firewallHasError(firewallId);
            const metadata = firewallMetadata.get(firewallId);

            return (
              <FirewallPanel
                key={firewallId}
                name={metadata?.name ?? firewallId}
                kind={metadata?.kind}
                version={version?.error ? undefined : version?.summary.version}
                cpu={cpu?.error ? undefined : cpu?.summary.total}
                memory={memory?.error ? undefined : memory?.summary.percent}
                interfaces={interfaces?.summary}
                interfacesLoaded={interfaces !== undefined}
                interfacesError={interfacesQuery.isError || Boolean(interfaces?.error)}
                hasError={hasError}
                isAdvanced={isAdvanced}
                ringSize={ringSize}
                showInterfaces={showInterfaces}
                accordionValue={accordionValue}
                setAccordionValue={setAccordionValue}
                errorLabel={t("widget.firewall.error.internalServerError")}
                noDataLabel={t("widget.firewall.empty.noInterfaces")}
                loadingLabel={t("common.action.loading")}
                errorBadgeLabel={t("common.error")}
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
  interfacesLoaded: boolean;
  interfacesError: boolean;
  hasError: boolean;
  isAdvanced: boolean;
  ringSize: number;
  showInterfaces: boolean;
  accordionValue: string | null;
  setAccordionValue: (value: string | null) => void;
  errorLabel: string;
  noDataLabel: string;
  loadingLabel: string;
  errorBadgeLabel: string;
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
  interfacesLoaded,
  interfacesError,
  hasError,
  isAdvanced,
  ringSize,
  showInterfaces,
  accordionValue,
  setAccordionValue,
  errorLabel,
  noDataLabel,
  loadingLabel,
  errorBadgeLabel,
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
              <Tooltip label={errorLabel}>
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
          <MetricRing value={cpu} icon={IconCpu} size={ringSize} label={t("widget.firewall.widget.cpu")} t={t} />
        )}
        {memory !== undefined && (
          <MetricRing
            value={memory}
            icon={IconBrain}
            size={ringSize}
            label={t("widget.firewall.widget.memory")}
            t={t}
          />
        )}
      </Flex>

      {showInterfaces && (
        <InterfacesPanel
          summary={interfaces ?? []}
          hasResult={interfacesLoaded}
          hasError={interfacesError}
          isAdvanced={isAdvanced}
          accordionValue={accordionValue}
          setAccordionValue={setAccordionValue}
          errorLabel={errorLabel}
          errorBadgeLabel={errorBadgeLabel}
          noDataLabel={noDataLabel}
          loadingLabel={loadingLabel}
          label={interfacesLabel}
        />
      )}
    </Stack>
  </Paper>
);

interface MetricRingProps {
  value: number;
  icon: typeof IconCpu;
  size: number;
  label: string;
  t: TranslationFunction;
}

const MetricRing = ({ value, icon: Icon, size, label, t }: MetricRingProps) => {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const status = getMetricStatus(safeValue);
  const statusLabel = t(`widget.firewall.status.${status}`);
  const showIcon = size >= 64;
  const showStatus = size >= 96;

  return (
    <RingProgress
      aria-label={t("widget.firewall.metricAccessible", {
        metric: label,
        value: safeValue.toFixed(1),
        status: statusLabel,
      })}
      roundCaps
      size={size}
      thickness={size < 72 ? 4 : 8}
      label={
        <Center style={{ flexDirection: "column" }}>
          <Text size="xs">{safeValue.toFixed(1)}%</Text>
          {showIcon && <Icon size={size < 96 ? 12 : 16} />}
          {showStatus && <Text size="xs">{statusLabel}</Text>}
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
  hasResult: boolean;
  hasError: boolean;
  isAdvanced: boolean;
  accordionValue: string | null;
  setAccordionValue: (value: string | null) => void;
  errorLabel: string;
  errorBadgeLabel: string;
  noDataLabel: string;
  loadingLabel: string;
  label: string;
}

const InterfacesPanel = ({
  summary,
  hasResult,
  hasError,
  isAdvanced,
  accordionValue,
  setAccordionValue,
  errorLabel,
  errorBadgeLabel,
  noDataLabel,
  loadingLabel,
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
        <Accordion.Control icon={<IconTopologyBus size="var(--mantine-font-size-md)" />}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="xs">{label}</Text>
            {hasError && (
              <Badge color="red" variant="light" size="xs">
                {errorBadgeLabel}
              </Badge>
            )}
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap={4}>
            {bandwidth.map(({ name, receive, transmit }) => (
              <Group key={name} gap="xs" wrap="nowrap" justify="space-between">
                <Text
                  size="xs"
                  c="light-dark(var(--mantine-color-blue-8), var(--mantine-color-blue-3))"
                  truncate="end"
                  style={{ flex: 1 }}
                >
                  {name}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <IconArrowBarUp
                    size="var(--mantine-font-size-xs)"
                    color="light-dark(var(--mantine-color-green-8), var(--mantine-color-green-3))"
                  />
                  <Text size="xs" c="light-dark(var(--mantine-color-green-8), var(--mantine-color-green-3))">
                    {formatBitsPerSec(transmit, 2)}
                  </Text>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <IconArrowBarDown
                    size="var(--mantine-font-size-xs)"
                    color="light-dark(var(--mantine-color-yellow-9), var(--mantine-color-yellow-3))"
                  />
                  <Text size="xs" c="light-dark(var(--mantine-color-yellow-9), var(--mantine-color-yellow-3))">
                    {formatBitsPerSec(receive, 2)}
                  </Text>
                </Group>
              </Group>
            ))}
            {hasError ? (
              <Text size="xs" c="red">
                {errorLabel}
              </Text>
            ) : bandwidth.length === 0 ? (
              <Text size="xs" c="dimmed">
                {hasResult ? noDataLabel : loadingLabel}
              </Text>
            ) : null}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

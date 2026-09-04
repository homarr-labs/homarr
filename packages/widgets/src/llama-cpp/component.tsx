"use client";

import { useMemo, useRef } from "react";

import { Badge, Card, Center, Group, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { IconBrain, IconCircleCheck, IconCircleX, IconCpu, IconGauge, IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatBytes, formatNumber } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors/no-integration-selected";

const layoutBreakpoints = [
  { tier: "standard", minWidth: 256 },
  { tier: "tiny", minWidth: 0 },
] as const;

const getLayoutTier = (width: number): "standard" | "tiny" =>
  layoutBreakpoints.find(({ minWidth }) => width >= minWidth)?.tier ?? "tiny";

export default function LlamacppWidget({ integrationIds, options, width }: WidgetComponentProps<"llamacpp">) {
  const integrationId = integrationIds[0];
  if (!integrationId) {
    throw new NoIntegrationSelectedError();
  }

  return <LlamacppContent integrationId={integrationId} options={options} width={width} />;
}

interface LlamacppContentProps {
  integrationId: string;
  options: WidgetComponentProps<"llamacpp">["options"];
  width: number;
}

function LlamacppContent({ integrationId, options, width }: LlamacppContentProps) {
  const t = useI18n("widget.llamacpp");
  const { data, isError } = clientApi.widget.llamacpp.getStats.useQuery({ integrationId });

  // Tracks the in-flight request across polls so the widget can show the average
  // speed since that request started: /slots reports the request id (taskId) and how
  // many tokens it has generated so far (requestDecodedTokens). The server resets that
  // counter to 0 when a new request starts, so a fresh taskId means a fresh request.
  const requestRef = useRef<{ taskId: number; baseTokens: number; baseTimeMs: number } | null>(null);
  const perRequestSpeedTps = useMemo(() => {
    const taskId = data?.stats.metrics.taskId ?? null;
    const decoded = data?.stats.metrics.requestDecodedTokens ?? null;
    if (taskId === null || decoded === null) {
      requestRef.current = null;
      return null;
    }

    const nowMs = Date.now();
    const current = requestRef.current;
    if (current === null || current.taskId !== taskId) {
      requestRef.current = { taskId, baseTokens: decoded, baseTimeMs: nowMs };
      return null;
    }

    const elapsedSeconds = (nowMs - current.baseTimeMs) / 1000;
    const deltaTokens = decoded - current.baseTokens;
    if (elapsedSeconds <= 0 || deltaTokens < 0) {
      return null;
    }
    const speed = deltaTokens / elapsedSeconds;
    return Number.isFinite(speed) && speed > 0 ? speed : null;
  }, [data]);

  // Derive the responsive layout tier from a breakpoint table (memoized on width).
  const isTiny = useMemo(() => getLayoutTier(width) === "tiny", [width]);

  if (isError) {
    return (
      <Center h="100%" w="100%" p="sm">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <IconCircleX size={20} color="red" />
          <Text size="sm" c="dimmed" lineClamp={1}>
            {t("error.unreachable")}
          </Text>
        </Group>
      </Center>
    );
  }

  if (!data) {
    return <WidgetEmptyState />;
  }

  const stats = data.stats;
  const isHealthy = stats.health === "ok";

  const statusBadge = isHealthy ? (
    <Badge color="green" variant="light">
      {t("status.online")}
    </Badge>
  ) : (
    <Badge color="red" variant="light">
      {t("status.unhealthy", { status: stats.health })}
    </Badge>
  );

  const speedTps = stats.metrics.generationSpeedTps;
  const avgSpeedTps = stats.metrics.avgGenerationSpeedTps;
  const requestsProcessing = stats.metrics.requestsProcessing;
  const isBusy = requestsProcessing !== null && requestsProcessing > 0;
  const contextUsage = stats.contextUsage;
  const contextUsageLabel = contextUsage
    ? `${formatNumber(contextUsage.usedTokens, 0)} / ${formatNumber(contextUsage.contextSize, 0)} (${contextUsage.percent}%)`
    : null;

  let displayedSpeed: number | null;
  let speedMode: "request" | "live" | "average";
  if (isBusy && perRequestSpeedTps !== null) {
    displayedSpeed = perRequestSpeedTps;
    speedMode = "request";
  } else if (isBusy && speedTps !== null && speedTps > 0) {
    displayedSpeed = speedTps;
    speedMode = "live";
  } else {
    displayedSpeed = avgSpeedTps;
    speedMode = "average";
  }
  const speedTooltip =
    speedMode === "request"
      ? t("speedTooltip.request")
      : speedMode === "live"
        ? t("speedTooltip.current")
        : t("speedTooltip.average");

  return (
    <Stack p="xs" gap="xs" h="100%">
      {options.showTitle && !isTiny && (
        <Group gap="xs" wrap="nowrap" justify="space-between" miw={0}>
          <Group gap="xs" wrap="nowrap" miw={0}>
            <IconCpu size={16} color="dimmed" />
            <Text size="sm" c="dimmed" lineClamp={1}>
              {t("title")}
            </Text>
          </Group>
          {statusBadge}
        </Group>
      )}

      {isTiny ? (
        <Center>
          {isHealthy ? (
            <Tooltip label={t("status.online")}>
              <IconCircleCheck size={28} color="green" />
            </Tooltip>
          ) : (
            <Tooltip label={t("status.unhealthy", { status: stats.health })}>
              <IconCircleX size={28} color="red" />
            </Tooltip>
          )}
        </Center>
      ) : (
        <>
          <Group justify="center" wrap="nowrap" gap="md">
            <Center
              p="xs"
              style={{
                flexShrink: 0,
                borderRadius: "var(--mantine-radius-md)",
                backgroundColor: "var(--mantine-color-body)",
              }}
            >
              <Stack gap={2} align="center">
                <IconGauge size={isBusy ? 28 : 24} color={isBusy ? "blue" : "dimmed"} />
                <Tooltip label={speedTooltip} withArrow>
                  <Text size="xs" fw={700}>
                    {displayedSpeed !== null && displayedSpeed > 0
                      ? t("unit.speed", { value: formatNumber(displayedSpeed, 1) })
                      : t("unit.none")}
                  </Text>
                </Tooltip>
              </Stack>
            </Center>

            <Stack gap={4} align="flex-start">
              <Group gap={4} wrap="nowrap" miw={0}>
                <IconServer size={14} color="dimmed" />
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {isBusy ? t("busy", { count: requestsProcessing }) : t("idle")}
                </Text>
              </Group>
              {options.showModelInfo && stats.model && (
                <Group gap={4} wrap="nowrap" miw={0}>
                  <IconBrain size={14} color="dimmed" />
                  <Tooltip label={stats.model.id} withArrow>
                    <Text size="xs" lineClamp={1} style={{ maxWidth: Math.max(width - 160, 100) }}>
                      {stats.model.name}
                    </Text>
                  </Tooltip>
                  {stats.model.quantization && (
                    <Badge size="xs" variant="light" color="gray">
                      {stats.model.quantization}
                    </Badge>
                  )}
                </Group>
              )}
            </Stack>
          </Group>

          {options.showModelInfo && stats.model && !isTiny && (
            <Stack gap={4}>
              {stats.model.contextSize !== null && (
                <ModelInfoRow label={t("modelInfo.context")} value={formatNumber(stats.model.contextSize, 0)} />
              )}
              {stats.model.fileSizeBytes !== null && (
                <ModelInfoRow label={t("modelInfo.size")} value={formatBytes(stats.model.fileSizeBytes)} />
              )}
              {stats.model.parameterCount !== null && (
                <ModelInfoRow
                  label={t("modelInfo.parameters")}
                  value={t("unit.parameters", { value: formatNumber(stats.model.parameterCount / 1e9, 2) })}
                />
              )}
            </Stack>
          )}

          {options.showContextUsage && contextUsage && !isTiny && (
            <Stack gap={4}>
              <Group justify="space-between" wrap="nowrap" miw={0}>
                <Text size="xs" c="dimmed">
                  {t("stats.contextUsage")}
                </Text>
                <Text size="xs" fw={600}>
                  {contextUsageLabel}
                </Text>
              </Group>
              <Progress
                value={contextUsage.percent}
                size="xs"
                radius="xs"
                color={contextUsage.percent > 90 ? "red" : contextUsage.percent > 75 ? "yellow" : "blue"}
              />
            </Stack>
          )}

          {(stats.metrics.tokensGenerated !== null ||
            stats.metrics.tokensProcessed !== null ||
            stats.metrics.promptCacheHitRate !== null) && (
            <Card radius="md" p="xs" style={{ flex: 1, minHeight: 0 }}>
              <Stack gap={4}>
                {stats.metrics.tokensProcessed !== null && stats.metrics.tokensGenerated !== null && (
                  <Group justify="space-between" wrap="nowrap" miw={0}>
                    <Text size="xs" c="dimmed">
                      {t("stats.tokensProcessed")}
                    </Text>
                    <Text size="xs" fw={600}>
                      {formatNumber(stats.metrics.tokensProcessed + stats.metrics.tokensGenerated, 0)}
                    </Text>
                  </Group>
                )}
                {options.showCacheHitRate && stats.metrics.promptCacheHitRate !== null && (
                  <Group justify="space-between" wrap="nowrap" miw={0}>
                    <Text size="xs" c="dimmed">
                      {t("stats.cacheHitRate")}
                    </Text>
                    <Text size="xs" fw={600}>
                      {stats.metrics.promptCacheHitRate}%
                    </Text>
                  </Group>
                )}
                {options.showCacheHitRate && stats.metrics.promptCacheHitRate !== null && (
                  <Progress
                    value={stats.metrics.promptCacheHitRate}
                    size="xs"
                    radius="xs"
                    color={stats.metrics.promptCacheHitRate > 75 ? "green" : "blue"}
                  />
                )}
              </Stack>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}

const ModelInfoRow = ({ label, value }: { label: string; value: string }) => (
  <Group justify="space-between" wrap="nowrap" miw={0}>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    <Text size="xs" fw={600}>
      {value}
    </Text>
  </Group>
);

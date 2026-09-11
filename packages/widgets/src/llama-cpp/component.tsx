"use client";

import { useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { Box, Center, Group, Progress, RingProgress, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconBrain,
  IconBolt,
  IconCircleX,
  IconDatabase,
  IconFileText,
  IconGauge,
  IconLayersIntersect,
  IconServer,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatBytes, formatNumber } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getWidgetLayoutSize } from "../common/widget-layout-size";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors/no-integration-selected";

// Visible width drives how much info fits side-by-side; height only matters for the
// single-row (short) case where the widget must drop down to essentials.
const isNarrowWidth = (width: number) => width < 300; // 1 cell (200px)
const isWideWidth = (width: number) => width >= 550; // 3+ cells (624px+)
const isShortHeight = (height: number) => height < 300; // 1 row (200px)

const ringSizeByScale = [
  { minWidth: 320, size: 108 },
  { minWidth: 220, size: 92 },
  { minWidth: 0, size: 68 },
] as const;

const getContextColor = (percent: number) => (percent > 90 ? "red" : percent > 75 ? "yellow" : "blue");

export default function LlamacppWidget({
  integrationIds,
  options,
  width,
  height,
  displayScale,
  displayMode = "compact",
}: WidgetComponentProps<"llamacpp">) {
  const integrationId = integrationIds[0];
  const layoutSize = getWidgetLayoutSize({ width, height, displayScale, displayMode });
  if (!integrationId) {
    throw new NoIntegrationSelectedError();
  }

  return (
    <LlamacppContent
      integrationId={integrationId}
      options={options}
      width={layoutSize.width}
      height={layoutSize.height}
      displayMode={displayMode}
    />
  );
}

interface LlamacppContentProps {
  integrationId: string;
  options: WidgetComponentProps<"llamacpp">["options"];
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

function LlamacppContent({ integrationId, options, width, height, displayMode }: LlamacppContentProps) {
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
  const model = stats.model;
  const contextUsage = stats.contextUsage;
  const slots = stats.slots;

  const requestsProcessing = stats.metrics.requestsProcessing;
  const isBusy = requestsProcessing !== null && requestsProcessing > 0;

  let displayedSpeed: number | null;
  let speedMode: "request" | "live" | "average";
  if (isBusy && perRequestSpeedTps !== null) {
    displayedSpeed = perRequestSpeedTps;
    speedMode = "request";
  } else if (isBusy && (stats.metrics.generationSpeedTps ?? 0) > 0) {
    displayedSpeed = stats.metrics.generationSpeedTps;
    speedMode = "live";
  } else {
    displayedSpeed = stats.metrics.avgGenerationSpeedTps;
    speedMode = "average";
  }
  const speedTooltip =
    speedMode === "request"
      ? t("speedTooltip.request")
      : speedMode === "live"
        ? t("speedTooltip.current")
        : t("speedTooltip.average");

  const speedValue = displayedSpeed !== null && displayedSpeed > 0 ? formatNumber(displayedSpeed, 1) : t("unit.none");
  const statusColor = isHealthy ? "green" : "red";
  const statusLabel = isHealthy ? undefined : t("status.unhealthy", { status: stats.health });

  const contextPercent = options.showContextUsage && contextUsage ? contextUsage.percent : null;
  const contextLabel = contextUsage
    ? `${formatNumber(contextUsage.usedTokens, 0)} / ${formatNumber(contextUsage.contextSize, 0)} (${contextUsage.percent}%)`
    : null;

  const ringSize = ringSizeByScale.find(({ minWidth }) => Math.min(width, height) >= minWidth)?.size ?? 68;
  const ring = (
    <Tooltip label={speedTooltip} withArrow position="bottom">
      <RingProgress
        size={ringSize}
        thickness={Math.max(6, Math.round(ringSize / 10))}
        roundCaps
        sections={[
          { value: contextPercent ?? 0, color: contextPercent !== null ? getContextColor(contextPercent) : "gray" },
        ]}
        label={
          <Center>
            <Stack gap={0} align="center" style={{ lineHeight: 1.15 }}>
              <Text size={ringSize >= 92 ? "lg" : "sm"} fw={800} lineClamp={1}>
                {speedValue}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {t("unit.speedShort")}
              </Text>
            </Stack>
          </Center>
        }
      />
    </Tooltip>
  );

  const modelLine = model && (
    <Group gap={6} wrap="nowrap" miw={0}>
      <IconBrain size={14} color="dimmed" style={{ flexShrink: 0 }} />
      <Tooltip label={model.id} withArrow>
        <Text size="xs" lineClamp={1} style={{ maxWidth: "100%" }}>
          {model.name}
        </Text>
      </Tooltip>
      {model.quantization && (
        <Text size="xs" c="dimmed" fw={600} lineClamp={1} style={{ flexShrink: 0 }}>
          {model.quantization}
        </Text>
      )}
    </Group>
  );

  const busyLabel =
    requestsProcessing !== null ? (isBusy ? t("busy", { count: requestsProcessing }) : t("idle")) : null;

  const promptSpeed = stats.metrics.promptSpeedTps;
  const avgPromptSpeed = stats.metrics.avgPromptSpeedTps;
  const cacheHitRate = stats.metrics.promptCacheHitRate;
  const tokensProcessed = stats.metrics.tokensProcessed;
  const tokensGenerated = stats.metrics.tokensGenerated;
  const requestsDeferred = stats.metrics.requestsDeferred;
  const specDraftTokens = stats.metrics.specDraftTokens;
  const specAcceptedTokens = stats.metrics.specAcceptedTokens;
  const specDrafts = stats.metrics.specDrafts;
  const hasSpecStats = specDraftTokens !== null || specAcceptedTokens !== null || specDrafts !== null;

  if (displayMode === "advanced") {
    return (
      <Box h="100%" w="100%">
        <ScrollArea h="100%">
          <Stack gap="md" p="md">
            <Group gap="xs" wrap="nowrap" miw={0}>
              <StatusDot color={statusColor} label={statusLabel} />
              <Text size="md" fw={700} lineClamp={1}>
                {t("title")}
              </Text>
              {options.showRequests && busyLabel && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {busyLabel}
                </Text>
              )}
            </Group>

            <Group gap="lg" wrap="nowrap" miw={0}>
              {ring}
              <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
                {options.showSpeedStats && (
                  <AdvancedRow
                    icon={<IconBolt size={14} color="dimmed" />}
                    label={t("advanced.promptSpeed")}
                    value={
                      promptSpeed !== null && promptSpeed > 0
                        ? t("unit.speed", { value: formatNumber(promptSpeed, 1) })
                        : t("unit.none")
                    }
                  />
                )}
                {options.showSpeedStats && (
                  <AdvancedRow
                    icon={<IconBolt size={14} color="dimmed" />}
                    label={t("advanced.avgPrompt")}
                    value={
                      avgPromptSpeed !== null && avgPromptSpeed > 0
                        ? t("unit.speed", { value: formatNumber(avgPromptSpeed, 1) })
                        : t("unit.none")
                    }
                  />
                )}
                {options.showSpeedStats && stats.metrics.avgGenerationSpeedTps !== null && (
                  <AdvancedRow
                    icon={<IconGauge size={14} color="dimmed" />}
                    label={t("advanced.avgSpeed")}
                    value={
                      (stats.metrics.avgGenerationSpeedTps ?? 0) > 0
                        ? t("unit.speed", { value: formatNumber(stats.metrics.avgGenerationSpeedTps, 1) })
                        : t("unit.none")
                    }
                  />
                )}
                {options.showContextUsage && contextUsage && (
                  <AdvancedRow
                    icon={<IconDatabase size={14} color="dimmed" />}
                    label={t("stats.contextUsage")}
                    value={contextLabel ?? "—"}
                  />
                )}
                {options.showRequests && requestsProcessing !== null && (
                  <AdvancedRow
                    icon={<IconServer size={14} color="dimmed" />}
                    label={t("advanced.requests")}
                    value={formatNumber(requestsProcessing, 0)}
                  />
                )}
                {options.showRequests && requestsDeferred !== null && (
                  <AdvancedRow
                    icon={<IconLayersIntersect size={14} color="dimmed" />}
                    label={t("advanced.deferred")}
                    value={formatNumber(requestsDeferred, 0)}
                  />
                )}
              </Stack>
            </Group>

            {(options.showRequests || (options.showSpeculative && slots?.speculative)) && slots && (
              <Group gap="sm" wrap="nowrap" miw={0}>
                {options.showRequests && (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {t("advanced.slots", { processing: slots.processing, total: slots.total })}
                  </Text>
                )}
                {options.showSpeculative && slots.speculative && (
                  <Text size="xs" c="dimmed" lineClamp={1} fw={600}>
                    {t("advanced.speculative")}
                  </Text>
                )}
              </Group>
            )}

            {options.showModelInfo && model && (
              <Stack gap="xs">
                <AdvancedRow
                  icon={<IconBrain size={14} color="dimmed" />}
                  label={t("modelInfo.model")}
                  value={model.name}
                  valueTooltip={model.id}
                />
                {model.quantization && (
                  <AdvancedRow
                    icon={<IconFileText size={14} color="dimmed" />}
                    label={t("modelInfo.quantization")}
                    value={model.quantization}
                  />
                )}
                {model.contextSize !== null && (
                  <AdvancedRow
                    icon={<IconDatabase size={14} color="dimmed" />}
                    label={t("modelInfo.context")}
                    value={formatNumber(model.contextSize, 0)}
                  />
                )}
                {model.fileSizeBytes !== null && (
                  <AdvancedRow
                    icon={<IconFileText size={14} color="dimmed" />}
                    label={t("modelInfo.size")}
                    value={formatBytes(model.fileSizeBytes)}
                  />
                )}
                {model.parameterCount !== null && (
                  <AdvancedRow
                    icon={<IconBrain size={14} color="dimmed" />}
                    label={t("modelInfo.parameters")}
                    value={t("unit.parameters", { value: formatNumber(model.parameterCount / 1e9, 2) })}
                  />
                )}
              </Stack>
            )}

            {options.showTokenStats && (tokensProcessed !== null || tokensGenerated !== null) && (
              <Group gap="md" wrap="nowrap" miw={0}>
                {tokensProcessed !== null && (
                  <AdvancedRow
                    icon={<IconFileText size={14} color="dimmed" />}
                    label={t("stats.tokensProcessed")}
                    value={formatNumber(tokensProcessed, 0)}
                  />
                )}
                {tokensGenerated !== null && (
                  <AdvancedRow
                    icon={<IconBolt size={14} color="dimmed" />}
                    label={t("stats.tokensGenerated")}
                    value={formatNumber(tokensGenerated, 0)}
                  />
                )}
              </Group>
            )}

            {options.showSpeculative && hasSpecStats && (
              <Stack gap="xs">
                {specDrafts !== null && (
                  <AdvancedRow
                    icon={<IconLayersIntersect size={14} color="dimmed" />}
                    label={t("advanced.specDrafts")}
                    value={formatNumber(specDrafts, 0)}
                  />
                )}
                {specDraftTokens !== null && (
                  <AdvancedRow
                    icon={<IconFileText size={14} color="dimmed" />}
                    label={t("advanced.specDraftTokens")}
                    value={formatNumber(specDraftTokens, 0)}
                  />
                )}
                {specAcceptedTokens !== null && (
                  <AdvancedRow
                    icon={<IconBolt size={14} color="dimmed" />}
                    label={t("advanced.specAccepted")}
                    value={formatNumber(specAcceptedTokens, 0)}
                  />
                )}
              </Stack>
            )}

            {options.showCacheHitRate && cacheHitRate !== null && (
              <AdvancedRow
                icon={<IconDatabase size={14} color="dimmed" />}
                label={t("stats.cacheHitRate")}
                value={`${cacheHitRate}%`}
                progress={{ value: cacheHitRate, color: cacheHitRate > 75 ? "green" : "blue" }}
              />
            )}
          </Stack>
        </ScrollArea>
      </Box>
    );
  }

  // Compact (default) mode — density adapts to the widget's grid footprint.
  if (isNarrowWidth(width)) {
    return (
      <Center h="100%" w="100%">
        <Stack gap={isShortHeight(height) ? 0 : 4} align="center" p="xs" style={{ position: "relative" }}>
          <Center pos="relative">
            {ring}
            <Box pos="absolute" top={0} right={0} style={{ zIndex: 1 }}>
              <StatusDot color={statusColor} label={statusLabel} />
            </Box>
          </Center>
          {!isShortHeight(height) && options.showModelInfo && modelLine}
        </Stack>
      </Center>
    );
  }

  const rightColumn = (
    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
      {options.showModelInfo && modelLine}
      {options.showRequests && busyLabel && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {busyLabel}
        </Text>
      )}
      {options.showContextUsage && contextUsage && (
        <Group gap={6} wrap="nowrap" miw={0} w="100%" align="center">
          <Progress
            value={contextUsage.percent}
            size="xs"
            radius="xs"
            color={getContextColor(contextUsage.percent)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <Text size="xs" c="dimmed" lineClamp={1} style={{ flexShrink: 0 }}>
            {contextUsage.percent}%
          </Text>
        </Group>
      )}
      {isWideWidth(width) && (
        <Stack gap="xs">
          {options.showSpeedStats && promptSpeed !== null && promptSpeed > 0 && (
            <InfoRow
              label={t("advanced.promptSpeed")}
              value={t("unit.speed", { value: formatNumber(promptSpeed, 1) })}
            />
          )}
          {options.showCacheHitRate && cacheHitRate !== null && (
            <InfoRow label={t("stats.cacheHitRate")} value={`${cacheHitRate}%`} />
          )}
          {options.showTokenStats && (tokensProcessed !== null || tokensGenerated !== null) && (
            <InfoRow
              label={t("stats.tokensProcessed")}
              value={
                tokensProcessed !== null && tokensGenerated !== null
                  ? formatNumber(tokensProcessed + tokensGenerated, 0)
                  : tokensProcessed !== null
                    ? formatNumber(tokensProcessed, 0)
                    : "—"
              }
            />
          )}
        </Stack>
      )}
    </Stack>
  );

  if (isShortHeight(height)) {
    return (
      <Center h="100%" w="100%">
        <Group gap="md" w="100%" wrap="nowrap" miw={0} justify="center" p="xs">
          {ring}
          {!isNarrowWidth(width) && (
            <Stack gap={2} style={{ minWidth: 0 }}>
              {options.showModelInfo && modelLine}
              {options.showRequests && busyLabel && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {busyLabel}
                </Text>
              )}
            </Stack>
          )}
        </Group>
      </Center>
    );
  }

  return (
    <Box h="100%" p="xs" pos="relative">
      <Group pos="absolute" top={6} right={10} gap={0} style={{ zIndex: 2 }}>
        <StatusDot color={statusColor} label={statusLabel} />
      </Group>
      <Center h="100%">
        <Group gap="md" w="100%" wrap="nowrap" miw={0}>
          {ring}
          {rightColumn}
        </Group>
      </Center>
    </Box>
  );
}

const StatusDot = ({ color, label }: { color: string; label?: string }) => {
  const dot = (
    <Box
      aria-label={label}
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        backgroundColor: `var(--mantine-color-${color}-6)`,
        flexShrink: 0,
        cursor: "default",
      }}
    />
  );
  if (!label) return dot;
  return (
    <Tooltip label={label} withArrow position="left">
      {dot}
    </Tooltip>
  );
};

interface AdvancedRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  valueTooltip?: string;
  progress?: { value: number; color: string };
}

const AdvancedRow = ({ icon, label, value, valueTooltip, progress }: AdvancedRowProps) => (
  <Stack gap={3} style={{ minWidth: 150 }}>
    <Group gap={6} wrap="nowrap" miw={0} justify="space-between" w="100%">
      <Group gap={6} wrap="nowrap" miw={0}>
        {icon}
        <Text size="xs" c="dimmed" lineClamp={1}>
          {label}
        </Text>
      </Group>
      {valueTooltip ? (
        <Tooltip label={valueTooltip} withArrow>
          <Text size="xs" fw={600} lineClamp={1} style={{ maxWidth: 240 }}>
            {value}
          </Text>
        </Tooltip>
      ) : (
        <Text size="xs" fw={600} lineClamp={1} style={{ maxWidth: 240 }}>
          {value}
        </Text>
      )}
    </Group>
    {progress && <Progress value={progress.value} size="xs" radius="xs" color={progress.color} />}
  </Stack>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Group justify="space-between" wrap="nowrap" miw={0}>
    <Text size="xs" c="dimmed" lineClamp={1}>
      {label}
    </Text>
    <Text size="xs" fw={600} lineClamp={1}>
      {value}
    </Text>
  </Group>
);

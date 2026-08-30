"use client";

import { useId, useMemo, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  Badge,
  Box,
  Collapse,
  Divider,
  Group,
  Loader,
  Popover,
  RingProgress,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
} from "@mantine/core";
import { IconChevronDown, IconRobot } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { assistantProviderIds, assistantProviderPresets } from "@homarr/definitions";
import type { AssistantProvider } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import {
  getAssistantContextBreakdown,
  getAssistantConversationUsage,
  getAssistantTelemetry,
} from "./assistant-message-metadata";
import type { AssistantContextBreakdown, AssistantConversationTurnUsage } from "./assistant-message-metadata";

const formatDuration = (milliseconds: number) =>
  milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${(milliseconds / 1000).toFixed(1)} s`;

const getCostPrecision = (cost: number) => {
  if (cost < 0.001) return 5;
  if (cost < 0.01) return 4;
  return 3;
};

const formatCost = (cost: number) => {
  if (cost === 0) return "$0";
  if (cost < 0.00001) return `<$0.00001`;
  return `$${cost.toFixed(getCostPrecision(cost))}`;
};

const formatStepThroughput = (providerThroughput: number | undefined, fallbackThroughput: number | undefined) => {
  const throughput = providerThroughput ?? fallbackThroughput;
  if (throughput === undefined) return "";
  return ` · ${throughput.toFixed(1)} tok/s`;
};

const getContextColor = (percentage: number) => {
  if (percentage >= 90) return "red";
  if (percentage >= 75) return "orange";
  return "blue";
};

const getAssistantProviderPreset = (provider: string) => {
  if (!assistantProviderIds.includes(provider as AssistantProvider)) return null;
  return assistantProviderPresets[provider as AssistantProvider];
};

const ProviderIcon = ({ provider, size = 16 }: { provider: string; size?: number }) => {
  const colorScheme = useComputedColorScheme("light");
  const preset = getAssistantProviderPreset(provider);
  const source = colorScheme === "dark" && preset && "darkIconUrl" in preset ? preset.darkIconUrl : preset?.iconUrl;

  return source ? (
    <Box component="img" className={classes.providerIcon} src={source} alt="" aria-hidden w={size} h={size} />
  ) : (
    <IconRobot size={size} aria-hidden />
  );
};

export const ProviderMessageInfo = () => {
  const metadata = useAuiState((state) => state.message.metadata);
  const telemetry = getAssistantTelemetry(metadata);
  if (!telemetry) return null;

  const details = [
    telemetry.modelId,
    telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : undefined,
    telemetry.outputTokensPerSecond !== undefined ? `${telemetry.outputTokensPerSecond.toFixed(1)} tok/s` : undefined,
    telemetry.cost !== undefined ? formatCost(telemetry.cost) : undefined,
  ].filter(Boolean);

  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs" fw={700} tt="capitalize">
            {telemetry.provider}
          </Text>
          <Text size="xs">{details.join(" · ")}</Text>
        </Stack>
      }
      multiline
      maw="min(24rem, calc(100vw - 2rem))"
    >
      <Box
        component="span"
        className={classes.providerAction}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the logo and its focused tooltip form one labelled image
        role="img"
        tabIndex={0}
        aria-label={`${telemetry.provider}: ${telemetry.modelId}`}
      >
        <ProviderIcon provider={telemetry.provider} />
      </Box>
    </Tooltip>
  );
};

const ConversationTurn = ({
  index,
  messageId,
  threadId,
  turn,
}: {
  index: number;
  messageId?: string;
  threadId?: string;
  turn: AssistantConversationTurnUsage;
}) => {
  const t = useI18n("assistant");
  const detailsId = useId();
  const [opened, setOpened] = useState(false);
  const generationQuery = clientApi.assistant.getGenerationTelemetry.useQuery(
    { threadId: threadId ?? "", messageId: messageId ?? "" },
    {
      enabled: opened && turn.provider === "openrouter" && Boolean(threadId) && Boolean(messageId),
      refetchInterval: (query) =>
        query.state.data?.complete === false && query.state.dataUpdateCount < 6 ? 1500 : false,
      retry: 2,
      staleTime: (query) => (query.state.data?.complete ? 5 * 60_000 : 0),
    },
  );
  const generationById = new Map(
    generationQuery.data?.generations.flatMap((generation) =>
      generation.generationId ? [[generation.generationId, generation] as const] : [],
    ) ?? [],
  );
  const steps = turn.telemetry.steps.map((step) => ({
    ...step,
    ...(step.generationId ? generationById.get(step.generationId) : undefined),
  }));
  const sumCompleteMetric = (getValue: (step: (typeof steps)[number]) => number | undefined) => {
    if (steps.length === 0) return undefined;
    const values = steps.map(getValue);
    return values.some((value) => value === undefined)
      ? undefined
      : (values as number[]).reduce((sum, value) => sum + value, 0);
  };
  const providerInputTokens = sumCompleteMetric((step) => step.inputTokens);
  const providerOutputTokens = sumCompleteMetric((step) => step.outputTokens);
  const providerGenerationTimeMs = sumCompleteMetric((step) => step.generationTimeMs);
  const providerOutputTokensPerSecond =
    providerOutputTokens !== undefined && providerGenerationTimeMs !== undefined && providerGenerationTimeMs > 0
      ? providerOutputTokens / (providerGenerationTimeMs / 1000)
      : undefined;
  const latestStep = steps.at(-1);
  const providerContextUsed =
    latestStep?.inputTokens !== undefined && latestStep.outputTokens !== undefined
      ? latestStep.inputTokens + latestStep.outputTokens
      : undefined;
  const usage = {
    ...turn.usage,
    ...(generationQuery.data?.complete && providerInputTokens !== undefined
      ? { inputTokens: providerInputTokens }
      : {}),
    ...(generationQuery.data?.complete && providerOutputTokens !== undefined
      ? { outputTokens: providerOutputTokens }
      : {}),
    ...(generationQuery.data?.complete && providerInputTokens !== undefined && providerOutputTokens !== undefined
      ? { totalTokens: providerInputTokens + providerOutputTokens }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.cachedInputTokens) !== undefined
      ? { cachedInputTokens: sumCompleteMetric((step) => step.cachedInputTokens) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.reasoningTokens) !== undefined
      ? { reasoningTokens: sumCompleteMetric((step) => step.reasoningTokens) }
      : {}),
  };
  const telemetry = {
    ...turn.telemetry,
    steps,
    ...(generationQuery.data?.complete && providerGenerationTimeMs !== undefined
      ? { generationTimeMs: providerGenerationTimeMs }
      : {}),
    ...(generationQuery.data?.complete && providerOutputTokensPerSecond !== undefined
      ? { providerOutputTokensPerSecond }
      : {}),
    ...(generationQuery.data?.complete && providerContextUsed !== undefined
      ? {
          contextUsed: providerContextUsed,
          ...(turn.telemetry.contextLength
            ? { contextUtilization: Math.min(providerContextUsed / turn.telemetry.contextLength, 1) }
            : {}),
        }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.cost) !== undefined
      ? { cost: sumCompleteMetric((step) => step.cost), costType: "reported" as const }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.upstreamCost) !== undefined
      ? { upstreamCost: sumCompleteMetric((step) => step.upstreamCost) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.cacheDiscount) !== undefined
      ? { cacheDiscount: sumCompleteMetric((step) => step.cacheDiscount) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.fallbackCount) !== undefined
      ? { fallbackCount: sumCompleteMetric((step) => step.fallbackCount) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.fallbackLatencyMs) !== undefined
      ? { fallbackLatencyMs: sumCompleteMetric((step) => step.fallbackLatencyMs) }
      : {}),
  };
  const displayedThroughput = telemetry.providerOutputTokensPerSecond ?? telemetry.outputTokensPerSecond;
  let reportedCost: string | undefined;
  if (telemetry.cost !== undefined) {
    reportedCost = formatCost(telemetry.cost);
    if (telemetry.costType) reportedCost += ` · ${t(`usage.${telemetry.costType}`)}`;
  }

  return (
    <Box className={classes.conversationTurn} data-opened={opened || undefined}>
      <UnstyledButton
        className={classes.conversationTurnTrigger}
        aria-expanded={opened}
        aria-controls={detailsId}
        onClick={() => setOpened((value) => !value)}
      >
        <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" miw={0}>
            <Box className={classes.conversationTurnProvider}>
              <ProviderIcon provider={turn.provider} size={15} />
            </Box>
            <Box miw={0}>
              <Text size="xs" fw={650} truncate>
                {t("usage.step", { number: index + 1 })} · {turn.modelId}
              </Text>
              <Text size="xs" c="dimmed">
                {[
                  telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : undefined,
                  displayedThroughput !== undefined ? `${displayedThroughput.toFixed(1)} tok/s` : undefined,
                  usage.totalTokens !== undefined
                    ? `${usage.totalTokens.toLocaleString()} ${t("usage.tokens")}`
                    : undefined,
                  telemetry.cost !== undefined ? formatCost(telemetry.cost) : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("usage.notReported")}
              </Text>
            </Box>
          </Group>
          <IconChevronDown size={14} className={classes.disclosureIcon} data-opened={opened || undefined} />
        </Group>
      </UnstyledButton>
      <Collapse id={detailsId} expanded={opened}>
        <Stack gap="sm" pt="sm">
          {generationQuery.isFetching && generationQuery.data?.complete !== true && (
            <Group gap="xs">
              <Loader size="xs" type="bars" />
              <Text size="xs" c="dimmed">
                {t("usage.loadingProviderDetails")}
              </Text>
            </Group>
          )}
          {!generationQuery.isFetching && generationQuery.data?.complete === false && (
            <Text size="xs" c="dimmed">
              {t("usage.providerDetailsPending")}
            </Text>
          )}
          <Box className={classes.usageGrid}>
            {[
              [t("usage.input"), usage.inputTokens?.toLocaleString()],
              [t("usage.output"), usage.outputTokens?.toLocaleString()],
              [t("usage.cached"), usage.cachedInputTokens?.toLocaleString()],
              [t("usage.reasoning"), usage.reasoningTokens?.toLocaleString()],
              [t("usage.cacheWrite"), usage.cacheWriteTokens?.toLocaleString()],
              [t("usage.tokens"), usage.totalTokens?.toLocaleString()],
              [
                t("usage.firstOutput"),
                telemetry.timeToFirstOutputMs !== undefined ? formatDuration(telemetry.timeToFirstOutputMs) : undefined,
              ],
              [
                t("usage.endToEnd"),
                telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : undefined,
              ],
              [
                t("usage.generationTime"),
                telemetry.generationTimeMs !== undefined ? formatDuration(telemetry.generationTimeMs) : undefined,
              ],
              [
                t("usage.providerThroughput"),
                displayedThroughput !== undefined ? `${displayedThroughput.toFixed(1)} tok/s` : undefined,
              ],
              [t("usage.cost"), reportedCost],
              [
                t("usage.upstreamCost"),
                telemetry.upstreamCost !== undefined ? formatCost(telemetry.upstreamCost) : undefined,
              ],
              [t("usage.fallbacks"), telemetry.fallbackCount?.toLocaleString()],
              [
                t("usage.fallbackLatency"),
                telemetry.fallbackLatencyMs !== undefined ? formatDuration(telemetry.fallbackLatencyMs) : undefined,
              ],
              [
                t("usage.cacheDiscount"),
                telemetry.cacheDiscount !== undefined ? formatCost(telemetry.cacheDiscount) : undefined,
              ],
              [t("usage.webSearches"), telemetry.webSearchRequests?.toLocaleString()],
              [t("usage.finishReason"), telemetry.finishReason],
            ].map(([label, value]) => (
              <div key={label}>
                <Text size="xs" c="dimmed">
                  {label}
                </Text>
                <Text size="sm" fw={600}>
                  {value ?? t("usage.notReported")}
                </Text>
              </div>
            ))}
          </Box>
          {(telemetry.contextUsed !== undefined || telemetry.contextLength !== undefined) && (
            <Text size="xs" c="dimmed">
              {t("usage.contextWindow")}: {telemetry.contextUsed?.toLocaleString() ?? t("usage.notReported")} /{" "}
              {telemetry.contextLength?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          )}
          {steps.length > 0 && (
            <Stack gap={4}>
              <Text size="xs" fw={650}>
                {t("usage.agentSteps")}
              </Text>
              {steps.map((step) => (
                <Box key={step.index} className={classes.stepRow}>
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="xs" fw={600}>
                      {t("usage.step", { number: step.index })}
                      {step.routedProvider ? ` · ${step.routedProvider}` : ""}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDuration(step.durationMs)}
                      {formatStepThroughput(step.providerOutputTokensPerSecond, step.outputTokensPerSecond)}
                      {step.cost !== undefined ? ` · ${formatCost(step.cost)}` : ""}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {[
                      step.providerLatencyMs !== undefined
                        ? `${t("usage.providerLatency")} ${formatDuration(step.providerLatencyMs)}`
                        : undefined,
                      step.generationTimeMs !== undefined
                        ? `${t("usage.generationTime")} ${formatDuration(step.generationTimeMs)}`
                        : undefined,
                      step.moderationLatencyMs !== undefined
                        ? `${t("usage.moderationLatency")} ${formatDuration(step.moderationLatencyMs)}`
                        : undefined,
                      step.inputTokens !== undefined
                        ? `${step.inputTokens.toLocaleString()} ${t("usage.inputShort")}`
                        : undefined,
                      step.outputTokens !== undefined
                        ? `${step.outputTokens.toLocaleString()} ${t("usage.outputShort")}`
                        : undefined,
                      step.cachedInputTokens !== undefined
                        ? `${step.cachedInputTokens.toLocaleString()} ${t("usage.cachedShort")}`
                        : undefined,
                      step.reasoningTokens !== undefined
                        ? `${step.reasoningTokens.toLocaleString()} ${t("usage.reasoningShort")}`
                        : undefined,
                      step.fallbackCount !== undefined
                        ? `${t("usage.fallbacks")} ${step.fallbackCount.toLocaleString()}`
                        : undefined,
                      step.fallbackLatencyMs !== undefined
                        ? `${t("usage.fallbackLatency")} ${formatDuration(step.fallbackLatencyMs)}`
                        : undefined,
                      step.nativeFinishReason,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("usage.notReported")}
                  </Text>
                  {(step.normalizedInputTokens !== undefined || step.normalizedOutputTokens !== undefined) && (
                    <Text size="xs" c="dimmed">
                      {t("usage.normalizedTokens")}: {step.normalizedInputTokens?.toLocaleString() ?? "–"} /{" "}
                      {step.normalizedOutputTokens?.toLocaleString() ?? "–"}
                    </Text>
                  )}
                  {(step.routerStrategy || step.routerRegion || step.serviceTier || step.dataRegion || step.isByok) && (
                    <Text size="xs" c="dimmed">
                      {[
                        step.routerStrategy,
                        step.routerRegion,
                        step.serviceTier,
                        step.dataRegion,
                        step.isByok ? t("usage.byok") : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  )}
                  {step.generationId && (
                    <Text size="xs" c="dimmed" className={classes.generationId} title={step.generationId}>
                      {t("usage.generation")}: {step.generationId}
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

const ConversationContextBreakdown = ({ breakdown }: { breakdown: AssistantContextBreakdown }) => {
  const t = useI18n("assistant");
  const hasContext = breakdown.percentage !== undefined;
  const categories = [
    { label: t("usage.input"), value: breakdown.inputTokens },
    { label: t("usage.cached"), value: breakdown.cachedInputTokens },
    { label: t("usage.output"), value: breakdown.outputTokens },
    { label: t("usage.reasoning"), value: breakdown.reasoningTokens },
  ];

  return (
    <Box className={classes.contextBreakdown}>
      <RingProgress
        className={classes.contextBreakdownRing}
        size={76}
        thickness={7}
        roundCaps
        sections={
          hasContext ? [{ value: breakdown.percentage ?? 0, color: getContextColor(breakdown.percentage ?? 0) }] : []
        }
        label={
          <Text ta="center" size="xs" fw={700}>
            {hasContext ? `${breakdown.percentage}%` : "–"}
          </Text>
        }
      />
      <Box className={classes.contextBreakdownWindow}>
        {[
          { label: t("usage.used"), value: breakdown.contextUsed },
          { label: t("usage.remaining"), value: breakdown.remaining },
          { label: t("usage.capacity"), value: breakdown.contextLength },
        ].map((item) => (
          <Box key={item.label}>
            <Text size="xs" c="dimmed">
              {item.label}
            </Text>
            <Text size="sm" fw={650}>
              {item.value?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </Box>
        ))}
      </Box>
      <Box className={classes.contextBreakdownCategories}>
        {categories.map((category) => (
          <Box key={category.label}>
            <Text size="xs" c="dimmed">
              {category.label}
            </Text>
            <Text size="xs" fw={650}>
              {category.value?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const ConversationContext = () => {
  const t = useI18n("assistant");
  const [opened, setOpened] = useState(false);
  const messages = useAuiState((state) => state.thread.messages);
  const threadId = useAuiState((state) => state.threadListItem.remoteId);
  const metadata = useMemo(() => messages.map((message) => message.metadata), [messages]);
  const messageIdByRequestId = useMemo(
    () =>
      new Map(
        messages.flatMap((message) => {
          const telemetry = getAssistantTelemetry(message.metadata);
          return telemetry ? [[telemetry.requestId, message.id] as const] : [];
        }),
      ),
    [messages],
  );
  const usage = useMemo(() => getAssistantConversationUsage(metadata), [metadata]);
  const breakdown = useMemo(() => getAssistantContextBreakdown(usage), [usage]);
  const hasTokenUsage = usage.turns.some((turn) => turn.totalTokens !== undefined);
  const hasCost = usage.turns.some((turn) => turn.cost !== undefined);
  const hasContext = breakdown.percentage !== undefined;
  const contextPercentage = breakdown.percentage ?? 0;
  const quickLabel = [
    hasTokenUsage ? `${usage.totalTokens.toLocaleString()} ${t("usage.tokens")}` : undefined,
    hasCost ? formatCost(usage.cost) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width="min(28rem, calc(100vw - 1rem))"
      position="top-end"
      shadow="md"
      withinPortal
      trapFocus
      returnFocus
    >
      <Popover.Target>
        <UnstyledButton
          className={classes.composerContext}
          type="button"
          aria-label={quickLabel ? `${t("usage.contextWindow")}: ${quickLabel}` : t("usage.contextWindow")}
          title={quickLabel || t("usage.contextWindow")}
          aria-expanded={opened}
          aria-haspopup="dialog"
          onClick={() => setOpened((value) => !value)}
        >
          <Group gap={5} wrap="nowrap">
            <RingProgress
              size={22}
              thickness={3}
              roundCaps
              sections={hasContext ? [{ value: contextPercentage, color: getContextColor(contextPercentage) }] : []}
            />
            <Text className={classes.composerContextLabel} component="span" size="xs" fw={650}>
              {hasContext ? `${contextPercentage}%` : t("mentions.context")}
            </Text>
          </Group>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown className={classes.conversationContextPopover}>
        <Stack gap="sm">
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Box miw={0}>
              <Text size="sm" fw={700}>
                {t("usage.contextWindow")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("usage.requestDetails")}
              </Text>
            </Box>
            {hasContext && (
              <Badge size="sm" variant="light" color={getContextColor(contextPercentage)}>
                {contextPercentage}%
              </Badge>
            )}
          </Group>
          <Box className={classes.conversationUsageSummary}>
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.tokens")}
              </Text>
              <Text size="sm" fw={650}>
                {hasTokenUsage ? usage.totalTokens.toLocaleString() : t("usage.notReported")}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.cost")}
              </Text>
              <Text size="sm" fw={650}>
                {hasCost ? formatCost(usage.cost) : t("usage.notReported")}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.agentSteps")}
              </Text>
              <Text size="sm" fw={650}>
                {usage.turns.reduce((total, turn) => total + turn.telemetry.steps.length, 0).toLocaleString()}
              </Text>
            </div>
          </Box>
          <ConversationContextBreakdown breakdown={breakdown} />
          <Divider />
          <ScrollArea.Autosize mah="min(14rem, 30dvh)" type="auto" offsetScrollbars>
            <Stack gap={5}>
              {usage.turns.length === 0 ? (
                <Text size="sm" c="dimmed" py="xs">
                  {t("usage.notReported")}
                </Text>
              ) : (
                usage.turns.map((turn, index) => (
                  <ConversationTurn
                    key={turn.requestId}
                    index={index}
                    turn={turn}
                    threadId={threadId ?? undefined}
                    messageId={messageIdByRequestId.get(turn.requestId)}
                  />
                ))
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

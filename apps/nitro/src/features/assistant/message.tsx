import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

import { AssistantError, useAssistantAction, useAssistantFeature } from "./feature";
import type { AssistantMessage } from "./messages";
import {
  assistantDisplayMetadata,
  assistantMessageFeedback,
  assistantMessageHasOtherParts,
  assistantMessageHasPendingTool,
  assistantMessageReasoning,
  assistantMessageText,
} from "./messages";
import classes from "./assistant.module.css";

export function AssistantMessageView({
  message,
  threadId,
  persisted,
  busy,
  onEdit,
  onRegenerate,
  renderParts,
}: {
  readonly message: AssistantMessage;
  readonly threadId: string;
  readonly persisted: boolean;
  readonly busy: boolean;
  readonly onEdit: () => void;
  readonly onRegenerate?: () => void;
  readonly renderParts?: (parts: readonly unknown[]) => ReactNode;
}) {
  const { client, access, queryKey, t, copy } = useAssistantFeature();
  const queryClient = useQueryClient();
  const feedback = useAssistantAction();
  const [details, setDetails] = useState(false);
  const metadata = assistantDisplayMetadata(message);
  const telemetry = metadata?.custom?.telemetry;
  const text = assistantMessageText(message);
  const reasoning = assistantMessageReasoning(message);
  const submitted = assistantMessageFeedback(message);
  const generation = useQuery({
    queryKey: [...queryKey, "telemetry", threadId, message.id],
    queryFn: ({ signal }) =>
      client.assistant.getGenerationTelemetry(
        { threadId, messageId: message.id },
        { signal: AbortSignal.any([signal, access.signal]) },
      ),
    enabled: details && persisted && !busy && telemetry?.provider === "openrouter",
    refetchInterval: (query) =>
      query.state.data?.complete === false && query.state.dataUpdateCount < 6 ? 1500 : false,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const disabled = busy || access.readOnly || !persisted;
  const submitFeedback = (type: "positive" | "negative") => {
    void feedback.execute(async () => {
      await client.assistant.submitFeedback({ threadId, messageId: message.id, type }, { signal: access.signal });
      if (!access.signal.aborted) await queryClient.invalidateQueries({ queryKey: [...queryKey, "thread", threadId] });
    });
  };

  return (
    <Stack component="article" gap="sm" className={classes.message} data-role={message.role}>
      <Text fw={650} size="sm">
        {message.role === "assistant" ? t("assistant.title") : (access.principal.user.name ?? t("user.name"))}
      </Text>
      {text && <Text className={classes.messageText}>{text}</Text>}
      {!persisted && !busy && <Alert color="yellow">{copy.unconfirmedMessage}</Alert>}
      {reasoning && (
        <details>
          <summary>{t("assistant.reasoning")}</summary>
          <Text size="sm" className={classes.messageText}>
            {reasoning}
          </Text>
        </details>
      )}
      {assistantMessageHasOtherParts(message) &&
        (renderParts ? (
          renderParts(message.parts)
        ) : (
          <Text size="sm">
            {assistantMessageHasPendingTool(message)
              ? t("assistant.pendingAction.sendBlocked")
              : copy.richPartsUnavailable}
          </Text>
        ))}
      <Group gap="xs">
        {message.role === "user" ? (
          <Button size="compact-xs" variant="subtle" disabled={disabled} onClick={onEdit}>
            {t("assistant.editMessage")}
          </Button>
        ) : (
          <>
            <Button
              size="compact-xs"
              variant={submitted === "positive" ? "light" : "subtle"}
              aria-pressed={submitted === "positive"}
              disabled={disabled || feedback.pending}
              onClick={() => submitFeedback("positive")}
            >
              {t("assistant.helpful")}
            </Button>
            <Button
              size="compact-xs"
              variant={submitted === "negative" ? "light" : "subtle"}
              aria-pressed={submitted === "negative"}
              disabled={disabled || feedback.pending}
              onClick={() => submitFeedback("negative")}
            >
              {t("assistant.notHelpful")}
            </Button>
            {onRegenerate && (
              <Button size="compact-xs" variant="subtle" disabled={disabled} onClick={onRegenerate}>
                {t("assistant.regenerate")}
              </Button>
            )}
            <Button
              size="compact-xs"
              variant="subtle"
              aria-expanded={details}
              onClick={() => setDetails((value) => !value)}
            >
              {t("assistant.usage.requestDetails")}
            </Button>
          </>
        )}
      </Group>
      {feedback.failed && <AssistantError message={t("assistant.feedbackError")} />}
      {details && (
        <Stack gap="xs">
          {telemetry && (
            <Text size="sm" className={classes.breakWord}>
              {telemetry.provider} · {telemetry.modelId}
            </Text>
          )}
          <Group gap="sm">
            {metadata?.usage?.inputTokens !== undefined && (
              <Badge variant="outline">
                {t("assistant.usage.input")}: {metadata.usage.inputTokens}
              </Badge>
            )}
            {metadata?.usage?.outputTokens !== undefined && (
              <Badge variant="outline">
                {t("assistant.usage.output")}: {metadata.usage.outputTokens}
              </Badge>
            )}
            {telemetry?.durationMs !== undefined && (
              <Text size="sm">
                {t("assistant.usage.homarrTiming")}: {telemetry.durationMs} ms
              </Text>
            )}
            {telemetry?.cost !== undefined && (
              <Text size="sm">
                {t("assistant.usage.cost")}: ${telemetry.cost}{" "}
                {telemetry.costType && t(`assistant.usage.${telemetry.costType}`)}
              </Text>
            )}
          </Group>
          {telemetry?.contextUsed !== undefined && (
            <Text size="sm">
              {t("assistant.usage.contextWindow")}: {telemetry.contextUsed} /{" "}
              {telemetry.contextLength ?? t("assistant.usage.notReported")}
            </Text>
          )}
          {!telemetry && <Text size="sm">{t("assistant.usage.notReported")}</Text>}
          {generation.isFetching && <Text size="sm">{t("assistant.usage.loadingProviderDetails")}</Text>}
          {generation.isError && <AssistantError retry={() => void generation.refetch()} />}
          {generation.data?.complete === false && (
            <Group>
              <Text size="sm">{t("assistant.usage.providerDetailsPending")}</Text>
              <Button
                variant="default"
                size="xs"
                disabled={generation.isFetching}
                onClick={() => void generation.refetch()}
              >
                {t("common.action.tryAgain")}
              </Button>
            </Group>
          )}
          {generation.data?.generations.map((item, index) => (
            <Group key={item.generationId ?? index} gap="sm">
              <Text size="sm">{t("assistant.usage.step", { number: index + 1 })}</Text>
              {item.inputTokens !== undefined && (
                <Text size="sm">
                  {t("assistant.usage.input")}: {item.inputTokens}
                </Text>
              )}
              {item.outputTokens !== undefined && (
                <Text size="sm">
                  {t("assistant.usage.output")}: {item.outputTokens}
                </Text>
              )}
              {item.cost !== undefined && (
                <Text size="sm">
                  {t("assistant.usage.reported")}: ${item.cost}
                </Text>
              )}
              {item.generationTimeMs !== undefined && (
                <Text size="sm">
                  {t("assistant.usage.providerTiming")}: {item.generationTimeMs} ms
                </Text>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

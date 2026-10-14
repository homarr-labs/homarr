import { Alert, Button, Group, Select, Stack, Text, Textarea, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { AssistantReasoning } from "./client";
import { useAssistantConversation } from "./conversation";
import { AssistantError, AssistantLoading, useAssistantAction, useAssistantFeature } from "./feature";
import { AssistantMessageView } from "./message";
import { assistantBranch, assistantMessageHasPendingTool, assistantMessageText } from "./messages";
import { AssistantThreadList } from "./thread-list";
import classes from "./assistant.module.css";

export interface AssistantChatProps {
  readonly initialThreadId?: string;
  readonly onBusyChange?: (busy: boolean) => void;
  readonly renderParts?: (parts: readonly unknown[]) => ReactNode;
}

export function AssistantChat({ initialThreadId, onBusyChange, renderParts }: AssistantChatProps) {
  const { client, access, queryKey, t } = useAssistantFeature();
  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  const availability = useQuery({
    queryKey: [...queryKey, "availability"],
    queryFn: ({ signal }) =>
      client.assistant.getAvailability(undefined, { signal: AbortSignal.any([signal, access.signal]) }),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  return (
    <Stack className={classes.workspace}>
      <Group justify="space-between">
        <Title order={2}>{t("assistant.title")}</Title>
        <Button variant="default" hiddenFrom="sm" aria-expanded={history} onClick={() => setHistory((value) => !value)}>
          {t(history ? "assistant.closeHistory" : "assistant.openHistory")}
        </Button>
      </Group>
      <div className={classes.layout}>
        <div className={classes.history} data-opened={history || undefined}>
          <AssistantThreadList
            selectedId={threadId}
            blocked={busy}
            onSelect={(id) => {
              if (busy) return;
              setThreadId(id);
              setHistory(false);
            }}
            onDeleted={(id) => setThreadId((current) => (current === id ? null : current))}
          />
        </div>
        <Stack className={classes.conversation}>
          {availability.isPending ? (
            <AssistantLoading />
          ) : availability.isError ? (
            <AssistantError retry={() => void availability.refetch()} />
          ) : !availability.data.enabled && !busy ? (
            <Alert>{t("assistant.unavailable.notConfigured")}</Alert>
          ) : threadId ? (
            <AssistantConversation
              key={threadId}
              threadId={threadId}
              onBusyChange={setBusy}
              renderParts={renderParts}
            />
          ) : (
            <Stack py="xl">
              <Title order={3}>{t("assistant.emptyTitle")}</Title>
              <Text>{t("assistant.emptyDescription")}</Text>
              <Text size="sm">{t("assistant.newConversation")}</Text>
            </Stack>
          )}
        </Stack>
      </div>
    </Stack>
  );
}

function AssistantConversation({
  threadId,
  onBusyChange,
  renderParts,
}: {
  readonly threadId: string;
  readonly onBusyChange: (busy: boolean) => void;
  readonly renderParts?: (parts: readonly unknown[]) => ReactNode;
}) {
  const { client, access, domain, generation, queryKey, t, copy } = useAssistantFeature();
  const conversation = useAssistantConversation(threadId);
  const modelAction = useAssistantAction();
  const modelAttempt = useRef<{ expectedModelId: string; reading: boolean } | null>(null);
  const modelOwner = useRef<{ active: boolean } | null>(null);
  const [modelHeld, setModelHeld] = useState(false);
  const deleteAction = useAssistantAction();
  const [draft, setDraft] = useState("");
  const [reasoning, setReasoning] = useState<AssistantReasoning>("auto");
  const [editing, setEditing] = useState<{ id: string; parentId: string | null } | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const owner = { active: true };
    modelOwner.current = owner;
    return () => {
      owner.active = false;
    };
  }, [access.signal, threadId]);
  const reconcileModel = async () => {
    const attempt = modelAttempt.current;
    const owner = modelOwner.current;
    if (!owner?.active || access.signal.aborted) return;
    if (!attempt) {
      const readback = await conversation.reload();
      if (owner.active && !access.signal.aborted && !modelAttempt.current && readback?.thread.id === threadId)
        modelAction.reset();
      return;
    }
    if (attempt.reading) return;
    attempt.reading = true;
    try {
      const readback = await conversation.reload();
      if (
        owner.active &&
        !access.signal.aborted &&
        modelAttempt.current === attempt &&
        readback?.thread.id === threadId &&
        readback.thread.modelId === attempt.expectedModelId
      ) {
        modelAttempt.current = null;
        setModelHeld(false);
        modelAction.reset();
      }
    } catch {
      if (owner.active && !access.signal.aborted && modelAttempt.current === attempt) setModelHeld(true);
    } finally {
      attempt.reading = false;
    }
  };
  const runtime = useQuery({
    queryKey: [...queryKey, "runtime"],
    queryFn: ({ signal }) =>
      client.assistant.getRuntimeOptions(undefined, { signal: AbortSignal.any([signal, access.signal]) }),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60_000,
  });
  const modelId = conversation.thread.data?.thread.modelId ?? runtime.data?.defaultModelId ?? "";
  const capabilities = useQuery({
    queryKey: [...queryKey, "capabilities", modelId],
    queryFn: ({ signal }) =>
      client.assistant.getModelCapabilities({ modelId }, { signal: AbortSignal.any([signal, access.signal]) }),
    enabled: Boolean(modelId),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const entities = useQuery({
    queryKey: [...queryKey, "entities"],
    queryFn: ({ signal }) =>
      client.assistant.getContextEntities(undefined, { signal: AbortSignal.any([signal, access.signal]) }),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const locked = conversation.busy || modelAction.pending || modelHeld || deleteAction.pending;
  useEffect(() => onBusyChange(locked), [locked, onBusyChange]);
  let branchValid = true;
  let branch = conversation.entries;
  try {
    branch = assistantBranch(conversation.entries, conversation.leafId);
  } catch {
    branchValid = false;
  }
  const canContinue =
    branchValid &&
    branch.every((entry) => entry.kind === "supported" && !assistantMessageHasPendingTool(entry.message));
  const failedPersistence =
    conversation.state.kind === "unconfirmed" ||
    (conversation.state.kind === "failed" && conversation.state.reason === "persistence");
  const modelKnown = runtime.data?.models.some((model) => model.id === modelId) === true;
  const canGenerate =
    generation.kind === "available" &&
    canContinue &&
    !access.readOnly &&
    !locked &&
    !modelAttempt.current &&
    !conversation.thread.isError &&
    !conversation.thread.isFetching &&
    runtime.isSuccess &&
    modelKnown &&
    !failedPersistence &&
    Boolean(modelId);
  const persistedIds = new Set(conversation.thread.data?.messages.map((message) => message.id));
  const leafIds = conversation.entries
    .filter((entry) => !conversation.entries.some((child) => child.parentId === entry.id))
    .map((entry) => entry.id);
  const leaf = branch.at(-1);

  if (conversation.thread.isPending) return <AssistantLoading />;
  if (conversation.thread.isError)
    return <AssistantError retry={() => void (modelAttempt.current ? reconcileModel() : conversation.reload())} />;

  return (
    <Stack gap="md">
      <Group align="end">
        <Select
          label={t("assistant.runtime.model")}
          value={modelId || null}
          searchable
          allowDeselect={false}
          flex={1}
          disabled={locked || access.readOnly || !runtime.isSuccess}
          data={runtime.data?.models.map((model) => ({ value: model.id, label: domain.modelLabel(model) })) ?? []}
          nothingFoundMessage={t("assistant.runtime.noModels")}
          onChange={(value) => {
            if (!value || value === modelId || locked || modelAttempt.current || access.readOnly) return;
            void modelAction.execute(async () => {
              const owner = modelOwner.current;
              if (!owner?.active) return;
              const attempt = { expectedModelId: value, reading: false };
              modelAttempt.current = attempt;
              setModelHeld(true);
              try {
                const result = await client.assistant.updateThreadModel(
                  { threadId, modelId: value },
                  { signal: access.signal },
                );
                if (owner.active && !access.signal.aborted && modelAttempt.current === attempt)
                  attempt.expectedModelId = result.modelId;
              } finally {
                if (owner.active && !access.signal.aborted && modelAttempt.current === attempt) await reconcileModel();
              }
            });
          }}
        />
        <Select<AssistantReasoning>
          label={t("assistant.runtime.thinking")}
          value={reasoning}
          disabled={locked}
          allowDeselect={false}
          data={domain.reasoningModes.map((mode) => ({ value: mode, label: t(`assistant.runtime.reasoning.${mode}`) }))}
          onChange={(value) => {
            if (value) setReasoning(value);
          }}
        />
      </Group>
      {runtime.isError && <AssistantError retry={() => void runtime.refetch()} />}
      {runtime.isSuccess && !modelKnown && <Alert color="yellow">{t("assistant.runtime.noModels")}</Alert>}
      {(modelAction.failed || modelHeld) && (
        <AssistantError message={t("assistant.responseError.description")} retry={() => void reconcileModel()} />
      )}
      {capabilities.data?.imageInput === "supported" && <Text size="sm">{t("assistant.runtime.imageInput")}</Text>}
      {generation.kind === "held" && <Alert color="yellow">{generation.reason}</Alert>}
      {!canContinue && <Alert color="yellow">{t("assistant.pendingAction.sendBlocked")}</Alert>}
      {leafIds.length > 1 && (
        <Select
          label={t("assistant.previousResponse")}
          value={conversation.leafId}
          disabled={locked}
          allowDeselect={false}
          data={leafIds.map((id, index) => ({
            value: id,
            label: `${t("assistant.usage.step", { number: index + 1 })} (${id.slice(0, 8)})`,
          }))}
          onChange={(value) => {
            if (!value || locked) return;
            conversation.selectLeaf(value);
            setVisibleCount(30);
            setEditing(null);
            setConfirmDelete(false);
          }}
        />
      )}
      {branch.length > visibleCount && (
        <Button variant="default" onClick={() => setVisibleCount((count) => count + 30)}>
          {t("common.action.previous")}
        </Button>
      )}
      <Stack className={classes.messages} aria-busy={conversation.busy}>
        {branch.length === 0 && <Text>{t("assistant.emptyTitle")}</Text>}
        {branch.slice(-visibleCount).map((entry) => {
          const precedingUser = branch
            .slice(
              0,
              branch.findIndex((item) => item.id === entry.id),
            )
            .findLast((item) => item.kind === "supported" && item.message.role === "user");
          return entry.kind === "supported" ? (
            <AssistantMessageView
              key={entry.id}
              threadId={threadId}
              message={entry.message}
              persisted={persistedIds.has(entry.id)}
              busy={locked}
              renderParts={renderParts}
              onEdit={() => {
                setEditing({ id: entry.id, parentId: entry.parentId });
                setDraft(assistantMessageText(entry.message));
              }}
              onRegenerate={
                entry.message.role === "assistant" && precedingUser?.kind === "supported" && canGenerate
                  ? () => {
                      if (modelAttempt.current) return;
                      void conversation.generate({
                        parentId: precedingUser.parentId,
                        regenerateUserId: precedingUser.id,
                        modelId,
                        reasoning,
                      });
                    }
                  : undefined
              }
            />
          ) : (
            <Alert key={entry.id} color="yellow">
              {copy.unsupportedMessage}
            </Alert>
          );
        })}
      </Stack>
      <Text role="status" aria-live="polite" size="sm">
        {conversation.state.kind === "streaming"
          ? t("assistant.activity.working")
          : locked
            ? t("assistant.busy.description")
            : ""}
      </Text>
      {conversation.state.kind === "failed" && (
        <AssistantError
          message={t(
            conversation.state.reason === "persistence"
              ? "assistant.refresh.failedDescription"
              : "assistant.responseError.description",
          )}
          retry={() => void conversation.reload()}
        />
      )}
      {conversation.state.kind === "unsettled" && <Alert color="red">{copy.settlementUnknown}</Alert>}
      {conversation.state.kind === "unconfirmed" && (
        <AssistantError message={copy.unconfirmedMessage} retry={() => void conversation.reload()} />
      )}
      {leaf &&
        !locked &&
        persistedIds.has(leaf.id) &&
        !access.readOnly &&
        !failedPersistence &&
        !conversation.entries.some((entry) => entry.parentId === leaf.id) && (
          <Group>
            <Button variant="subtle" color="red" onClick={() => setConfirmDelete(true)}>
              {t("common.action.delete")}
            </Button>
            {confirmDelete && (
              <>
                <Text size="sm">{t("common.action.delete")}?</Text>
                <Button
                  color="red"
                  size="xs"
                  loading={deleteAction.pending}
                  onClick={() => {
                    void deleteAction.execute(async () => {
                      await client.assistant.deleteMessages({ threadId, ids: [leaf.id] }, { signal: access.signal });
                      if (access.signal.aborted) return;
                      setConfirmDelete(false);
                      await conversation.reload();
                    });
                  }}
                >
                  {t("common.action.confirm")}
                </Button>
                <Button variant="default" size="xs" onClick={() => setConfirmDelete(false)}>
                  {t("common.action.cancel")}
                </Button>
              </>
            )}
          </Group>
        )}
      {deleteAction.failed && <AssistantError />}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canGenerate || modelAttempt.current || !draft.trim()) return;
          const text = draft;
          void conversation.generate({
            text,
            parentId: editing ? editing.parentId : conversation.leafId,
            modelId,
            reasoning,
            onUserSaved: () => {
              setDraft((current) => (current === text ? "" : current));
              setEditing(null);
            },
          });
        }}
      >
        <Stack gap="sm">
          {editing && (
            <Group>
              <Text size="sm">{t("assistant.editMessage")}</Text>
              <Button
                variant="default"
                size="xs"
                disabled={locked}
                onClick={() => {
                  setEditing(null);
                  setDraft("");
                }}
              >
                {t("common.action.cancel")}
              </Button>
            </Group>
          )}
          <Textarea
            label={t("assistant.spotlightPrompt.title")}
            placeholder={t("assistant.composerPlaceholder")}
            value={draft}
            autosize
            minRows={3}
            maxRows={10}
            disabled={access.readOnly || locked}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <Select
            label={t("assistant.mentions.menu")}
            value={null}
            searchable
            disabled={locked || access.readOnly || entities.isPending || entities.isError}
            data={
              entities.data?.map((entity) => ({
                value: `${entity.type}:${entity.id}`,
                label: `${entity.label} (${t(`assistant.mentions.${entity.type}`)})`,
              })) ?? []
            }
            onChange={(value) => {
              const entity = entities.data?.find((item) => `${item.type}:${item.id}` === value);
              if (!entity || /[\]\n{}]/u.test(entity.id)) return;
              const label = entity.label.replaceAll(/[\]\n{}]/gu, " ").slice(0, 1024) || entity.id;
              setDraft(
                (current) =>
                  `${current}${current && !current.endsWith(" ") ? " " : ""}:${entity.type}[${label}]{name=${entity.id}} `,
              );
            }}
          />
          {entities.isError && <AssistantError retry={() => void entities.refetch()} />}
          <Group justify="space-between">
            <Button type="submit" disabled={!canGenerate || !draft.trim()}>
              {t(editing ? "assistant.updateMessage" : "assistant.send")}
            </Button>
            {conversation.busy && (
              <Button
                variant="default"
                disabled={
                  conversation.state.kind === "cancelling" ||
                  conversation.state.kind === "settling" ||
                  conversation.state.kind === "unsettled" ||
                  conversation.state.kind === "unconfirmed"
                }
                onClick={conversation.stop}
              >
                {t("assistant.stop")}
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}

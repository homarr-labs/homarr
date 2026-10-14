import { Button, Group, Pagination, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";

import type { AssistantFeatureClient } from "./client";
import { AssistantError, AssistantLoading, useAssistantAction, useAssistantFeature } from "./feature";
import classes from "./assistant.module.css";

type ThreadItem = Awaited<ReturnType<AssistantFeatureClient["assistant"]["listThreads"]>>[number];

export function AssistantThreadList({
  selectedId,
  onSelect,
  onDeleted,
  blocked,
}: {
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onDeleted: (id: string) => void;
  readonly blocked: boolean;
}) {
  const { client, access, queryKey, t } = useAssistantFeature();
  const queryClient = useQueryClient();
  const create = useAssistantAction();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const threads = useQuery({
    queryKey: [...queryKey, "threads"],
    queryFn: ({ signal }) =>
      client.assistant.listThreads(undefined, { signal: AbortSignal.any([signal, access.signal]) }),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const filtered =
    threads.data?.filter((thread) =>
      (thread.title ?? t("assistant.newConversation")).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);

  return (
    <Stack component="nav" aria-label={t("assistant.conversations")} gap="sm">
      <Button
        disabled={blocked || access.readOnly}
        loading={create.pending}
        onClick={() => {
          void create.execute(async () => {
            const thread = await client.assistant.createThread(undefined, { signal: access.signal });
            if (access.signal.aborted) return;
            await queryClient.invalidateQueries({ queryKey: [...queryKey, "threads"] });
            if (!access.signal.aborted) onSelect(thread.id);
          });
        }}
      >
        {t("assistant.newConversation")}
      </Button>
      {create.failed && <AssistantError />}
      <TextInput
        label={t("assistant.searchConversations")}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(1);
        }}
      />
      {threads.isPending ? (
        <AssistantLoading />
      ) : threads.isError ? (
        <AssistantError retry={() => void threads.refetch()} />
      ) : (
        <>
          {filtered.length === 0 && <Text size="sm">{t("assistant.noMatchingConversations")}</Text>}
          <Stack component="ul" gap="xs" p={0} m={0} className={classes.threadList}>
            {filtered.slice((currentPage - 1) * 20, currentPage * 20).map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                selected={selectedId === thread.id}
                blocked={blocked || create.pending}
                onSelect={() => onSelect(thread.id)}
                onDeleted={onDeleted}
              />
            ))}
          </Stack>
          {pages > 1 && (
            <Pagination
              total={pages}
              value={currentPage}
              onChange={setPage}
              getControlProps={(control) => ({
                "aria-label": t(
                  control === "previous" || control === "first" ? "common.action.previous" : "common.action.next",
                ),
              })}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function ThreadRow({
  thread,
  selected,
  blocked,
  onSelect,
  onDeleted,
}: {
  readonly thread: ThreadItem;
  readonly selected: boolean;
  readonly blocked: boolean;
  readonly onSelect: () => void;
  readonly onDeleted: (id: string) => void;
}) {
  const { client, access, queryKey, t } = useAssistantFeature();
  const queryClient = useQueryClient();
  const action = useAssistantAction();
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [title, setTitle] = useState(thread.title ?? "");
  const owner = useRef<{ active: boolean } | null>(null);
  const deletion = useRef<object | null>(null);
  useLayoutEffect(() => {
    const lifetime = { active: true };
    owner.current = lifetime;
    return () => {
      lifetime.active = false;
      deletion.current = null;
    };
  }, [access.signal, thread.id]);
  const disabled = blocked || action.pending || access.readOnly;

  return (
    <li className={classes.threadRow} data-selected={selected || undefined}>
      <UnstyledButton
        className={classes.threadTrigger}
        aria-current={selected ? "page" : undefined}
        disabled={blocked || action.pending}
        onClick={onSelect}
      >
        <Text fw={selected ? 650 : 500} lineClamp={2}>
          {thread.title ?? t("assistant.newConversation")}
        </Text>
        {thread.modelId && (
          <Text size="xs" className={classes.breakWord}>
            {thread.modelId}
          </Text>
        )}
      </UnstyledButton>
      {mode === "view" && (
        <Group gap="xs">
          <Button
            size="compact-xs"
            variant="subtle"
            disabled={disabled}
            onClick={() => {
              setTitle(thread.title ?? "");
              setMode("rename");
            }}
          >
            {t("assistant.renameConversation.action")}
          </Button>
          <Button size="compact-xs" variant="subtle" color="red" disabled={disabled} onClick={() => setMode("delete")}>
            {t("common.action.delete")}
          </Button>
        </Group>
      )}
      {mode === "rename" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled || !title.trim()) return;
            void action.execute(async () => {
              await client.assistant.renameThread(
                { threadId: thread.id, title: title.trim() },
                { signal: access.signal },
              );
              if (access.signal.aborted) return;
              setMode("view");
              await queryClient.invalidateQueries({ queryKey: [...queryKey, "threads"] });
              await queryClient.invalidateQueries({ queryKey: [...queryKey, "thread", thread.id] });
            });
          }}
        >
          <Stack gap="xs">
            <TextInput
              label={t("assistant.renameConversation.label")}
              value={title}
              maxLength={120}
              disabled={disabled}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <Group gap="xs">
              <Button type="submit" size="xs" disabled={disabled || !title.trim()} loading={action.pending}>
                {t("assistant.renameConversation.save")}
              </Button>
              <Button size="xs" variant="default" disabled={action.pending} onClick={() => setMode("view")}>
                {t("common.action.cancel")}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
      {mode === "delete" && (
        <Stack gap="xs">
          <Text size="sm">
            {t("assistant.deleteConversation.description", { title: thread.title ?? t("assistant.newConversation") })}
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              color="red"
              disabled={disabled}
              loading={action.pending}
              onClick={() => {
                void action.execute(async () => {
                  const lifetime = owner.current;
                  if (!lifetime?.active) return;
                  const operation = {};
                  deletion.current = operation;
                  await client.assistant.deleteThread({ threadId: thread.id }, { signal: access.signal });
                  if (access.signal.aborted || !lifetime.active || deletion.current !== operation) return;
                  onDeleted(thread.id);
                  queryClient.removeQueries({ queryKey: [...queryKey, "thread", thread.id] });
                  await queryClient.invalidateQueries({ queryKey: [...queryKey, "threads"] });
                });
              }}
            >
              {t("common.action.delete")}
            </Button>
            <Button size="xs" variant="default" disabled={action.pending} onClick={() => setMode("view")}>
              {t("common.action.cancel")}
            </Button>
          </Group>
        </Stack>
      )}
      {action.failed && (
        <AssistantError
          message={t(
            mode === "delete"
              ? "assistant.deleteConversation.failedDescription"
              : "assistant.renameConversation.failedDescription",
          )}
        />
      )}
    </li>
  );
}

import { Alert, Button, Group, Select, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { ORPCError } from "@orpc/client";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { BoardProjection } from "../../contracts/schemas";
import {
  boardProjectionSchema,
  boardSaveInputSchema,
  boardSaveOutputSchema,
  conflictDataSchema,
} from "../../contracts/schemas";
import type { EditorSlotProps } from "../../contracts/ui";
import { createFixtureQueryUtils } from "../../server/api/client";
import {
  captureSessionTransition,
  invalidateSessionTransition,
  isSessionTransitionCurrent,
  useSessionTransition,
} from "../session/session-transition";
import { createDraft, hasDraftChanges, validateDraft } from "./draft";
import type { DraftErrors, EditorDraft } from "./draft";

type EditorNotice =
  | { kind: "idle" }
  | { kind: "saved"; revision: number }
  | { kind: "validation" }
  | { kind: "conflict"; currentRevision: number; latest?: BoardProjection }
  | { kind: "unconfirmed" }
  | { kind: "committed"; board: BoardProjection }
  | { kind: "unavailable" };

interface EditorOperation {
  epoch: number;
  controller: AbortController;
  historyLocation: object;
  href: string;
  submitted: boolean;
}

export function BoardEditor(props: EditorSlotProps) {
  const blocked = useSessionTransition(props.queryClient);
  if (blocked || !props.board.capabilities.canEdit) return null;
  return <BoardEditorForm key={props.board.id} {...props} />;
}

function BoardEditorForm({ board, client, queryClient, onCommitted }: EditorSlotProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditorDraft>(() => createDraft(board));
  const [notice, setNotice] = useState<EditorNotice>({ kind: "idle" });
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const active = useRef<EditorOperation | null>(null);
  const queries = createFixtureQueryUtils(client);
  const boardKey = queries.board.read.queryKey({ input: { boardId: board.id } });
  const widgetKey = queries.widget.read.queryKey({ input: { boardId: board.id } });

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = router.history.subscribe(({ location }) => {
      const operation = active.current;
      if (!operation || location === operation.historyLocation) return;
      operation.controller.abort();
      active.current = null;
      if (!mounted.current || !isSessionTransitionCurrent(queryClient, operation.epoch)) return;
      setBusy(false);
      if (operation.submitted) setNotice({ kind: "unconfirmed" });
    });
    return () => {
      mounted.current = false;
      unsubscribe();
      active.current?.controller.abort();
      active.current = null;
    };
  }, [client, queryClient, router]);

  useEffect(() => {
    if (
      captureSessionTransition(queryClient) === null ||
      busy ||
      active.current !== null ||
      board.revision <= draft.base.revision ||
      notice.kind === "committed" ||
      notice.kind === "unconfirmed" ||
      notice.kind === "unavailable"
    )
      return;
    if (notice.kind === "conflict" && notice.currentRevision > board.revision) return;
    if (hasDraftChanges(draft) || notice.kind === "conflict") {
      if (notice.kind !== "conflict" || notice.latest !== board) {
        setNotice({ kind: "conflict", currentRevision: board.revision, latest: board });
      }
    } else {
      setDraft(createDraft(board));
    }
  }, [board, busy, draft, notice, queryClient]);

  function current(operation: EditorOperation): boolean {
    return (
      mounted.current &&
      active.current === operation &&
      !operation.controller.signal.aborted &&
      router.history.location === operation.historyLocation &&
      router.latestLocation.href === operation.href &&
      isSessionTransitionCurrent(queryClient, operation.epoch)
    );
  }

  function canChangeDraft(): boolean {
    return (
      mounted.current &&
      active.current === null &&
      router.latestLocation.pathname === `/boards/${board.id}` &&
      captureSessionTransition(queryClient) !== null
    );
  }

  function start(): EditorOperation | null {
    if (
      !mounted.current ||
      active.current ||
      router.latestLocation.pathname !== `/boards/${board.id}` ||
      router.state.location.href !== router.latestLocation.href
    )
      return null;
    const epoch = captureSessionTransition(queryClient);
    if (epoch === null) return null;
    const operation = {
      epoch,
      controller: new AbortController(),
      historyLocation: router.history.location,
      href: router.latestLocation.href,
      submitted: false,
    };
    active.current = operation;
    setBusy(true);
    setErrors({});
    return operation;
  }

  function finish(operation: EditorOperation): void {
    if (!current(operation)) return;
    active.current = null;
    setBusy(false);
  }

  async function cancelReads(operation: EditorOperation): Promise<boolean> {
    if (!current(operation)) return false;
    await queryClient.cancelQueries({ queryKey: boardKey, exact: true });
    if (!current(operation)) return false;
    await queryClient.cancelQueries({ queryKey: widgetKey, exact: true });
    return current(operation);
  }

  async function reconcile(operation: EditorOperation, committed: BoardProjection): Promise<boolean> {
    if (!(await cancelReads(operation))) return false;
    if (!current(operation)) return false;
    await queryClient.invalidateQueries({ queryKey: boardKey, exact: true, refetchType: "none" });
    if (!current(operation)) return false;
    await queryClient.invalidateQueries({ queryKey: widgetKey, exact: true, refetchType: "none" });
    if (!current(operation)) return false;
    queryClient.removeQueries({ queryKey: boardKey, exact: true });
    if (!current(operation)) return false;
    await onCommitted(committed);
    return current(operation);
  }

  async function save(): Promise<void> {
    if (!canChangeDraft()) return;
    if (
      notice.kind === "conflict" ||
      notice.kind === "committed" ||
      notice.kind === "unconfirmed" ||
      notice.kind === "unavailable"
    )
      return;
    const validated = boardSaveInputSchema.safeParse({
      boardId: board.id,
      expectedRevision: draft.base.revision,
      content: draft.content,
    });
    if (!validated.success) {
      setErrors(validateDraft(draft.content));
      setNotice({ kind: "validation" });
      return;
    }
    if (!hasDraftChanges(draft)) return;
    const operation = start();
    if (!operation) return;
    let committed: BoardProjection | null = null;
    try {
      if (!(await cancelReads(operation))) return;
      if (!current(operation)) return;
      operation.submitted = true;
      const result = await client.board.save(validated.data, { signal: operation.controller.signal });
      if (!current(operation)) return;
      committed = boardSaveOutputSchema.parse(result).board;
      if (committed.id !== board.id || committed.revision <= draft.base.revision || !committed.capabilities.canEdit) {
        throw new Error("Board commit could not be confirmed");
      }
      if (!(await reconcile(operation, committed))) return;
      if (!current(operation)) return;
      setDraft(createDraft(committed));
      setNotice({ kind: "saved", revision: committed.revision });
    } catch (cause) {
      if (!current(operation)) return;
      if (committed) {
        setNotice({ kind: "committed", board: committed });
        invalidateSessionTransition(queryClient, operation.epoch);
      } else if (cause instanceof ORPCError && cause.code === "CONFLICT") {
        const conflict = conflictDataSchema.safeParse(cause.data);
        setNotice(
          conflict.success
            ? { kind: "conflict", currentRevision: conflict.data.currentRevision }
            : { kind: "unconfirmed" },
        );
      } else if (cause instanceof ORPCError && cause.code === "BAD_REQUEST") {
        setErrors(validateDraft(draft.content));
        setNotice({ kind: "validation" });
      } else if (cause instanceof ORPCError && (cause.code === "UNAUTHORIZED" || cause.code === "FORBIDDEN")) {
        invalidateSessionTransition(queryClient, operation.epoch);
      } else {
        setNotice({ kind: "unconfirmed" });
      }
    } finally {
      finish(operation);
    }
  }

  async function reviewSaved(): Promise<void> {
    const operation = start();
    if (!operation) return;
    const requiredRevision =
      notice.kind === "committed"
        ? notice.board.revision
        : notice.kind === "conflict"
          ? notice.currentRevision
          : draft.base.revision;
    let reconciling = false;
    try {
      const response = await client.board.read({ boardId: board.id }, { signal: operation.controller.signal });
      if (!current(operation)) return;
      const latest = boardProjectionSchema.parse(response);
      if (!latest.capabilities.canEdit) {
        invalidateSessionTransition(queryClient, operation.epoch);
        return;
      }
      if (latest.id !== board.id || latest.revision < requiredRevision) {
        throw new Error("Board access could not be confirmed");
      }
      reconciling = true;
      if (!(await reconcile(operation, latest))) return;
      if (!current(operation)) return;
      if (notice.kind === "committed") {
        setDraft(createDraft(latest));
        setNotice({ kind: "saved", revision: latest.revision });
      } else {
        setNotice({ kind: "conflict", currentRevision: latest.revision, latest });
      }
    } catch (cause) {
      if (!current(operation)) return;
      if (
        reconciling ||
        (cause instanceof ORPCError && (cause.code === "UNAUTHORIZED" || cause.code === "FORBIDDEN"))
      ) {
        invalidateSessionTransition(queryClient, operation.epoch);
      } else {
        setNotice(notice.kind === "committed" ? notice : { kind: "unavailable" });
      }
    } finally {
      finish(operation);
    }
  }

  const dirty = hasDraftChanges(draft);
  const locked = busy || notice.kind === "committed";
  const canSave = dirty && !busy && (notice.kind === "idle" || notice.kind === "saved" || notice.kind === "validation");
  const latest = notice.kind === "conflict" ? notice.latest : undefined;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="start">
        <Stack gap="xs">
          <Title order={2} size="h3">
            Edit board
          </Title>
          <Text size="sm">Changes stay in this draft until saved. Saving uses revision {draft.base.revision}.</Text>
        </Stack>
        <Text size="sm" role="status" aria-live="polite">
          {busy ? "Checking board…" : dirty ? "Unsaved changes" : "No pending changes"}
        </Text>
      </Group>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Board label"
              description="1 to 80 characters"
              value={draft.content.label}
              maxLength={80}
              required
              disabled={locked}
              error={errors.label}
              onChange={(event) => {
                if (!canChangeDraft()) return;
                const label = event.currentTarget.value;
                setDraft((previous) => ({ ...previous, content: { ...previous.content, label } }));
              }}
            />
            <Select<number>
              label="Columns"
              description="Desktop layout, smaller screens adapt automatically"
              data={[1, 2, 3, 4].map((value) => ({ value, label: `${value} ${value === 1 ? "column" : "columns"}` }))}
              value={draft.content.columns}
              allowDeselect={false}
              disabled={locked}
              error={errors.columns}
              onChange={(columns) => {
                if (!canChangeDraft()) return;
                if (columns === 1 || columns === 2 || columns === 3 || columns === 4) {
                  setDraft((previous) => ({ ...previous, content: { ...previous.content, columns } }));
                }
              }}
            />
            <TextInput
              label="Widget display label"
              description="Changes the label, not the source or refresh interval"
              value={draft.content.widget.displayLabel}
              maxLength={80}
              required
              disabled={locked}
              error={errors.displayLabel}
              onChange={(event) => {
                if (!canChangeDraft()) return;
                const displayLabel = event.currentTarget.value;
                setDraft((previous) => ({ ...previous, content: { ...previous.content, widget: { displayLabel } } }));
              }}
            />
          </SimpleGrid>
          {notice.kind === "validation" && (
            <Text c="red.9" size="sm" role="alert">
              Save rejected: check both labels and choose 1 to 4 columns. Your draft is unchanged.
            </Text>
          )}
          {notice.kind === "saved" && (
            <Text size="sm" role="status">
              Saved revision {notice.revision}. The board has refreshed.
            </Text>
          )}
          {(notice.kind === "conflict" ||
            notice.kind === "unconfirmed" ||
            notice.kind === "unavailable" ||
            notice.kind === "committed") && (
            <Alert
              variant="light"
              color="yellow"
              title={
                notice.kind === "committed"
                  ? "Saved, refresh incomplete"
                  : notice.kind === "conflict"
                    ? "Review the saved version"
                    : "Save or access not confirmed"
              }
              styles={{ message: { color: "var(--mantine-color-black)" } }}
            >
              <Stack gap="sm">
                <Text size="sm">
                  {notice.kind === "committed"
                    ? `Revision ${notice.board.revision} was committed, but the board could not refresh. Do not submit it again.`
                    : notice.kind === "conflict"
                      ? `Revision ${notice.currentRevision} is already saved. Your draft was not overwritten. Compare it before choosing which settings to keep.`
                      : "The request may have committed before access or the connection changed. Your draft is retained. Check the saved settings before retrying."}
                </Text>
                {latest && (
                  <Stack gap="xs" style={{ overflowWrap: "anywhere" }}>
                    <Text size="sm" fw={600}>
                      Saved revision {latest.revision}
                    </Text>
                    <Text size="sm">Board label: {latest.content.label}</Text>
                    <Text size="sm">Columns: {latest.content.columns}</Text>
                    <Text size="sm">Widget label: {latest.content.widget.displayLabel}</Text>
                    <Text size="sm">
                      Keep your draft to base the next save on revision {latest.revision}, then choose Save changes. Use
                      saved settings to discard your draft.
                    </Text>
                    <Group gap="sm">
                      <Button
                        type="button"
                        variant="default"
                        disabled={busy}
                        onClick={() => {
                          if (!canChangeDraft()) return;
                          setDraft((previous) => ({ ...previous, base: latest }));
                          setNotice({ kind: "idle" });
                        }}
                      >
                        Keep my draft
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        disabled={busy}
                        onClick={() => {
                          if (!canChangeDraft()) return;
                          setDraft(createDraft(latest));
                          setErrors({});
                          setNotice({ kind: "idle" });
                        }}
                      >
                        Use saved settings
                      </Button>
                    </Group>
                  </Stack>
                )}
                <Button type="button" variant="default" disabled={busy} onClick={() => void reviewSaved()}>
                  {notice.kind === "committed" ? "Refresh saved board" : "Check saved settings"}
                </Button>
                <Text size="sm">If access has changed, use Refresh access in the fixture session controls.</Text>
              </Stack>
            </Alert>
          )}
          <Group gap="sm">
            <Button type="submit" disabled={!canSave} loading={busy}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={
                !dirty || busy || (notice.kind !== "idle" && notice.kind !== "saved" && notice.kind !== "validation")
              }
              onClick={() => {
                if (!canChangeDraft()) return;
                setDraft(createDraft(board));
                setErrors({});
                setNotice({ kind: "idle" });
              }}
            >
              Discard draft
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}

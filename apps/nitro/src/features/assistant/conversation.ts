import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { AssistantGenerationRun, AssistantReasoning, AssistantThread } from "./client";
import { useAssistantFeature } from "./feature";
import type { AssistantMessage, AssistantMessageEntry } from "./messages";
import {
  assistantBranch,
  assistantMessageHasPendingTool,
  decodeAssistantMessages,
  encodeAssistantMessage,
  parseAssistantStreamMessage,
} from "./messages";

type ConversationState =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "streaming" }
  | { readonly kind: "cancelling" }
  | { readonly kind: "settling" }
  | { readonly kind: "unsettled" }
  | { readonly kind: "unconfirmed" }
  | { readonly kind: "failed"; readonly reason: "model" | "provider" | "transport" | "persistence" | "history" };

interface ActiveOperation {
  readonly controller: AbortController;
  readonly cancellation: Promise<void>;
  readonly notifyCancellation: () => void;
  cancellationRequested: boolean;
  providerCancellationRequested: boolean;
  iterator: AsyncIterator<unknown, unknown, unknown> | null;
  iteratorDone: boolean;
  iteratorCleanup: Promise<"closed" | "unknown"> | null;
  run: AssistantGenerationRun | null;
}

interface UserAttempt {
  readonly entry: Extract<AssistantMessageEntry, { kind: "supported" }>;
  readonly onSaved?: () => void;
}

function closeIterator(operation: ActiveOperation) {
  const iterator = operation.iterator;
  if (!iterator || operation.iteratorCleanup || operation.iteratorDone) return;
  operation.iteratorCleanup = (async (): Promise<"closed" | "unknown"> => {
    try {
      if (!iterator.return) return operation.iteratorDone ? "closed" : "unknown";
      const result = await iterator.return();
      if (result.done !== true) return "unknown";
      operation.iteratorDone = true;
      return "closed";
    } catch {
      return "unknown";
    }
  })();
}

function requestCancellation(operation: ActiveOperation) {
  operation.cancellationRequested = true;
  operation.controller.abort();
  operation.notifyCancellation();
  closeIterator(operation);
  try {
    if (operation.run && !operation.providerCancellationRequested) {
      operation.providerCancellationRequested = true;
      operation.run.cancel();
    }
    return true;
  } catch {
    return false;
  }
}

export function useAssistantConversation(threadId: string) {
  const { client, access, generation, clientContext, queryKey } = useAssistantFeature();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConversationState>({ kind: "idle" });
  const [live, setLive] = useState<AssistantMessageEntry[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<string | null>(null);
  const active = useRef<ActiveOperation | null>(null);
  const userAttempt = useRef<UserAttempt | null>(null);
  const mounted = useRef(true);
  const lifecycle = useRef<AbortController | null>(null);
  const thread = useQuery({
    queryKey: [...queryKey, "thread", threadId],
    queryFn: ({ signal }) =>
      client.assistant.getThread({ threadId }, { signal: AbortSignal.any([signal, access.signal]) }),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const busy = state.kind !== "idle" && state.kind !== "failed";
  const stored = thread.data ? decodeAssistantMessages(thread.data) : [];
  const liveIds = new Set(live.map((entry) => entry.id));
  const entries = [...stored.filter((entry) => !liveIds.has(entry.id)), ...live];
  const leafId = selectedLeaf ?? entries.at(-1)?.id ?? null;
  const publish = (next: ConversationState) => {
    if (mounted.current && !access.signal.aborted) setState(next);
  };
  const reconcileUser = (readback: AssistantThread) => {
    if (readback.thread.id !== threadId) return false;
    const attempt = userAttempt.current;
    if (!attempt) return true;
    const decoded = decodeAssistantMessages(readback);
    const stored = decoded.find((entry) => entry.id === attempt.entry.id);
    if (
      stored?.kind !== "supported" ||
      stored.parentId !== attempt.entry.parentId ||
      stored.message.role !== "user" ||
      JSON.stringify(stored.message.parts) !== JSON.stringify(attempt.entry.message.parts)
    )
      return false;
    try {
      assistantBranch(decoded, attempt.entry.id);
    } catch {
      return false;
    }
    userAttempt.current = null;
    if (mounted.current && !access.signal.aborted) attempt.onSaved?.();
    return true;
  };

  useEffect(() => {
    mounted.current = true;
    const owner = new AbortController();
    lifecycle.current = owner;
    const cancel = () => {
      const operation = active.current;
      if (operation) requestCancellation(operation);
    };
    access.signal.addEventListener("abort", cancel, { once: true });
    return () => {
      mounted.current = false;
      owner.abort();
      access.signal.removeEventListener("abort", cancel);
      cancel();
    };
  }, [access.signal]);

  const stop = () => {
    const operation = active.current;
    if (!operation) return;
    publish({ kind: "cancelling" });
    if (!requestCancellation(operation)) publish({ kind: "unsettled" });
  };

  const generate = async ({
    text,
    parentId,
    modelId,
    reasoning,
    regenerateUserId,
    onUserSaved,
  }: {
    readonly text?: string;
    readonly parentId: string | null;
    readonly modelId: string;
    readonly reasoning: AssistantReasoning;
    readonly regenerateUserId?: string;
    readonly onUserSaved?: () => void;
  }) => {
    if (
      active.current ||
      userAttempt.current ||
      busy ||
      (state.kind === "failed" && state.reason === "persistence") ||
      generation.kind !== "available" ||
      access.readOnly ||
      access.signal.aborted ||
      !thread.data ||
      thread.isFetching ||
      thread.isError
    )
      return false;
    let notifyCancellation: () => void = () => {};
    const cancellation = new Promise<void>((resolve) => {
      notifyCancellation = resolve;
    });
    const operation: ActiveOperation = {
      controller: new AbortController(),
      cancellation,
      notifyCancellation,
      cancellationRequested: false,
      providerCancellationRequested: false,
      iterator: null,
      iteratorDone: false,
      iteratorCleanup: null,
      run: null,
    };
    active.current = operation;
    const signal = AbortSignal.any([operation.controller.signal, access.signal]);
    const writeSignal = AbortSignal.any([access.signal, lifecycle.current?.signal ?? access.signal]);
    let failure: Extract<ConversationState, { kind: "failed" }>["reason"] | null = null;
    let physicallySettled = true;
    let stage: "history" | "persistence" | "transport" = "history";
    const snapshots: AssistantMessageEntry[] = [];
    const publishLive = () => {
      if (mounted.current && !access.signal.aborted) setLive(snapshots.slice());
    };

    const workOutcome = await (async (): Promise<false | void> => {
      try {
        const branch = assistantBranch(entries, regenerateUserId ?? parentId);
        const messages = branch.map((entry) => {
          if (entry.kind !== "supported") throw new Error("Unsupported assistant history");
          return entry.message;
        });
        if (messages.some(assistantMessageHasPendingTool)) throw new Error("Pending assistant tool");
        if (regenerateUserId && messages.at(-1)?.role !== "user") throw new Error("Invalid regeneration parent");
        let nextParent = regenerateUserId ?? parentId;
        if (!regenerateUserId) {
          if (!text?.trim()) return false;
          if (messages.length >= 200) throw new Error("Assistant history limit reached");
          const user: AssistantMessage = {
            id: crypto.randomUUID(),
            role: "user",
            parts: [{ type: "text", text: text.trim() }],
          };
          const entry: Extract<AssistantMessageEntry, { kind: "supported" }> = {
            kind: "supported",
            id: user.id,
            parentId,
            message: user,
          };
          userAttempt.current = { entry, onSaved: onUserSaved };
          snapshots.push(entry);
          publishLive();
          publish({ kind: "saving" });
          stage = "persistence";
          await client.assistant.appendMessage(encodeAssistantMessage(threadId, parentId, user), {
            signal: writeSignal,
          });
          const readback = await client.assistant.getThread({ threadId }, { signal: writeSignal });
          writeSignal.throwIfAborted();
          if (!mounted.current || !reconcileUser(readback))
            throw new Error("Assistant user append remains unconfirmed");
          queryClient.setQueryData([...queryKey, "thread", threadId], readback);
          signal.throwIfAborted();
          messages.push(user);
          nextParent = user.id;
          publishLive();
          if (mounted.current && !access.signal.aborted) setSelectedLeaf(user.id);
        }
        if (messages.length > 200) throw new Error("Assistant history limit reached");
        signal.throwIfAborted();
        publish({ kind: "streaming" });
        stage = "transport";
        const run = generation.start({ id: threadId, modelId, reasoning, messages, clientContext }, signal);
        operation.run = run;
        physicallySettled = false;
        const settlement = run.settled.then(
          (outcome) =>
            ({ kind: "settled", outcome }) satisfies { kind: "settled"; outcome: Awaited<typeof run.settled> },
          () => ({ kind: "unsettled" }) satisfies { kind: "unsettled" },
        );
        let streamFailed = false;
        try {
          const iterator = run.messages[Symbol.asyncIterator]();
          operation.iterator = iterator;
          if (operation.cancellationRequested || signal.aborted) requestCancellation(operation);
          const cancellationRequested = operation.cancellation.then(
            () => ({ kind: "cancel-requested" }) satisfies { kind: "cancel-requested" },
          );
          while (!operation.cancellationRequested) {
            const next = iterator.next().then(
              (result) =>
                ({ kind: "next", result }) satisfies { kind: "next"; result: IteratorResult<unknown, unknown> },
              () => ({ kind: "failed" }) satisfies { kind: "failed" },
            );
            const event = await Promise.race([next, cancellationRequested]);
            if (event.kind === "cancel-requested") break;
            if (event.kind === "failed") throw new Error("Assistant iterator failed");
            if (event.result.done) {
              operation.iteratorDone = true;
              break;
            }
            if (signal.aborted) {
              requestCancellation(operation);
              break;
            }
            const message = parseAssistantStreamMessage(event.result.value);
            if (messages.some((entry) => entry.id === message.id))
              throw new Error("Assistant stream reused a history ID");
            const existing = snapshots.findIndex((entry) => entry.id === message.id);
            if (existing >= 0) {
              const current = snapshots[existing];
              if (!current || current.kind !== "supported" || current.message.role !== "assistant")
                throw new Error("Invalid assistant stream ID");
              snapshots[existing] = { ...current, message };
            } else {
              snapshots.push({ kind: "supported", id: message.id, parentId: nextParent, message });
              nextParent = message.id;
            }
            publishLive();
            if (mounted.current && !access.signal.aborted) setSelectedLeaf(message.id);
          }
        } catch {
          streamFailed = !signal.aborted;
          requestCancellation(operation);
        }
        if (!operation.iteratorDone) requestCancellation(operation);
        publish({ kind: "settling" });
        const iteratorCleanup =
          operation.iteratorCleanup ?? Promise.resolve(operation.iteratorDone ? "closed" : "unknown");
        const [cleanup, result] = await Promise.all([iteratorCleanup, settlement]);
        if (cleanup !== "closed" || result.kind === "unsettled") {
          publish({ kind: "unsettled" });
          return false;
        }
        physicallySettled = true;
        if (writeSignal.aborted || !mounted.current) return false;
        stage = "persistence";
        for (const entry of snapshots) {
          if (entry.kind !== "supported" || entry.message.role !== "assistant") continue;
          writeSignal.throwIfAborted();
          await client.assistant.appendMessage(encodeAssistantMessage(threadId, entry.parentId, entry.message), {
            signal: writeSignal,
          });
        }
        failure = result.outcome.kind === "failed" ? result.outcome.reason : streamFailed ? "transport" : null;
        if (
          result.outcome.kind === "completed" &&
          !snapshots.some((entry) => entry.kind === "supported" && entry.message.role === "assistant")
        )
          failure = "transport";
      } catch {
        if (!physicallySettled) publish({ kind: "unsettled" });
        if (!signal.aborted) failure = stage;
      }
    })().then(
      (value) => ({ kind: "returned", value }) satisfies { kind: "returned"; value: false | void },
      (error: unknown) => ({ kind: "threw", error }) satisfies { kind: "threw"; error: unknown },
    );
    let finalizationOutcome: { kind: "completed" } | { kind: "threw"; error: unknown } = { kind: "completed" };
    try {
      if (physicallySettled) {
        if (!writeSignal.aborted && mounted.current) {
          try {
            const readback = await client.assistant.getThread({ threadId }, { signal: writeSignal });
            writeSignal.throwIfAborted();
            if (readback.thread.id !== threadId) throw new Error("Assistant thread readback remains unconfirmed");
            const userConfirmed = reconcileUser(readback);
            queryClient.setQueryData([...queryKey, "thread", threadId], readback);
            const missing = snapshots.filter(
              (entry) =>
                !readback.messages.some(
                  (message) =>
                    message.id === entry.id && message.parentId === entry.parentId && message.format === "ai-sdk/v6",
                ) || userAttempt.current?.entry.id === entry.id,
            );
            if (mounted.current) setLive(missing);
            if (!userConfirmed || missing.length > 0) failure = "persistence";
            await queryClient.invalidateQueries({ queryKey: [...queryKey, "threads"] });
          } catch {
            failure ??= "persistence";
          }
          publish(
            userAttempt.current
              ? { kind: "unconfirmed" }
              : failure
                ? { kind: "failed", reason: failure }
                : { kind: "idle" },
          );
        }
        active.current = null;
      }
    } catch (error) {
      finalizationOutcome = { kind: "threw", error };
    }
    if (workOutcome.kind === "threw") {
      if (finalizationOutcome.kind === "threw")
        throw new AggregateError(
          [workOutcome.error, finalizationOutcome.error],
          "Assistant work and finalization failed",
        );
      throw workOutcome.error;
    }
    if (finalizationOutcome.kind === "threw") throw finalizationOutcome.error;
    if (workOutcome.value === false) return false;
    return failure === null && !signal.aborted;
  };

  const reload = async () => {
    if (active.current || access.signal.aborted) return null;
    const signal = AbortSignal.any([access.signal, lifecycle.current?.signal ?? access.signal]);
    try {
      await queryClient.cancelQueries({ queryKey: [...queryKey, "thread", threadId] });
      signal.throwIfAborted();
      const readback = await client.assistant.getThread({ threadId }, { signal });
      signal.throwIfAborted();
      if (!mounted.current || readback.thread.id !== threadId) return null;
      const userConfirmed = reconcileUser(readback);
      const missing = live.filter(
        (entry) =>
          !readback.messages.some(
            (message) =>
              message.id === entry.id && message.parentId === entry.parentId && message.format === "ai-sdk/v6",
          ) || userAttempt.current?.entry.id === entry.id,
      );
      queryClient.setQueryData([...queryKey, "thread", threadId], readback);
      setLive(missing);
      setSelectedLeaf(null);
      setState(
        !userConfirmed
          ? { kind: "unconfirmed" }
          : missing.length > 0
            ? { kind: "failed", reason: "persistence" }
            : { kind: "idle" },
      );
      await queryClient.invalidateQueries({ queryKey: [...queryKey, "threads"] });
      return readback;
    } catch {
      if (!signal.aborted)
        publish(userAttempt.current ? { kind: "unconfirmed" } : { kind: "failed", reason: "persistence" });
    }
    return null;
  };

  return { thread, entries, leafId, selectLeaf: setSelectedLeaf, state, busy, generate, stop, reload };
}

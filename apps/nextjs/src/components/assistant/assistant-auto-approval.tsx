"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const AUTO_APPROVAL_RETRY_TIMEOUT_MS = 5_000;
const AUTO_APPROVAL_MAX_ATTEMPTS = 2;

export const createAssistantAutoApprovalTracker = (maximumAttempts = Number.POSITIVE_INFINITY) => {
  const claimedToolCalls = new Set<string>();
  const attemptsByToolCall = new Map<string, number>();

  return {
    claim(toolCallId: string) {
      if (claimedToolCalls.has(toolCallId)) return false;
      const attempts = attemptsByToolCall.get(toolCallId) ?? 0;
      if (attempts >= maximumAttempts) return false;
      claimedToolCalls.add(toolCallId);
      attemptsByToolCall.set(toolCallId, attempts + 1);
      return true;
    },
    release(toolCallId: string) {
      claimedToolCalls.delete(toolCallId);
    },
    complete(toolCallId: string) {
      claimedToolCalls.delete(toolCallId);
      attemptsByToolCall.delete(toolCallId);
    },
    clear() {
      claimedToolCalls.clear();
      attemptsByToolCall.clear();
    },
  };
};

interface AssistantAutoApprovalContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  preparationEnabled: boolean;
  approvalEnabled: boolean;
  setPreparationEnabled: (enabled: boolean) => void;
  setApprovalEnabled: (enabled: boolean) => void;
  requestAction: (toolCallId: string, confirm: () => void, mode?: AssistantAutomaticActionMode) => boolean;
  completeAction: (toolCallId: string) => void;
  retryRevision: number;
}

export type AssistantAutomaticActionMode = "preparation" | "approval";

const AssistantAutoApprovalContext = createContext<AssistantAutoApprovalContextValue | null>(null);

export const AssistantAutoApprovalProvider = ({
  children,
  conversationId,
}: PropsWithChildren<{ conversationId: string }>) => {
  const [preparationEnabled, setPreparationEnabledState] = useState(false);
  const [approvalEnabled, setApprovalEnabledState] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);
  const trackerRef = useRef(createAssistantAutoApprovalTracker(AUTO_APPROVAL_MAX_ATTEMPTS));
  const retryTimersRef = useRef(new Map<string, { timer: number; mode: AssistantAutomaticActionMode }>());
  const previousConversationIdRef = useRef(conversationId);
  const conversationMatches = previousConversationIdRef.current === conversationId;
  const effectivePreparationEnabled = conversationMatches && preparationEnabled;
  const effectiveApprovalEnabled = conversationMatches && approvalEnabled;

  const clearRetryTimer = useCallback((toolCallId: string) => {
    const retry = retryTimersRef.current.get(toolCallId);
    if (retry !== undefined) window.clearTimeout(retry.timer);
    retryTimersRef.current.delete(toolCallId);
  }, []);

  const clearAutomaticActions = useCallback((mode?: AssistantAutomaticActionMode) => {
    for (const [toolCallId, retry] of retryTimersRef.current) {
      if (mode !== undefined && retry.mode !== mode) continue;
      window.clearTimeout(retry.timer);
      retryTimersRef.current.delete(toolCallId);
      trackerRef.current.complete(toolCallId);
    }
    if (mode === undefined) trackerRef.current.clear();
  }, []);

  const setEnabled = useCallback(
    (nextEnabled: boolean) => {
      if (!nextEnabled) clearAutomaticActions();
      setPreparationEnabledState(nextEnabled);
      setApprovalEnabledState(nextEnabled);
    },
    [clearAutomaticActions],
  );

  const setPreparationEnabled = useCallback(
    (nextEnabled: boolean) => {
      if (!nextEnabled) clearAutomaticActions("preparation");
      setPreparationEnabledState(nextEnabled);
    },
    [clearAutomaticActions],
  );

  const setApprovalEnabled = useCallback(
    (nextEnabled: boolean) => {
      if (!nextEnabled) clearAutomaticActions("approval");
      setApprovalEnabledState(nextEnabled);
    },
    [clearAutomaticActions],
  );

  useEffect(() => {
    const previousConversationId = previousConversationIdRef.current;
    previousConversationIdRef.current = conversationId;

    if (previousConversationId === conversationId) return;
    clearAutomaticActions();
    setPreparationEnabledState(false);
    setApprovalEnabledState(false);
  }, [clearAutomaticActions, conversationId]);

  useEffect(() => clearAutomaticActions, [clearAutomaticActions]);

  const requestAction = useCallback(
    (toolCallId: string, confirm: () => void, mode: AssistantAutomaticActionMode = "preparation") => {
      const modeEnabled = mode === "approval" ? effectiveApprovalEnabled : effectivePreparationEnabled;
      if (!modeEnabled || !trackerRef.current.claim(toolCallId)) return false;

      try {
        confirm();
        clearRetryTimer(toolCallId);
        retryTimersRef.current.set(toolCallId, {
          mode,
          timer: window.setTimeout(() => {
            retryTimersRef.current.delete(toolCallId);
            trackerRef.current.release(toolCallId);
            setRetryRevision((revision) => revision + 1);
          }, AUTO_APPROVAL_RETRY_TIMEOUT_MS),
        });
        return true;
      } catch {
        trackerRef.current.release(toolCallId);
        return false;
      }
    },
    [clearRetryTimer, effectiveApprovalEnabled, effectivePreparationEnabled],
  );

  const completeAction = useCallback(
    (toolCallId: string) => {
      clearRetryTimer(toolCallId);
      trackerRef.current.complete(toolCallId);
    },
    [clearRetryTimer],
  );

  const value = useMemo(() => {
    const enabled = effectivePreparationEnabled || effectiveApprovalEnabled;
    return {
      enabled,
      setEnabled,
      preparationEnabled: effectivePreparationEnabled,
      approvalEnabled: effectiveApprovalEnabled,
      setPreparationEnabled,
      setApprovalEnabled,
      requestAction,
      completeAction,
      retryRevision,
    };
  }, [
    completeAction,
    effectiveApprovalEnabled,
    effectivePreparationEnabled,
    requestAction,
    retryRevision,
    setApprovalEnabled,
    setEnabled,
    setPreparationEnabled,
  ]);

  return <AssistantAutoApprovalContext.Provider value={value}>{children}</AssistantAutoApprovalContext.Provider>;
};

export const useAssistantAutoApproval = () => {
  const value = useContext(AssistantAutoApprovalContext);
  if (value === null) throw new Error("useAssistantAutoApproval must be used within AssistantAutoApprovalProvider");
  return value;
};

export const useAssistantAutomaticAction = ({
  toolCallId,
  ready,
  completed,
  confirm,
  mode = "preparation",
}: {
  toolCallId: string;
  ready: boolean;
  completed: boolean;
  confirm: () => void;
  mode?: AssistantAutomaticActionMode;
}) => {
  const { approvalEnabled, completeAction, preparationEnabled, requestAction, retryRevision } =
    useAssistantAutoApproval();
  const [inProgress, setInProgress] = useState(false);
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;
  const enabled = mode === "approval" ? approvalEnabled : preparationEnabled;

  useEffect(() => {
    if (!ready || completed || !enabled) {
      if (completed) completeAction(toolCallId);
      setInProgress(false);
      return;
    }

    const requested = requestAction(toolCallId, () => confirmRef.current(), mode);
    setInProgress(requested);
  }, [completeAction, completed, enabled, mode, ready, requestAction, retryRevision, toolCallId]);

  return inProgress;
};

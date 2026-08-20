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
  requestAction: (toolCallId: string, confirm: () => void) => boolean;
  completeAction: (toolCallId: string) => void;
  retryRevision: number;
}

const AssistantAutoApprovalContext = createContext<AssistantAutoApprovalContextValue | null>(null);

export const AssistantAutoApprovalProvider = ({
  children,
  conversationId,
}: PropsWithChildren<{ conversationId: string }>) => {
  const [enabled, setEnabledState] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);
  const trackerRef = useRef(createAssistantAutoApprovalTracker(AUTO_APPROVAL_MAX_ATTEMPTS));
  const retryTimersRef = useRef(new Map<string, number>());
  const previousConversationIdRef = useRef(conversationId);
  const conversationMatches = previousConversationIdRef.current === conversationId;
  const effectiveEnabled = conversationMatches && enabled;

  const clearRetryTimer = useCallback((toolCallId: string) => {
    const timer = retryTimersRef.current.get(toolCallId);
    if (timer !== undefined) window.clearTimeout(timer);
    retryTimersRef.current.delete(toolCallId);
  }, []);

  const clearAutomaticActions = useCallback(() => {
    for (const timer of retryTimersRef.current.values()) window.clearTimeout(timer);
    retryTimersRef.current.clear();
    trackerRef.current.clear();
  }, []);

  const setEnabled = useCallback(
    (nextEnabled: boolean) => {
      if (!nextEnabled) clearAutomaticActions();
      setEnabledState(nextEnabled);
    },
    [clearAutomaticActions],
  );

  useEffect(() => {
    const previousConversationId = previousConversationIdRef.current;
    previousConversationIdRef.current = conversationId;

    if (previousConversationId === conversationId) return;
    clearAutomaticActions();
    setEnabledState(false);
  }, [clearAutomaticActions, conversationId]);

  useEffect(() => clearAutomaticActions, [clearAutomaticActions]);

  const requestAction = useCallback(
    (toolCallId: string, confirm: () => void) => {
      if (!effectiveEnabled || !trackerRef.current.claim(toolCallId)) return false;

      try {
        confirm();
        clearRetryTimer(toolCallId);
        retryTimersRef.current.set(
          toolCallId,
          window.setTimeout(() => {
            retryTimersRef.current.delete(toolCallId);
            trackerRef.current.release(toolCallId);
            setRetryRevision((revision) => revision + 1);
          }, AUTO_APPROVAL_RETRY_TIMEOUT_MS),
        );
        return true;
      } catch {
        trackerRef.current.release(toolCallId);
        return false;
      }
    },
    [clearRetryTimer, effectiveEnabled],
  );

  const completeAction = useCallback(
    (toolCallId: string) => {
      clearRetryTimer(toolCallId);
      trackerRef.current.complete(toolCallId);
    },
    [clearRetryTimer],
  );

  const value = useMemo(() => {
    return {
      enabled: effectiveEnabled,
      setEnabled,
      requestAction,
      completeAction,
      retryRevision,
    };
  }, [completeAction, effectiveEnabled, requestAction, retryRevision, setEnabled]);

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
}: {
  toolCallId: string;
  ready: boolean;
  completed: boolean;
  confirm: () => void;
}) => {
  const { completeAction, enabled, requestAction, retryRevision } = useAssistantAutoApproval();
  const [inProgress, setInProgress] = useState(false);
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  useEffect(() => {
    if (!ready || completed || !enabled) {
      if (completed) completeAction(toolCallId);
      setInProgress(false);
      return;
    }

    const requested = requestAction(toolCallId, () => confirmRef.current());
    setInProgress(requested);
  }, [completeAction, completed, enabled, ready, requestAction, retryRevision, toolCallId]);

  return inProgress;
};

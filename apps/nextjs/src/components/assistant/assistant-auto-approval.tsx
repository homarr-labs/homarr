"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export const createAssistantAutoApprovalTracker = () => {
  const claimedToolCalls = new Set<string>();

  return {
    claim(toolCallId: string) {
      if (claimedToolCalls.has(toolCallId)) return false;
      claimedToolCalls.add(toolCallId);
      return true;
    },
    release(toolCallId: string) {
      claimedToolCalls.delete(toolCallId);
    },
    clear() {
      claimedToolCalls.clear();
    },
  };
};

interface AssistantAutoApprovalContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  requestAction: (toolCallId: string, confirm: () => void) => boolean;
}

const AssistantAutoApprovalContext = createContext<AssistantAutoApprovalContextValue | null>(null);

export const AssistantAutoApprovalProvider = ({
  children,
  conversationId,
}: PropsWithChildren<{ conversationId: string }>) => {
  const [enabled, setEnabledState] = useState(false);
  const trackerRef = useRef(createAssistantAutoApprovalTracker());
  const previousConversationIdRef = useRef(conversationId);

  const setEnabled = useCallback((nextEnabled: boolean) => {
    if (!nextEnabled) trackerRef.current.clear();
    setEnabledState(nextEnabled);
  }, []);

  useEffect(() => {
    const previousConversationId = previousConversationIdRef.current;
    previousConversationIdRef.current = conversationId;

    if (previousConversationId === conversationId) return;
    trackerRef.current.clear();
    setEnabledState(false);
  }, [conversationId]);

  const requestAction = useCallback(
    (toolCallId: string, confirm: () => void) => {
      if (!enabled || !trackerRef.current.claim(toolCallId)) return false;

      try {
        confirm();
        return true;
      } catch {
        trackerRef.current.release(toolCallId);
        return false;
      }
    },
    [enabled],
  );

  const value = useMemo(() => ({ enabled, setEnabled, requestAction }), [enabled, requestAction, setEnabled]);

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
  const { enabled, requestAction } = useAssistantAutoApproval();
  const [inProgress, setInProgress] = useState(false);
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  useEffect(() => {
    if (!ready || completed || !enabled) {
      setInProgress(false);
      return;
    }

    const requested = requestAction(toolCallId, () => confirmRef.current());
    setInProgress(requested);
  }, [completed, enabled, ready, requestAction, toolCallId]);

  return inProgress;
};

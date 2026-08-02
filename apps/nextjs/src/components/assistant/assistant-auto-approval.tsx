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
  requestApproval: (toolCallId: string, approve: () => void) => boolean;
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

  const requestApproval = useCallback(
    (toolCallId: string, approve: () => void) => {
      if (!enabled || !trackerRef.current.claim(toolCallId)) return false;

      try {
        approve();
        return true;
      } catch (error) {
        trackerRef.current.release(toolCallId);
        throw error;
      }
    },
    [enabled],
  );

  const value = useMemo(() => ({ enabled, setEnabled, requestApproval }), [enabled, requestApproval, setEnabled]);

  return <AssistantAutoApprovalContext.Provider value={value}>{children}</AssistantAutoApprovalContext.Provider>;
};

export const useAssistantAutoApproval = () => {
  const value = useContext(AssistantAutoApprovalContext);
  if (value === null) throw new Error("useAssistantAutoApproval must be used within AssistantAutoApprovalProvider");
  return value;
};

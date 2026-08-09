"use client";

import { useEffect } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";

/**
 * Keeps the per-message chain of thought aligned with the conversation preference.
 *
 * assistant-ui commits its chain resource in a passive effect. Updating it from a
 * layout effect races that commit and throws `Resource updated before mount` when
 * reasoning or tool parts first appear. Keep all programmatic chain updates in
 * passive effects so the resource is mounted before it receives an update.
 */
export const useAssistantReasoningState = (preferredCollapsed: boolean) => {
  const aui = useAui();
  const chainStatus = useAuiState((state) => state.chainOfThought.status);
  const collapsed = useAuiState((state) => state.chainOfThought.collapsed);

  useEffect(() => {
    aui.chainOfThought().setCollapsed(preferredCollapsed);
  }, [aui, preferredCollapsed]);

  useEffect(() => {
    if (chainStatus.type !== "requires-action") return;
    aui.chainOfThought().setCollapsed(false);
  }, [aui, chainStatus.type]);

  return { chainStatus, collapsed };
};

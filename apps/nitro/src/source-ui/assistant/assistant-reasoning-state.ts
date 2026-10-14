import { useEffect } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";


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

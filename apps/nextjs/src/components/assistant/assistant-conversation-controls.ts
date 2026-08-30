import type { AssistantReasoningMode, AssistantRuntimeModelOption } from "./assistant-preferences";

export interface AssistantConversationControls {
  modelId: string | null;
  models: AssistantRuntimeModelOption[];
  modelOptionsLoading: boolean;
  reasoning: AssistantReasoningMode;
  isRefreshing: boolean;
  autoFocusComposer?: boolean;
  onRefresh: () => Promise<void>;
  onModelChange: (modelId: string) => void;
  onReasoningChange: (reasoning: AssistantReasoningMode) => void;
}

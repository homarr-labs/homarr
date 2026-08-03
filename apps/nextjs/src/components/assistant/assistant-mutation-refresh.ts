import type { ThreadMessage } from "@assistant-ui/react";

const resultHasError = (result: unknown) => typeof result === "object" && result !== null && "error" in result;

export const getSuccessfulApprovedAssistantMutationIds = (messages: readonly ThreadMessage[]) =>
  messages.flatMap((message) =>
    message.role === "assistant"
      ? message.content.flatMap((part) =>
          part.type === "tool-call" &&
          part.approval?.approved === true &&
          part.result !== undefined &&
          part.isError !== true &&
          !resultHasError(part.result)
            ? [part.toolCallId]
            : [],
        )
      : [],
  );

export interface AssistantMutationRefreshState {
  conversationId: string | null;
  toolCallIds: Set<string>;
}

export const updateAssistantMutationRefreshState = (
  state: AssistantMutationRefreshState,
  conversationId: string,
  successfulMutationIds: readonly string[],
) => {
  if (state.conversationId !== conversationId) {
    return {
      state: { conversationId, toolCallIds: new Set(successfulMutationIds) },
      shouldRefresh: false,
    };
  }

  const toolCallIds = new Set(state.toolCallIds);
  let shouldRefresh = false;
  for (const toolCallId of successfulMutationIds) {
    if (toolCallIds.has(toolCallId)) continue;
    toolCallIds.add(toolCallId);
    shouldRefresh = true;
  }

  return { state: { conversationId, toolCallIds }, shouldRefresh };
};

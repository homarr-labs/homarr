export interface AssistantNotificationState {
  initialized: boolean;
  conversationId: string | null;
  notificationKey: string | null;
}

export interface AssistantNotificationUpdate {
  state: AssistantNotificationState;
  shouldNotify: boolean;
}

export const initialAssistantNotificationState: AssistantNotificationState = {
  initialized: false,
  conversationId: null,
  notificationKey: null,
};

export const updateAssistantNotificationState = (
  previous: AssistantNotificationState,
  current: Pick<AssistantNotificationState, "conversationId" | "notificationKey">,
): AssistantNotificationUpdate => {
  const state = { initialized: true, ...current };

  if (!previous.initialized || previous.conversationId !== current.conversationId) {
    return { state, shouldNotify: false };
  }

  return {
    state,
    shouldNotify: current.notificationKey !== null && current.notificationKey !== previous.notificationKey,
  };
};

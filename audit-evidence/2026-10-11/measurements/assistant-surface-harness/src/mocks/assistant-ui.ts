import { useEffect } from "react";

type AssistantEvent = "composer.attachmentAddError" | "thread.runStart";
type AssistantEventHandler = (payload: { message: string }) => void;

const eventHandlers = new Map<AssistantEvent, Set<AssistantEventHandler>>();

export const useAui = () => ({
  composer: () => ({
    getState: () => ({ attachmentAccept: "image/png,text/plain" }),
    addAttachment: async () => undefined,
  }),
});

export const useAuiEvent = (event: AssistantEvent, handler: AssistantEventHandler) => {
  useEffect(() => {
    let handlers = eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      eventHandlers.set(event, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers?.delete(handler);
      if (handlers?.size === 0) eventHandlers.delete(event);
    };
  }, [event, handler]);
};

export const emitAssistantEvent = (event: AssistantEvent) => {
  for (const handler of eventHandlers.get(event) ?? []) handler({ message: "synthetic harness event" });
};

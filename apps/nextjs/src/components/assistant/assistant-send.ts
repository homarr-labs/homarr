import type { AssistantClient } from "@assistant-ui/react";

type AssistantRunConfig = ReturnType<ReturnType<AssistantClient["composer"]>["getState"]>["runConfig"];
type AssistantAppendMessage = Parameters<ReturnType<AssistantClient["thread"]>["append"]>[0];

type AssistantPromptRuntime = {
  composer: () => { getState: () => { runConfig: AssistantRunConfig } };
  thread: () => { append: (message: AssistantAppendMessage) => void };
};

export const sendAssistantPrompt = (runtime: AssistantPromptRuntime, prompt: string) => {
  const text = prompt.trim();
  if (text.length === 0) return false;

  runtime.thread().append({
    role: "user",
    content: [{ type: "text", text }],
    runConfig: runtime.composer().getState().runConfig,
    startRun: true,
  });
  return true;
};

import { convertToModelMessages } from "ai";
import type { UIMessage } from "ai";

export const convertAssistantMessagesToModelMessages = (messages: UIMessage[]) =>
  convertToModelMessages(messages, {
    // An aborted response can leave a streamed tool call in conversation history without a
    // result. Replaying it makes several OpenAI-compatible providers reject the whole prompt.
    ignoreIncompleteToolCalls: true,
  });

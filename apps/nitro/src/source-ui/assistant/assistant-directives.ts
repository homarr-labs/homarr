import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";

export const parseAssistantDirectives = (text: string) => unstable_defaultDirectiveFormatter.parse(text);

export const getAssistantDirectiveTranslationKey = (type: string) => {
  if (type === "tool" || type === "tools") return "tools" as const;
  if (type === "app" || type === "integration" || type === "board" || type === "widget") return type;
  return "context" as const;
};

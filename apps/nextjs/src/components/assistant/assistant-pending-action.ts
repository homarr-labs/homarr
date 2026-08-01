import type { ThreadMessage } from "@assistant-ui/react";

export type AssistantPendingAction = {
  kind: "question" | "form" | "approval";
  toolName: string;
  detail?: string;
};

const humanToolKinds = {
  ask_user: "question",
  configure_app: "form",
  configure_board_settings: "form",
} as const;

const getStringArg = (args: unknown, key: string) => {
  if (typeof args !== "object" || args === null || !(key in args)) return undefined;
  const value = (args as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

export const getPendingAssistantAction = (message: ThreadMessage | undefined): AssistantPendingAction | undefined => {
  if (message?.role !== "assistant") return undefined;

  for (const part of message.content.toReversed()) {
    if (part.type !== "tool-call" || part.isError) continue;

    if (part.approval && part.approval.approved === undefined && !part.approval.resolution) {
      return {
        kind: "approval",
        toolName: part.toolName,
        detail: getStringArg(part.args, "name"),
      };
    }

    const kind = humanToolKinds[part.toolName as keyof typeof humanToolKinds];
    if (kind === undefined || part.result !== undefined) continue;

    return {
      kind,
      toolName: part.toolName,
      detail: getStringArg(
        part.args,
        kind === "question" ? "question" : part.toolName === "configure_board_settings" ? "boardName" : "name",
      ),
    };
  }

  return undefined;
};

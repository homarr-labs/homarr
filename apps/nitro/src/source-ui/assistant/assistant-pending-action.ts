import type { ThreadMessage } from "@assistant-ui/react";
import { isRecord } from "@homarr/common/object";

export type AssistantPendingAction = {
  kind: "question" | "form" | "approval";
  toolName: string;
  detail?: string;
};

const humanToolKinds = {
  ask_user: "question",
  configure_app: "form",
  configure_board_settings: "form",
  configure_widget: "form",
} as const;

const getStringArg = (args: unknown, key: string) => {
  if (!isRecord(args) || !(key in args)) return undefined;
  const value = args[key];
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

    const kind = Object.entries(humanToolKinds).find(([name]) => name === part.toolName)?.[1];
    if (kind === undefined || part.result !== undefined) continue;

    return {
      kind,
      toolName: part.toolName,
      detail: getStringArg(
        part.args,
        kind === "question"
          ? "question"
          : part.toolName === "configure_board_settings" || part.toolName === "configure_widget"
            ? "boardName"
            : "name",
      ),
    };
  }

  return undefined;
};

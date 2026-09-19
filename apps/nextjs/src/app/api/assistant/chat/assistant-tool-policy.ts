import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import {
  CUSTOM_WIDGET_ASSISTANT_POLICY,
  CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
} from "@homarr/custom-widgets/authoring-prompt";

const mutationApprovalInstruction =
  "Uses Homarr's native approval UI; call when inputs are ready without separate prose confirmation.";

export const customWidgetAssistantInstructions = `\n\n${CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION}\n\n${CUSTOM_WIDGET_ASSISTANT_POLICY}`;

export const withAssistantToolPolicy = (description: string | undefined, requiresApproval: boolean) => {
  if (!requiresApproval) return description;
  return description ? `${description}\n\n${mutationApprovalInstruction}` : mutationApprovalInstruction;
};

export const getForcedAssistantToolName = (messages: UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return undefined;

  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (latestToolPart === undefined || latestToolPart.state !== "output-available") return undefined;

  const nextToolByHumanTool = {
    configure_app: "app_create",
    configure_board_settings: "board_savePartialBoardSettings",
    configure_widget: "board_addItem",
  } as const;
  const toolName = getToolName(latestToolPart);
  if (
    (toolName === "configure_board_settings" || toolName === "configure_widget") &&
    typeof latestToolPart.output === "object" &&
    latestToolPart.output !== null &&
    "cancelled" in latestToolPart.output &&
    latestToolPart.output.cancelled === true
  ) {
    return undefined;
  }
  return toolName in nextToolByHumanTool
    ? nextToolByHumanTool[toolName as keyof typeof nextToolByHumanTool]
    : undefined;
};

interface AssistantToolExecutionStep {
  toolResults: readonly {
    toolCallId?: string;
    toolName: string;
    input?: unknown;
    output: unknown;
  }[];
}

interface AssistantToolResponseMessage {
  role: string;
  content: unknown;
}

const customWidgetCreateToolNames = new Set(["customWidget_create", "customWidget_createFromPreview"]);
const customWidgetPlacementOptionIds = {
  place: "place",
  leave: "leave",
} as const;

type CustomWidgetPlacementState =
  | { status: "none" }
  | { status: "configure"; widgetId: string; targetBoardId?: string; definitionId?: string }
  | { status: "ask-user"; widgetId: string; targetBoardId?: string; definitionId?: string }
  | { status: "board-add"; widgetId: string; targetBoardId?: string; definitionId?: string };

interface CustomWidgetLifecycleEvent {
  toolCallId?: string;
  toolName: string;
  input?: unknown;
  output: unknown;
}

const nonePlacementState: CustomWidgetPlacementState = { status: "none" };

const getRecordString = (value: unknown, key: string) => {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
};

const getCustomWidgetCreateMetadata = (output: unknown) => {
  if (typeof output !== "object" || output === null) return undefined;
  const id = getRecordString(output, "id");
  const managementPath = getRecordString(output, "managementPath");
  if (!id || !managementPath || ("error" in output && output.error !== undefined)) return undefined;

  const nextAction =
    "nextAction" in output && typeof output.nextAction === "object" && output.nextAction !== null
      ? output.nextAction
      : undefined;
  const targetBoardId = getRecordString(nextAction, "targetBoardId");
  const options =
    nextAction && "options" in nextAction && typeof nextAction.options === "object" && nextAction.options !== null
      ? nextAction.options
      : undefined;
  const definitionId = getRecordString(options, "definitionId");

  return { id, targetBoardId, definitionId };
};

const getCreatePlacementState = (toolName: string, output: unknown): CustomWidgetPlacementState => {
  if (!customWidgetCreateToolNames.has(toolName)) return nonePlacementState;
  const metadata = getCustomWidgetCreateMetadata(output);
  if (!metadata) return nonePlacementState;
  return {
    status: metadata.targetBoardId ? "configure" : "ask-user",
    widgetId: metadata.id,
    ...(metadata.targetBoardId ? { targetBoardId: metadata.targetBoardId } : {}),
    ...(metadata.definitionId ? { definitionId: metadata.definitionId } : {}),
  };
};

const hasMatchingDefinitionId = (value: unknown, definitionId: string | undefined) => {
  if (!definitionId) return true;
  const options =
    typeof value === "object" &&
    value !== null &&
    "options" in value &&
    typeof value.options === "object" &&
    value.options !== null
      ? value.options
      : undefined;
  const submittedDefinitionId = getRecordString(options, "definitionId");
  return submittedDefinitionId === undefined || submittedDefinitionId === definitionId;
};

const isSuccessfulConfigureWidget = (
  event: CustomWidgetLifecycleEvent,
  state: Extract<CustomWidgetPlacementState, { status: "configure" }>,
) => {
  if (event.toolName !== "configure_widget" || typeof event.output !== "object" || event.output === null) return false;
  if ("cancelled" in event.output && event.output.cancelled === true) return false;
  const boardId = getRecordString(event.output, "boardId");
  if (!boardId || (state.targetBoardId !== undefined && state.targetBoardId !== boardId)) return false;
  return hasMatchingDefinitionId(event.output, state.definitionId);
};

const isSuccessfulBoardAdd = (
  event: CustomWidgetLifecycleEvent,
  state: Extract<CustomWidgetPlacementState, { status: "board-add" }>,
) => {
  if (event.toolName !== "board_addItem" || typeof event.output !== "object" || event.output === null) return false;
  if (!getRecordString(event.output, "itemId")) return false;
  const boardId = getRecordString(event.input, "boardId");
  if (state.targetBoardId !== undefined && boardId !== undefined && state.targetBoardId !== boardId) return false;
  return hasMatchingDefinitionId(event.input, state.definitionId);
};

const getPlacementChoice = (event: CustomWidgetLifecycleEvent) => {
  if (event.toolName !== "ask_user" || typeof event.output !== "object" || event.output === null) return undefined;
  const source = getRecordString(event.output, "source");
  const optionKind = getRecordString(event.output, "optionKind");
  const optionId = getRecordString(event.output, "optionId");
  if (source !== "option" || !optionId || (optionKind !== "affirmative" && optionKind !== "negative")) return undefined;

  if (
    typeof event.input !== "object" ||
    event.input === null ||
    !("allowOther" in event.input) ||
    event.input.allowOther !== false ||
    !("options" in event.input) ||
    !Array.isArray(event.input.options)
  ) {
    return undefined;
  }
  const selectedOption = event.input.options.find(
    (option) => typeof option === "object" && option !== null && "id" in option && option.id === optionId,
  );
  if (selectedOption === undefined) return undefined;
  const selectedKind = getRecordString(selectedOption, "kind");
  const placeOption = event.input.options.find(
    (option) => getRecordString(option, "id") === customWidgetPlacementOptionIds.place,
  );
  const leaveOption = event.input.options.find(
    (option) => getRecordString(option, "id") === customWidgetPlacementOptionIds.leave,
  );
  if (
    selectedKind !== optionKind ||
    getRecordString(placeOption, "kind") !== "affirmative" ||
    getRecordString(leaveOption, "kind") !== "negative"
  )
    return undefined;
  if (optionId === customWidgetPlacementOptionIds.leave) return "leave";
  if (optionId === customWidgetPlacementOptionIds.place) return "place";
  return undefined;
};

const getLifecycleEvents = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[],
  responseMessages: readonly AssistantToolResponseMessage[],
) => {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  const messageEvents = messages.slice(Math.max(0, latestUserIndex)).flatMap((message) => {
    if (message.role !== "assistant") return [];
    return message.parts.flatMap((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") return [];
      return [{ toolCallId: part.toolCallId, toolName: getToolName(part), input: part.input, output: part.output }];
    });
  });
  const responseEvents = responseMessages.flatMap((message) => {
    if (message.role !== "tool" || !Array.isArray(message.content)) return [];
    return message.content.flatMap((part) => {
      if (typeof part !== "object" || part === null || !("type" in part && part.type === "tool-result")) return [];
      if (!("toolName" in part) || typeof part.toolName !== "string" || !("output" in part)) return [];
      const output = part.output;
      if (typeof output === "object" && output !== null && "type" in output && output.type === "json") {
        return [
          {
            toolCallId: "toolCallId" in part && typeof part.toolCallId === "string" ? part.toolCallId : undefined,
            toolName: part.toolName,
            input: "input" in part ? part.input : undefined,
            output: "value" in output ? output.value : undefined,
          },
        ];
      }
      return [
        {
          toolCallId: "toolCallId" in part && typeof part.toolCallId === "string" ? part.toolCallId : undefined,
          toolName: part.toolName,
          input: "input" in part ? part.input : undefined,
          output,
        },
      ];
    });
  });
  const events = [...messageEvents, ...responseEvents, ...completedSteps.flatMap((step) => step.toolResults)];
  const deduplicatedEvents: CustomWidgetLifecycleEvent[] = [];
  const eventIndexByCallId = new Map<string, number>();
  for (const event of events) {
    if (!event.toolCallId) {
      deduplicatedEvents.push(event);
      continue;
    }
    const previousIndex = eventIndexByCallId.get(event.toolCallId);
    if (previousIndex === undefined) {
      eventIndexByCallId.set(event.toolCallId, deduplicatedEvents.length);
      deduplicatedEvents.push(event);
      continue;
    }
    const previous = deduplicatedEvents[previousIndex];
    deduplicatedEvents[previousIndex] = {
      ...previous,
      ...event,
      input: event.input ?? previous?.input,
      output: event.output ?? previous?.output,
    };
  }
  return deduplicatedEvents;
};

export const getCustomWidgetPlacementState = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
): CustomWidgetPlacementState => {
  let state: CustomWidgetPlacementState = nonePlacementState;
  for (const event of getLifecycleEvents(messages, completedSteps, responseMessages)) {
    const created = getCreatePlacementState(event.toolName, event.output);
    if (created.status !== "none") {
      state = created;
      continue;
    }
    if (state.status === "none") continue;
    if (state.status === "ask-user") {
      const choice = getPlacementChoice(event);
      if (choice === "leave") {
        state = nonePlacementState;
      } else if (choice === "place") {
        state = { ...state, status: "configure" };
      }
      continue;
    }
    if (state.status === "configure") {
      if (
        event.toolName === "configure_widget" &&
        typeof event.output === "object" &&
        event.output !== null &&
        "cancelled" in event.output &&
        event.output.cancelled === true
      ) {
        state = nonePlacementState;
        continue;
      }
      if (isSuccessfulConfigureWidget(event, state)) {
        state = {
          ...state,
          status: "board-add",
          targetBoardId: getRecordString(event.output, "boardId") ?? state.targetBoardId,
        };
      }
      continue;
    }
    if (isSuccessfulBoardAdd(event, state)) state = nonePlacementState;
  }
  return state;
};

export const hasPendingCustomWidgetPlacement = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => getCustomWidgetPlacementState(messages, completedSteps, responseMessages).status !== "none";

export const getRequiredAssistantToolNames = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => {
  const placement = getCustomWidgetPlacementState(messages, completedSteps, responseMessages);
  if (placement.status === "ask-user") return ["ask_user"];
  if (placement.status === "configure") return ["configure_widget"];
  if (placement.status === "board-add") return ["board_addItem"];
  return [];
};

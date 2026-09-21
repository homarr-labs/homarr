export interface CustomWidgetAssistantLifecycleEvent {
  toolCallId?: string;
  toolName: string;
  input?: unknown;
  output: unknown;
}

export type CustomWidgetPlacementState =
  | { status: "none" }
  | {
      status: "configure";
      widgetId: string;
      targetBoardId?: string;
      targetBoardName?: string;
      definitionId?: string;
    }
  | { status: "ask-user"; widgetId: string; targetBoardId?: string; definitionId?: string }
  | { status: "discover-board"; widgetId: string; definitionId?: string }
  | { status: "choose-board"; widgetId: string; boards: CustomWidgetPlacementBoard[]; definitionId?: string }
  | { status: "board-add"; widgetId: string; targetBoardId?: string; definitionId?: string };

interface CustomWidgetPlacementBoard {
  id: string;
  name: string;
}

const customWidgetCreateToolNames = new Set(["customWidget_create", "customWidget_createFromPreview"]);
const nonePlacementState: CustomWidgetPlacementState = { status: "none" };

const getRecordString = (value: unknown, key: string) => {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string" || candidate.length === 0) return undefined;
  return candidate;
};

const getCustomWidgetCreateMetadata = (output: unknown) => {
  if (typeof output !== "object" || output === null) return undefined;
  const id = getRecordString(output, "id");
  const managementPath = getRecordString(output, "managementPath");
  if (!id || !managementPath || ("error" in output && output.error !== undefined)) return undefined;

  let nextAction: object | undefined;
  if ("nextAction" in output && typeof output.nextAction === "object" && output.nextAction !== null) {
    nextAction = output.nextAction;
  }
  const targetBoardId = getRecordString(nextAction, "targetBoardId");
  let options: object | undefined;
  if (nextAction && "options" in nextAction && typeof nextAction.options === "object" && nextAction.options !== null) {
    options = nextAction.options;
  }
  const definitionId = getRecordString(options, "definitionId");

  return { id, targetBoardId, definitionId };
};

const getCreatePlacementState = (toolName: string, output: unknown): CustomWidgetPlacementState => {
  if (!customWidgetCreateToolNames.has(toolName)) return nonePlacementState;
  const metadata = getCustomWidgetCreateMetadata(output);
  if (!metadata) return nonePlacementState;
  if (metadata.targetBoardId) {
    return {
      status: "configure",
      widgetId: metadata.id,
      targetBoardId: metadata.targetBoardId,
      ...(metadata.definitionId ? { definitionId: metadata.definitionId } : {}),
    };
  }
  return {
    status: "ask-user",
    widgetId: metadata.id,
    ...(metadata.definitionId ? { definitionId: metadata.definitionId } : {}),
  };
};

const hasMatchingDefinitionId = (value: unknown, definitionId: string | undefined) => {
  if (!definitionId) return true;
  let options: object | undefined;
  if (
    typeof value === "object" &&
    value !== null &&
    "options" in value &&
    typeof value.options === "object" &&
    value.options !== null
  ) {
    options = value.options;
  }
  const submittedDefinitionId = getRecordString(options, "definitionId");
  return submittedDefinitionId === definitionId;
};

const isSuccessfulConfigureWidget = (
  event: CustomWidgetAssistantLifecycleEvent,
  state: Extract<CustomWidgetPlacementState, { status: "configure" }>,
) => {
  if (event.toolName !== "configure_widget" || typeof event.output !== "object" || event.output === null) return false;
  if ("cancelled" in event.output && event.output.cancelled === true) return false;
  const boardId = getRecordString(event.output, "boardId");
  if (!boardId || (state.targetBoardId !== undefined && state.targetBoardId !== boardId)) return false;
  if (state.targetBoardName !== undefined) {
    if (getRecordString(event.input, "boardId") !== state.targetBoardId) return false;
    if (getRecordString(event.input, "boardName") !== state.targetBoardName) return false;
  }
  return hasMatchingDefinitionId(event.output, state.definitionId);
};

const isSuccessfulBoardAdd = (
  event: CustomWidgetAssistantLifecycleEvent,
  state: Extract<CustomWidgetPlacementState, { status: "board-add" }>,
) => {
  if (event.toolName !== "board_addItem" || typeof event.output !== "object" || event.output === null) return false;
  if (!getRecordString(event.output, "itemId")) return false;
  const boardId = getRecordString(event.input, "boardId");
  if (state.targetBoardId !== undefined && state.targetBoardId !== boardId) return false;
  return hasMatchingDefinitionId(event.input, state.definitionId);
};

const getPlacementChoice = (event: CustomWidgetAssistantLifecycleEvent) => {
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
  if (selectedOption === undefined || getRecordString(selectedOption, "kind") !== optionKind) return undefined;
  const placeOption = event.input.options.find((option) => getRecordString(option, "id") === "place");
  const leaveOption = event.input.options.find((option) => getRecordString(option, "id") === "leave");
  if (getRecordString(placeOption, "kind") !== "affirmative") return undefined;
  if (getRecordString(leaveOption, "kind") !== "negative") return undefined;
  if (optionId === "leave") return "leave";
  if (optionId === "place") return "place";
  return undefined;
};

const getDiscoveredBoards = (event: CustomWidgetAssistantLifecycleEvent) => {
  if (event.toolName !== "board_getAllBoards") return undefined;
  let candidates: unknown;
  if (Array.isArray(event.output)) candidates = event.output;
  else if (typeof event.output === "object" && event.output !== null && "boards" in event.output) {
    candidates = event.output.boards;
  }
  if (!Array.isArray(candidates)) return undefined;
  const boards: CustomWidgetPlacementBoard[] = [];
  const boardIds = new Set<string>();
  for (const candidate of candidates) {
    const id = getRecordString(candidate, "id");
    const name = getRecordString(candidate, "name");
    if (!id || !name || boardIds.has(id)) return undefined;
    boardIds.add(id);
    boards.push({ id, name });
  }
  return boards;
};

const getBoardChoice = (event: CustomWidgetAssistantLifecycleEvent, boards: readonly CustomWidgetPlacementBoard[]) => {
  if (event.toolName !== "ask_user" || typeof event.output !== "object" || event.output === null) return undefined;
  if (getRecordString(event.output, "source") !== "option") return undefined;
  if (getRecordString(event.output, "optionKind") !== "alternative") return undefined;
  const optionId = getRecordString(event.output, "optionId");
  if (!optionId) return undefined;
  if (
    typeof event.input !== "object" ||
    event.input === null ||
    !("allowOther" in event.input) ||
    event.input.allowOther !== false ||
    !("options" in event.input) ||
    !Array.isArray(event.input.options) ||
    event.input.options.length < 2 ||
    event.input.options.length > 4
  ) {
    return undefined;
  }

  const boardById = new Map(boards.map((board) => [board.id, board]));
  const offeredIds = new Set<string>();
  for (const option of event.input.options) {
    const offeredId = getRecordString(option, "id");
    if (!offeredId || getRecordString(option, "kind") !== "alternative") return undefined;
    if (!boardById.has(offeredId) || offeredIds.has(offeredId)) return undefined;
    offeredIds.add(offeredId);
  }
  if (!offeredIds.has(optionId)) return undefined;
  return boardById.get(optionId);
};

const deduplicateLifecycleEvents = (events: readonly CustomWidgetAssistantLifecycleEvent[]) => {
  const deduplicatedEvents: CustomWidgetAssistantLifecycleEvent[] = [];
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

export const resolveCustomWidgetPlacementState = (
  events: readonly CustomWidgetAssistantLifecycleEvent[],
): CustomWidgetPlacementState => {
  let state: CustomWidgetPlacementState = nonePlacementState;
  for (const event of deduplicateLifecycleEvents(events)) {
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
        continue;
      }
      if (choice === "place") {
        state = {
          status: "discover-board",
          widgetId: state.widgetId,
          ...(state.definitionId ? { definitionId: state.definitionId } : {}),
        };
      }
      continue;
    }
    if (state.status === "discover-board") {
      const boards = getDiscoveredBoards(event);
      if (!boards) continue;
      if (boards.length === 0) {
        state = nonePlacementState;
        continue;
      }
      if (boards.length === 1) {
        const board = boards[0];
        if (!board) continue;
        state = {
          status: "configure",
          widgetId: state.widgetId,
          targetBoardId: board.id,
          targetBoardName: board.name,
          ...(state.definitionId ? { definitionId: state.definitionId } : {}),
        };
        continue;
      }
      state = {
        status: "choose-board",
        widgetId: state.widgetId,
        boards,
        ...(state.definitionId ? { definitionId: state.definitionId } : {}),
      };
      continue;
    }
    if (state.status === "choose-board") {
      const board = getBoardChoice(event, state.boards);
      if (!board) continue;
      state = {
        status: "configure",
        widgetId: state.widgetId,
        targetBoardId: board.id,
        targetBoardName: board.name,
        ...(state.definitionId ? { definitionId: state.definitionId } : {}),
      };
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

export const getCustomWidgetPlacementToolNames = (state: CustomWidgetPlacementState) => {
  if (state.status === "ask-user") return ["ask_user"];
  if (state.status === "discover-board") return ["board_getAllBoards"];
  if (state.status === "choose-board") return ["ask_user"];
  if (state.status === "configure") return ["configure_widget"];
  if (state.status === "board-add") return ["board_addItem"];
  return [];
};

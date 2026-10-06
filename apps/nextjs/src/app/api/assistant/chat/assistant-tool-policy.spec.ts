import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import type { CustomWidgetAssistantLifecycleEvent } from "@homarr/custom-widgets/core";

import {
  customWidgetAssistantInstructions,
  getForcedAssistantToolName,
  hasDeniedAssistantToolApproval,
  getCustomWidgetPlacementState,
  getRequiredAssistantToolNames,
  requiresAssistantToolApproval,
  withAssistantToolPolicy,
} from "./assistant-tool-policy";
import { getAssistantToolOutputOptions, toAssistantToolOutput } from "./assistant-tool-output";

const assistantMessage = (...parts: UIMessage["parts"]): UIMessage => ({
  id: "assistant-message",
  role: "assistant",
  parts,
});

describe("hasDeniedAssistantToolApproval", () => {
  const denied = assistantMessage({
    type: "dynamic-tool",
    toolName: "customWidget_createFromPreview",
    toolCallId: "save-1",
    input: { previewSessionId: "preview-1" },
    state: "approval-responded",
    approval: { id: "approval-1", approved: false },
  });

  test("stops lifecycle enforcement after a denied native approval", () => {
    expect(hasDeniedAssistantToolApproval([denied])).toBe(true);
    expect(hasDeniedAssistantToolApproval([denied, assistantMessage({ type: "text", text: "Cancelled." })])).toBe(true);
  });

  test("does not carry a denial into a new user request", () => {
    expect(
      hasDeniedAssistantToolApproval([
        denied,
        { id: "new-request", role: "user", parts: [{ type: "text", text: "Create a different widget." }] },
      ]),
    ).toBe(false);
  });

  test("recognizes persisted denials but permits approved mutations", () => {
    expect(
      hasDeniedAssistantToolApproval([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "customWidget_createFromPreview",
          toolCallId: "save-2",
          input: {},
          state: "output-denied",
          approval: { id: "approval-2", approved: false },
        }),
      ]),
    ).toBe(true);
    expect(
      hasDeniedAssistantToolApproval([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "customWidget_createFromPreview",
          toolCallId: "save-3",
          input: {},
          state: "approval-responded",
          approval: { id: "approval-3", approved: true },
        }),
      ]),
    ).toBe(false);
  });
});

describe("withAssistantToolPolicy", () => {
  test("tells models to call approval-gated mutations without a prose confirmation", () => {
    const description = withAssistantToolPolicy("Create a Homarr app.", true);

    expect(description).toContain("native approval UI");
    expect(description).toContain("without separate prose confirmation");
  });

  test("does not alter read-only tool descriptions", () => {
    expect(withAssistantToolPolicy("List all Homarr apps.", false)).toBe("List all Homarr apps.");
  });

  test("exempts ephemeral drafts and secure configuration orchestration, not saves or actions", () => {
    expect(requiresAssistantToolApproval("customWidget_configurationRequestUser", "mutation")).toBe(false);
    expect(requiresAssistantToolApproval("customWidget_previewCreate", "mutation")).toBe(false);
    expect(requiresAssistantToolApproval("customWidget_previewReviseTemplate", "mutation")).toBe(false);
    expect(requiresAssistantToolApproval("customWidget_createFromPreview", "mutation")).toBe(true);
    expect(requiresAssistantToolApproval("customWidget_updateFromPreview", "mutation")).toBe(true);
    expect(requiresAssistantToolApproval("customWidget_setPreviewLiveActions", "mutation")).toBe(true);
    expect(requiresAssistantToolApproval("customWidget_previewAction", "mutation")).toBe(true);
    expect(requiresAssistantToolApproval("board_addItem", "mutation")).toBe(true);
    expect(requiresAssistantToolApproval("customWidget_previewQuery", "query")).toBe(false);
  });
});

describe("customWidgetAssistantInstructions", () => {
  test("bundles authoring contracts and verifies every final preview", () => {
    expect(customWidgetAssistantInstructions.length).toBeLessThan(65_000);
    expect(customWidgetAssistantInstructions).toContain("# Schema");
    expect(customWidgetAssistantInstructions).toContain("# Runtime");
    expect(customWidgetAssistantInstructions).toContain("# Security");
    expect(customWidgetAssistantInstructions).toContain('"registeredNames"');
    expect(customWidgetAssistantInstructions).toContain("Function-call spread arguments are unsupported");
    expect(customWidgetAssistantInstructions).toContain("do not call customWidget_getSkill");
    expect(customWidgetAssistantInstructions).toContain("staged by the authoring lifecycle");
    expect(customWidgetAssistantInstructions).toContain("task-needed");
    expect(customWidgetAssistantInstructions).toContain("Reuse loaded context");
    expect(customWidgetAssistantInstructions).toContain("customWidget_findComponents");
    expect(customWidgetAssistantInstructions).toContain("coordinated set");
    expect(customWidgetAssistantInstructions).toContain("For a missing contract");
    expect(customWidgetAssistantInstructions).toContain("customWidget_configurationRequestUser");
    expect(customWidgetAssistantInstructions).toContain("templateLines");
    expect(customWidgetAssistantInstructions).toContain("customWidget_validateTemplate");
    expect(customWidgetAssistantInstructions).toContain("customWidget_previewCreate");
    expect(customWidgetAssistantInstructions).toContain("every returned query");
    expect(customWidgetAssistantInstructions).toContain("every returned simulated action");
    expect(customWidgetAssistantInstructions).toContain("material definition/evidence cycle");
    expect(customWidgetAssistantInstructions).toContain("customWidget_createFromPreview");
    expect(customWidgetAssistantInstructions).toContain("pass previewSessionId");
    expect(customWidgetAssistantInstructions).toContain("then board_getAllBoards");
    expect(customWidgetAssistantInstructions).toContain("zero means saved unplaced");
    expect(customWidgetAssistantInstructions).toContain("Never invent a board/ID");
  });
});

describe("getForcedAssistantToolName", () => {
  test("continues directly from the reviewed app form to app creation", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "configure_app",
          toolCallId: "configure-1",
          input: { name: "YouTube" },
          state: "output-available",
          output: {
            name: "YouTube",
            iconUrl: "/api/icons/youtube.svg",
            href: "https://youtube.com",
          },
        }),
      ]),
    ).toBe("app_create");
  });

  test("waits for the user to finish reviewing the app form", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "configure_app",
          toolCallId: "configure-1",
          input: { name: "YouTube" },
          state: "input-available",
        }),
      ]),
    ).toBeUndefined();
  });

  test("continues directly from reviewed board settings to the settings mutation", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "configure_board_settings",
          toolCallId: "settings-1",
          input: { boardId: "board-1", boardName: "Home", changes: { customCss: ".item {}" } },
          state: "output-available",
          output: { id: "board-1", customCss: ".item {}" },
        }),
      ]),
    ).toBe("board_savePartialBoardSettings");
  });

  test("does not request a mutation when board settings were left unchanged", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "configure_board_settings",
          toolCallId: "settings-1",
          input: { boardId: "board-1", boardName: "Home", changes: {} },
          state: "output-available",
          output: { id: "board-1", cancelled: true },
        }),
      ]),
    ).toBeUndefined();
  });

  test("continues directly from reviewed widget settings to board placement", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "configure_widget",
          toolCallId: "widget-1",
          input: { boardId: "board-1", boardName: "Home", kind: "notebook" },
          state: "output-available",
          output: {
            boardId: "board-1",
            kind: "notebook",
            options: { content: "<h2>Plex</h2>" },
            integrationIds: [],
          },
        }),
      ]),
    ).toBe("board_addItem");
  });

  test("does not add a widget after native configuration was cancelled", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "configure_widget",
          toolCallId: "widget-1",
          input: { boardId: "board-1", boardName: "Home", kind: "mediaServer" },
          state: "output-available",
          output: {
            boardId: "board-1",
            kind: "mediaServer",
            cancelled: true,
            reason: "no-compatible-integration",
          },
        }),
      ]),
    ).toBeUndefined();
  });

  test("does not repeat app creation after the mutation tool has been called", () => {
    expect(
      getForcedAssistantToolName([
        assistantMessage(
          {
            type: "dynamic-tool",
            toolName: "configure_app",
            toolCallId: "configure-1",
            input: { name: "YouTube" },
            state: "output-available",
            output: { name: "YouTube", href: "https://youtube.com" },
          },
          {
            type: "dynamic-tool",
            toolName: "app_create",
            toolCallId: "create-1",
            input: { name: "YouTube", href: "https://youtube.com" },
            state: "approval-requested",
            approval: { id: "approval-1" },
          },
        ),
      ]),
    ).toBeUndefined();
  });
});

describe("getRequiredAssistantToolNames", () => {
  const successfulCreation = {
    id: "widget-1",
    managementPath: "/manage/custom-widgets/edit/widget-1",
  };
  const unknownBoardCreation = {
    toolName: "customWidget_createFromPreview",
    output: {
      ...successfulCreation,
      nextAction: { type: "place-custom-widget", options: { definitionId: "widget-1" } },
    },
  };
  const knownBoardCreation = {
    toolName: "customWidget_createFromPreview",
    output: {
      ...successfulCreation,
      nextAction: { type: "place-custom-widget", targetBoardId: "board-1" },
    },
  };
  const knownBoardCreationWithOptions = {
    toolName: "customWidget_createFromPreview",
    output: {
      ...successfulCreation,
      nextAction: {
        type: "place-custom-widget",
        targetBoardId: "board-1",
        options: { definitionId: "widget-1" },
      },
    },
  };
  const toolStep = (...toolResults: CustomWidgetAssistantLifecycleEvent[]) => ({ toolResults });
  const placementChoice = ({
    optionId,
    placeLabel = "Place on a board",
    leaveLabel = "Leave unplaced",
  }: {
    optionId: "place" | "leave";
    placeLabel?: string;
    leaveLabel?: string;
  }): CustomWidgetAssistantLifecycleEvent => ({
    toolName: "ask_user",
    input: {
      allowOther: false,
      options: [
        { id: "place", label: placeLabel, kind: "affirmative" },
        { id: "leave", label: leaveLabel, kind: "negative" },
      ],
    },
    output: {
      answer: optionId === "place" ? placeLabel : leaveLabel,
      optionId,
      optionKind: optionId === "place" ? "affirmative" : "negative",
      source: "option",
    },
  });

  test("requires a structured placement choice after persisted creation", () => {
    expect(
      getRequiredAssistantToolNames([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "customWidget_createFromPreview",
          toolCallId: "create-widget-1",
          input: { previewSessionId: "preview-1" },
          state: "output-available",
          output: successfulCreation,
        }),
      ]),
    ).toEqual(["ask_user"]);
  });

  test("does not ask about placement when the user explicitly requested an unplaced widget", () => {
    const messages: UIMessage[] = [
      {
        id: "user-message",
        role: "user",
        parts: [{ type: "text", text: "Save it but do not place it on a board." }],
      },
    ];
    for (const creation of [unknownBoardCreation, knownBoardCreation, knownBoardCreationWithOptions]) {
      const steps = [toolStep(creation)];
      expect(getCustomWidgetPlacementState(messages, steps)).toEqual({ status: "none" });
      expect(getRequiredAssistantToolNames(messages, steps)).toEqual([]);
    }
  });

  test("places directly when creation already has a target board", () => {
    const steps = [toolStep(knownBoardCreation)];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["configure_widget"]);
  });

  test("handles an approved creation that executes before step zero", () => {
    const responseMessages = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "create-widget-1",
            toolName: "customWidget_createFromPreview",
            output: { type: "json", value: successfulCreation },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], [], responseMessages)).toEqual(["ask_user"]);
  });

  test("does not force placement after failed creation", () => {
    const steps = [toolStep({ toolName: "customWidget_createFromPreview", output: { error: "Creation failed" } })];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("keeps placement required when a later step incorrectly requests Custom Widget tools", () => {
    const steps = [
      toolStep(unknownBoardCreation),
      toolStep({ toolName: "customWidget_getSkill", output: { content: "skill" } }),
      toolStep({ toolName: "customWidget_previewQuery", output: { error: "upstream" } }),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["ask_user"]);
    expect(getCustomWidgetPlacementState([], steps)).toMatchObject({ status: "ask-user", widgetId: "widget-1" });
  });

  test("requires board discovery after the affirmative unknown-board choice", () => {
    const steps = [toolStep(unknownBoardCreation), toolStep(placementChoice({ optionId: "place" }))];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["board_getAllBoards"]);
  });

  test("finishes honestly without placement when board discovery returns no boards", () => {
    const steps = [
      toolStep(unknownBoardCreation, placementChoice({ optionId: "place" }), {
        toolName: "board_getAllBoards",
        output: [],
      }),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
    expect(getCustomWidgetPlacementState([], steps)).toEqual({ status: "none" });
  });

  test("uses the exact discovered board when only one board is available", () => {
    const discoverySteps = [
      toolStep(unknownBoardCreation, placementChoice({ optionId: "place" }), {
        toolName: "board_getAllBoards",
        output: [{ id: "board-1", name: "Home" }],
      }),
    ];

    expect(getRequiredAssistantToolNames([], discoverySteps)).toEqual(["configure_widget"]);
    expect(getCustomWidgetPlacementState([], discoverySteps)).toMatchObject({
      status: "configure",
      targetBoardId: "board-1",
      targetBoardName: "Home",
    });

    const malformedConfiguration = [
      ...discoverySteps,
      toolStep({
        toolName: "configure_widget",
        input: { boardId: "board-1", boardName: "Invented" },
        output: { boardId: "board-1", kind: "customApi", options: { definitionId: "widget-1" } },
      }),
    ];
    expect(getRequiredAssistantToolNames([], malformedConfiguration)).toEqual(["configure_widget"]);
  });

  test("requires a finite validated board choice when multiple boards are available", () => {
    const discoverySteps = [
      toolStep(unknownBoardCreation, placementChoice({ optionId: "place" }), {
        toolName: "board_getAllBoards",
        output: [
          { id: "board-1", name: "Home" },
          { id: "board-2", name: "Media" },
        ],
      }),
    ];

    expect(getRequiredAssistantToolNames([], discoverySteps)).toEqual(["ask_user"]);

    const selectedSteps = [
      ...discoverySteps,
      toolStep({
        toolName: "ask_user",
        input: {
          allowOther: false,
          options: [
            { id: "board-1", label: "Home", kind: "alternative" },
            { id: "board-2", label: "Media", kind: "alternative" },
          ],
        },
        output: { answer: "Media", optionId: "board-2", optionKind: "alternative", source: "option" },
      }),
    ];
    expect(getRequiredAssistantToolNames([], selectedSteps)).toEqual(["configure_widget"]);
    expect(getCustomWidgetPlacementState([], selectedSteps)).toMatchObject({
      status: "configure",
      targetBoardId: "board-2",
      targetBoardName: "Media",
    });

    const inventedChoiceSteps = [
      ...discoverySteps,
      toolStep({
        toolName: "ask_user",
        input: {
          allowOther: false,
          options: [
            { id: "board-1", label: "Home", kind: "alternative" },
            { id: "invented", label: "Invented", kind: "alternative" },
          ],
        },
        output: { answer: "Invented", optionId: "invented", optionKind: "alternative", source: "option" },
      }),
    ];
    expect(getRequiredAssistantToolNames([], inventedChoiceSteps)).toEqual(["ask_user"]);

    const malformedChoiceSteps = [
      ...discoverySteps,
      toolStep({
        toolName: "ask_user",
        input: {
          allowOther: true,
          options: [
            { id: "board-1", label: "Home", kind: "alternative" },
            { id: "board-2", label: "Media", kind: "alternative" },
          ],
        },
        output: { answer: "Home", optionId: "board-1", optionKind: "alternative", source: "option" },
      }),
    ];
    expect(getRequiredAssistantToolNames([], malformedChoiceSteps)).toEqual(["ask_user"]);
  });

  test("advances from a bounded oversized board result without repeating discovery", () => {
    const largeBoardResult = Array.from({ length: 2_000 }, (_, index) => ({
      id: `board-${index}`,
      name: `Board ${index} ${"x".repeat(40)}`,
      logoImageUrl: null,
    }));
    const boundedBoardResult = toAssistantToolOutput(
      largeBoardResult,
      getAssistantToolOutputOptions("board_getAllBoards"),
    );
    const steps = [
      toolStep(unknownBoardCreation, placementChoice({ optionId: "place" }), {
        toolName: "board_getAllBoards",
        output: boundedBoardResult,
      }),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["ask_user"]);
    expect(getCustomWidgetPlacementState([], steps)).toMatchObject({ status: "choose-board" });
  });

  test("resolves placement by stable IDs when labels are localized", () => {
    const steps = [
      toolStep(
        unknownBoardCreation,
        placementChoice({
          optionId: "leave",
          placeLabel: "Auf einem Board platzieren",
          leaveLabel: "Unplatziert lassen",
        }),
      ),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("requires board_addItem after configure_widget and resolves only after a successful placement", () => {
    const steps = [
      toolStep(knownBoardCreationWithOptions),
      toolStep({
        toolName: "configure_widget",
        output: { boardId: "board-1", kind: "customApi", options: { definitionId: "widget-1" } },
      }),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["board_addItem"]);
    expect(
      getRequiredAssistantToolNames(
        [],
        [
          ...steps,
          toolStep({
            toolName: "board_addItem",
            input: { boardId: "board-1", options: { definitionId: "widget-1" } },
            output: { itemId: "item-1" },
          }),
        ],
      ),
    ).toEqual([]);
  });

  test("resolves unknown-board placement only from the structured leave choice", () => {
    const steps = [toolStep(unknownBoardCreation), toolStep(placementChoice({ optionId: "leave" }))];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("does not treat an unrelated negative question as the placement decision", () => {
    const steps = [
      toolStep(unknownBoardCreation, {
        toolName: "ask_user",
        input: {
          options: [
            { id: "no", label: "No", kind: "negative" },
            { id: "yes", label: "Yes", kind: "affirmative" },
          ],
        },
        output: { answer: "No", optionId: "no", optionKind: "negative", source: "option" },
      }),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["ask_user"]);
  });

  test("resolves a cancelled known-board form instead of forcing it forever", () => {
    const steps = [
      toolStep(knownBoardCreation, {
        toolName: "configure_widget",
        output: { boardId: "board-1", cancelled: true, reason: "user-cancelled" },
      }),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("deduplicates the same create result across SDK response messages and steps", () => {
    const createOutput = unknownBoardCreation.output;
    const responseMessages = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "create-widget-1",
            toolName: "customWidget_createFromPreview",
            output: { type: "json", value: createOutput },
          },
        ],
      },
    ];
    const steps = [
      toolStep(
        { toolCallId: "create-widget-1", ...unknownBoardCreation },
        { toolCallId: "ask-user-1", ...placementChoice({ optionId: "leave" }) },
      ),
    ];

    expect(getRequiredAssistantToolNames([], steps, responseMessages)).toEqual([]);
  });

  test("allows a distinct second creation after the first widget is placed", () => {
    const steps = [
      toolStep(
        knownBoardCreation,
        {
          toolName: "configure_widget",
          output: { boardId: "board-1", kind: "customApi", options: {} },
        },
        { toolName: "board_addItem", input: { boardId: "board-1" }, output: { itemId: "item-1" } },
        {
          toolName: "customWidget_createFromPreview",
          output: {
            id: "widget-2",
            managementPath: "/manage/custom-widgets/edit/widget-2",
            nextAction: { type: "place-custom-widget", targetBoardId: "board-2" },
          },
        },
      ),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["configure_widget"]);
  });

  test("does not repeat placement after updating an already placed Custom Widget", () => {
    const steps = [
      toolStep(
        knownBoardCreationWithOptions,
        {
          toolName: "configure_widget",
          output: { boardId: "board-1", kind: "customApi", options: { definitionId: "widget-1" } },
        },
        {
          toolName: "board_addItem",
          input: { boardId: "board-1", options: { definitionId: "widget-1" } },
          output: { itemId: "item-1" },
        },
        {
          toolName: "customWidget_updateFromPreview",
          output: { id: "widget-1", managementPath: "/manage/custom-widgets/edit/widget-1" },
        },
      ),
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
    expect(getCustomWidgetPlacementState([], steps)).toEqual({ status: "none" });
  });

  test("does not carry a previous turn's placement requirement into a new user turn", () => {
    const messages: UIMessage[] = [
      { id: "user-1", role: "user", parts: [{ type: "text", text: "Create a widget" }] },
      assistantMessage({
        type: "dynamic-tool",
        toolName: "customWidget_createFromPreview",
        toolCallId: "create-widget-1",
        input: { previewSessionId: "preview-1" },
        state: "output-available",
        output: knownBoardCreation.output,
      }),
      { id: "user-2", role: "user", parts: [{ type: "text", text: "Show my boards" }] },
    ];

    expect(getRequiredAssistantToolNames(messages)).toEqual([]);
  });
});

import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import {
  customWidgetAssistantInstructions,
  getForcedAssistantToolName,
  getCustomWidgetPlacementState,
  getRequiredAssistantToolNames,
  withAssistantToolPolicy,
} from "./assistant-tool-policy";

const assistantMessage = (...parts: UIMessage["parts"]): UIMessage => ({
  id: "assistant-message",
  role: "assistant",
  parts,
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
});

describe("customWidgetAssistantInstructions", () => {
  test("loads authoring resources lazily and verifies every final preview", () => {
    expect(customWidgetAssistantInstructions.length).toBeLessThan(4_100);
    expect(customWidgetAssistantInstructions).toContain("customWidget_getSkill");
    expect(customWidgetAssistantInstructions).toContain("staged by the authoring lifecycle");
    expect(customWidgetAssistantInstructions).toContain("task-needed");
    expect(customWidgetAssistantInstructions).toContain("Reuse loaded context");
    expect(customWidgetAssistantInstructions).toContain("customWidget_findComponents");
    expect(customWidgetAssistantInstructions).toContain("coordinated set");
    expect(customWidgetAssistantInstructions).toContain("research primary API documentation once");
    expect(customWidgetAssistantInstructions).toContain("templateLines");
    expect(customWidgetAssistantInstructions).toContain("customWidget_validateTemplate");
    expect(customWidgetAssistantInstructions).toContain("customWidget_previewCreate");
    expect(customWidgetAssistantInstructions).toContain("every returned query");
    expect(customWidgetAssistantInstructions).toContain("every relevant simulated action");
    expect(customWidgetAssistantInstructions).toContain("material definition change");
    expect(customWidgetAssistantInstructions).toContain("customWidget_createFromPreview");
    expect(customWidgetAssistantInstructions).toContain("definition is not streamed again");
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

  test("places directly when creation already has a target board", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", targetBoardId: "board-1" },
            },
          },
        ],
      },
    ];

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
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: { error: "Creation failed" },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("keeps placement required when a later step incorrectly requests Custom Widget tools", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", options: { definitionId: "widget-1" } },
            },
          },
        ],
      },
      { toolResults: [{ toolName: "customWidget_getSkill", output: { content: "skill" } }] },
      { toolResults: [{ toolName: "customWidget_previewQuery", output: { error: "upstream" } }] },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["ask_user"]);
    expect(getCustomWidgetPlacementState([], steps)).toMatchObject({ status: "ask-user", widgetId: "widget-1" });
  });

  test("requires board placement after the affirmative unknown-board choice", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", options: { definitionId: "widget-1" } },
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "ask_user",
            input: {
              options: [
                { id: "place", label: "Place on a board", kind: "affirmative" },
                { id: "leave", label: "Leave unplaced", kind: "negative" },
              ],
            },
            output: { answer: "Place on a board", optionId: "place", optionKind: "affirmative", source: "option" },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["configure_widget"]);
  });

  test("requires board_addItem after configure_widget and resolves only after a successful placement", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: {
                type: "place-custom-widget",
                targetBoardId: "board-1",
                options: { definitionId: "widget-1" },
              },
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "configure_widget",
            output: { boardId: "board-1", kind: "customApi", options: { definitionId: "widget-1" } },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["board_addItem"]);
    expect(
      getRequiredAssistantToolNames(
        [],
        [
          ...steps,
          {
            toolResults: [
              {
                toolName: "board_addItem",
                input: { boardId: "board-1", options: { definitionId: "widget-1" } },
                output: { itemId: "item-1" },
              },
            ],
          },
        ],
      ),
    ).toEqual([]);
  });

  test("resolves unknown-board placement only from the structured leave choice", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", options: { definitionId: "widget-1" } },
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "ask_user",
            input: {
              options: [
                { id: "place", label: "Place on a board", kind: "affirmative" },
                { id: "leave", label: "Leave unplaced", kind: "negative" },
              ],
            },
            output: { answer: "Leave unplaced", optionId: "leave", optionKind: "negative", source: "option" },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("does not treat an unrelated negative question as the placement decision", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", options: { definitionId: "widget-1" } },
            },
          },
          {
            toolName: "ask_user",
            input: {
              options: [
                { id: "no", label: "No", kind: "negative" },
                { id: "yes", label: "Yes", kind: "affirmative" },
              ],
            },
            output: { answer: "No", optionId: "no", optionKind: "negative", source: "option" },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["ask_user"]);
  });

  test("resolves a cancelled known-board form instead of forcing it forever", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", targetBoardId: "board-1" },
            },
          },
          {
            toolName: "configure_widget",
            output: { boardId: "board-1", cancelled: true, reason: "user-cancelled" },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual([]);
  });

  test("deduplicates the same create result across SDK response messages and steps", () => {
    const createOutput = {
      ...successfulCreation,
      nextAction: { type: "place-custom-widget", options: { definitionId: "widget-1" } },
    };
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
      {
        toolResults: [
          { toolCallId: "create-widget-1", toolName: "customWidget_createFromPreview", output: createOutput },
          {
            toolCallId: "ask-user-1",
            toolName: "ask_user",
            input: {
              options: [
                { id: "place", label: "Place on a board", kind: "affirmative" },
                { id: "leave", label: "Leave unplaced", kind: "negative" },
              ],
            },
            output: { answer: "Leave unplaced", optionId: "leave", optionKind: "negative", source: "option" },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps, responseMessages)).toEqual([]);
  });

  test("allows a distinct second creation after the first widget is placed", () => {
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_createFromPreview",
            output: {
              ...successfulCreation,
              nextAction: { type: "place-custom-widget", targetBoardId: "board-1" },
            },
          },
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
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], steps)).toEqual(["configure_widget"]);
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
        output: {
          ...successfulCreation,
          nextAction: { type: "place-custom-widget", targetBoardId: "board-1" },
        },
      }),
      { id: "user-2", role: "user", parts: [{ type: "text", text: "Show my boards" }] },
    ];

    expect(getRequiredAssistantToolNames(messages)).toEqual([]);
  });
});

import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import {
  customWidgetAssistantInstructions,
  getForcedAssistantToolName,
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

    expect(description).toContain("call this tool immediately");
    expect(description).toContain("does not execute until the user selects Approve and run");
    expect(description).toContain("Never ask for confirmation in prose");
  });

  test("does not alter read-only tool descriptions", () => {
    expect(withAssistantToolPolicy("List all Homarr apps.", false)).toBe("List all Homarr apps.");
  });
});

describe("customWidgetAssistantInstructions", () => {
  test("requires the complete skill and real preview-query data before creation", () => {
    expect(customWidgetAssistantInstructions).toContain("Custom Widget tools are mandatory");
    expect(customWidgetAssistantInstructions).toContain("only a manifest, JSX, instructions");
    expect(customWidgetAssistantInstructions).toContain("when they are preloaded below");
    expect(customWidgetAssistantInstructions).toContain("do not call customWidget_getSkill or customWidget_schema");
    expect(customWidgetAssistantInstructions).toContain(
      "already loaded their complete contents into this system prompt",
    );
    expect(customWidgetAssistantInstructions).toContain("first call customWidget_getSkill");
    expect(customWidgetAssistantInstructions).toContain("customWidget_schema");
    expect(customWidgetAssistantInstructions).toContain("customWidget_getComponentCatalog");
    expect(customWidgetAssistantInstructions).toContain("customWidget_getComponent");
    expect(customWidgetAssistantInstructions).toContain("customWidget_getSharedProps once");
    expect(customWidgetAssistantInstructions).toContain("customWidget_getExample");
    expect(customWidgetAssistantInstructions).toContain("templateLines");
    expect(customWidgetAssistantInstructions).toContain("installed `pokedex` example");
    expect(customWidgetAssistantInstructions).toContain("Honor an explicit iteration count");
    expect(customWidgetAssistantInstructions).toContain("customWidget_validate with the complete definition");
    expect(customWidgetAssistantInstructions).toContain("customWidget_previewQuery for every query returned");
    expect(customWidgetAssistantInstructions).toContain("the previous validation and preview evidence is stale");
    expect(customWidgetAssistantInstructions).toContain("Never substitute a later unvalidated version");
    expect(customWidgetAssistantInstructions).toContain("customWidget_createFromPreview");
    expect(customWidgetAssistantInstructions).toContain("Never say the widget is created, updated, placed");
    expect(customWidgetAssistantInstructions).toContain("corresponding customWidget_create, customWidget_update");
    expect(customWidgetAssistantInstructions).toContain("managementPath");
  });

  test("routes meaningful follow-up choices through ask_user instead of prose", () => {
    expect(customWidgetAssistantInstructions).toContain("call ask_user with explicit choices");
    expect(customWidgetAssistantInstructions).toContain("Never end a custom-widget response with a prose question");
    expect(customWidgetAssistantInstructions).toContain("purely rhetorical questions do not require ask_user");
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
  test("requires a structured placement decision after custom widget creation", () => {
    expect(
      getRequiredAssistantToolNames([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "customWidget_create",
          toolCallId: "create-widget-1",
          input: { name: "PSG fixtures" },
          state: "output-available",
          output: {
            id: "widget-1",
            managementPath: "/manage/custom-widgets/edit/widget-1",
            nextAction: {
              type: "place-custom-widget",
              targetBoardId: "board-hey",
            },
          },
        }),
      ]),
    ).toEqual(["configure_widget"]);
  });

  test("requires placement after persisting the final tested preview", () => {
    expect(
      getRequiredAssistantToolNames([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "customWidget_createFromPreview",
          toolCallId: "create-widget-from-preview-1",
          input: { previewSessionId: "preview-3" },
          state: "output-available",
          output: {
            id: "widget-1",
            managementPath: "/manage/custom-widgets/edit/widget-1",
          },
        }),
      ]),
    ).toEqual(["configure_widget", "ask_user"]);
  });

  test("does not force a follow-up after failed custom widget creation", () => {
    expect(
      getRequiredAssistantToolNames([
        assistantMessage({
          type: "dynamic-tool",
          toolName: "customWidget_create",
          toolCallId: "create-widget-1",
          input: { name: "PSG fixtures" },
          state: "output-available",
          output: { error: "The custom widget input was invalid." },
        }),
      ]),
    ).toEqual([]);
  });

  test("requires the structured follow-up immediately after creation in the same agent run", () => {
    const completedSteps = [
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { status: 200, data: { events: [] } },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_create",
            output: {
              id: "widget-1",
              managementPath: "/manage/custom-widgets/edit/widget-1",
              nextAction: {
                type: "place-custom-widget",
                widgetKind: "customApi",
                options: { definitionId: "widget-1" },
              },
            },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], completedSteps)).toEqual(["configure_widget", "ask_user"]);
  });

  test("requires the structured follow-up after an approved creation executes before step zero", () => {
    const responseMessages = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "create-widget-1",
            toolName: "customWidget_create",
            output: {
              type: "json",
              value: {
                id: "widget-1",
                managementPath: "/manage/custom-widgets/edit/widget-1",
                nextAction: {
                  type: "place-custom-widget",
                  widgetKind: "customApi",
                  options: { definitionId: "widget-1" },
                },
              },
            },
          },
        ],
      },
    ];

    expect(getRequiredAssistantToolNames([], [], responseMessages)).toEqual(["configure_widget", "ask_user"]);
  });

  test("does not keep forcing the creation follow-up after a later step has completed", () => {
    const completedSteps = [
      {
        toolResults: [
          {
            toolName: "customWidget_create",
            output: {
              id: "widget-1",
              managementPath: "/manage/custom-widgets/edit/widget-1",
            },
          },
        ],
      },
      {
        toolResults: [{ toolName: "board_all", output: { boards: [] } }],
      },
    ];

    expect(getRequiredAssistantToolNames([], completedSteps)).toEqual([]);
  });

  test("does not require a follow-up for an in-request creation error", () => {
    expect(
      getRequiredAssistantToolNames(
        [],
        [
          {
            toolResults: [
              {
                toolName: "customWidget_create",
                output: { error: "The custom widget input was invalid." },
              },
            ],
          },
        ],
      ),
    ).toEqual([]);
  });
});

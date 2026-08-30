import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import {
  customWidgetAssistantInstructions,
  getForcedAssistantToolName,
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
    expect(customWidgetAssistantInstructions).toContain("homarr_findTools");
    expect(customWidgetAssistantInstructions).toContain("task-needed");
    expect(customWidgetAssistantInstructions).toContain("Reuse loaded context");
    expect(customWidgetAssistantInstructions).toContain("customWidget_findComponents");
    expect(customWidgetAssistantInstructions).toContain("no arbitrary documentation or creativity cap");
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

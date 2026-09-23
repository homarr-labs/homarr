import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";

import {
  createCustomWidgetDiscoveryPhaseController,
  getCustomWidgetFollowUpEditContext,
  getCustomWidgetPhaseToolNames,
  getCustomWidgetToolStepsFromResponseMessages,
  getCustomWidgetToolStepsFromUiMessages,
  getRequestedCustomWidgetExampleId,
  getRequestedCustomWidgetExampleIds,
  getRequestedCustomWidgetServiceTarget,
  hasCustomWidgetLegacyMigrationContext,
  hasMultiCustomWidgetCreationRequest,
  isFreshCustomWidgetCreationRequest,
  needsCustomWidgetAuthoringContext,
  shouldRequireCustomWidgetAuthoringTool,
} from "./custom-widget-authoring-context";

const userMessage = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

const isAuthoringToolRequiredAfter = (
  toolResults: Array<{ toolName: string; output: unknown }>,
  toolNames: readonly string[],
  messages: readonly UIMessage[],
) => shouldRequireCustomWidgetAuthoringTool(toolNames, [{ toolResults }], [], messages);

const sourceConfigurationPausedMessages = (latestUserText: string): UIMessage[] => [
  userMessage("Create a Dispatcharr custom widget"),
  {
    id: "assistant-paused-configuration",
    role: "assistant",
    parts: [
      {
        type: "dynamic-tool",
        toolName: "customWidget_previewCreate",
        toolCallId: "preview-create",
        state: "output-available",
        input: { definition: {} },
        output: {
          success: true,
          previewSession: { id: "preview-dispatcharr" },
          sourceConfigurations: [{ sourceId: "default" }],
          queries: [{ requestId: "channels" }],
          actions: [],
        },
      },
      {
        type: "dynamic-tool",
        toolName: "customWidget_configurationRequestUser",
        toolCallId: "configure-dispatcharr",
        state: "output-available",
        input: { previewSessionId: "preview-dispatcharr", sourceId: "default" },
        output: {
          requestId: "request-dispatcharr",
          previewSessionId: "preview-dispatcharr",
          sourceId: "default",
          status: "pending",
          url: "https://homarr.test/configure/dispatcharr",
        },
      },
    ],
  },
  userMessage(latestUserText),
];

const persistedAndPlacedWidgetMessages = (latestUserText: string): UIMessage[] => [
  userMessage("Create a Mealie widget and place it on my Home board"),
  {
    id: "assistant-authoring",
    role: "assistant",
    parts: [
      {
        type: "dynamic-tool",
        toolName: "customWidget_getSkill",
        toolCallId: "skill-1",
        state: "output-available",
        input: {},
        output: { content: "skill" },
      },
      {
        type: "dynamic-tool",
        toolName: "customWidget_previewCreate",
        toolCallId: "preview-1",
        state: "output-available",
        input: {
          definitionId: undefined,
          definition: {
            sources: {
              default: {
                type: "integration",
                integrationKind: "mealie",
                integrationId: "mealie-home",
              },
            },
          },
        },
        output: {
          success: true,
          persistenceTool: "customWidget_createFromPreview",
          previewSession: { id: "preview-mealie" },
          queries: [{ requestId: "meals" }],
          actions: [],
        },
      },
      {
        type: "dynamic-tool",
        toolName: "customWidget_previewQuery",
        toolCallId: "query-1",
        state: "output-available",
        input: { sessionId: "preview-mealie", requestId: "meals" },
        output: { sessionId: "preview-mealie", requestId: "meals", ok: true },
      },
      {
        type: "dynamic-tool",
        toolName: "customWidget_createFromPreview",
        toolCallId: "persist-1",
        state: "output-available",
        input: { previewSessionId: "preview-mealie", targetBoardId: "board-home" },
        output: {
          id: "mealie-widget-1",
          managementPath: "/manage/custom-widgets/edit/mealie-widget-1",
          nextAction: {
            type: "place-custom-widget",
            targetBoardId: "board-home",
            options: { definitionId: "mealie-widget-1" },
          },
        },
      },
    ],
  },
  {
    id: "assistant-placement",
    role: "assistant",
    parts: [
      {
        type: "dynamic-tool",
        toolName: "configure_widget",
        toolCallId: "configure-widget-1",
        state: "output-available",
        input: {
          boardId: "board-home",
          boardName: "Home",
          kind: "customApi",
          options: { definitionId: "mealie-widget-1" },
        },
        output: {
          boardId: "board-home",
          kind: "customApi",
          integrationIds: [],
          options: { definitionId: "mealie-widget-1" },
        },
      },
      {
        type: "dynamic-tool",
        toolName: "board_addItem",
        toolCallId: "place-widget-1",
        state: "output-available",
        input: { boardId: "board-home", kind: "customApi", options: { definitionId: "mealie-widget-1" } },
        output: { itemId: "board-item-1" },
      },
    ],
  },
  {
    id: "assistant-summary",
    role: "assistant",
    parts: [{ type: "text", text: "Created and placed Mealie Tonight on Home." }],
  },
  userMessage(latestUserText),
];

describe("Custom Widget authoring context", () => {
  test("refunds a focused discovery claim when the tool call fails", () => {
    const controller = createCustomWidgetDiscoveryPhaseController();

    expect(controller.claim("customWidget_getComponents")).toBe(true);
    expect(controller.claim("customWidget_getComponents")).toBe(false);
    controller.observeFailure("customWidget_getComponents");
    expect(controller.claim("customWidget_getComponents")).toBe(true);
  });

  test.each([
    "Create a custom widget for these fixtures",
    "Create custom widgets for these services",
    "Make me a Mealie widget",
    "Make me a Dispatcharr widget",
    "make me a dispatcharr widget",
    "I want a widget for Seerr",
    "Create a widget using my Mealie integration",
    "Build an API widget for Sonarr",
    "Repair this custom-widget",
    "Change my custom widget to show ten items",
    "Modify the custom widget header",
    "Adjust this custom widget's spacing",
    "Add a latency chart to my custom widget",
    "Remove the footer from my custom widget",
    "Validate this Custom JSX definition",
    '{"$schema":"homarr-custom-widget-v2"}',
  ])("detects explicit authoring intent: %s", (text) => {
    expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(true);
  });

  test.each([
    ["Make me a Mealie widget", "mealie"],
    ["Create a Frigate live alerts widget", "frigate live alerts"],
    ["Create a widget for Tube Archivist", "tube archivist"],
    ["Create and install a Custom Widget for Mealie daily meals", "mealie daily meals"],
    ["Create a custom widget", null],
    ["Create a custom widget for these fixtures", null],
    ["Create a clock widget", null],
    ["Repair this custom widget", null],
  ])("extracts the service target only for fresh service widgets: %s", (text, expected) => {
    expect(getRequestedCustomWidgetServiceTarget([userMessage(text)])).toBe(expected);
  });

  test.each([
    ["Make me a Mealie widget", "mealie-today"],
    ["Create a Dispatcharr channels widget", "dispatcharr-channels"],
    ["Create a Karakeep bookmarks widget", "karakeep-bookmarks"],
    ["Build a RomM library widget", "romm-library"],
    ["Create a Tube Archivist queue widget", "tubearchivist-queue"],
    ["Create a Frigate review alerts widget", "frigate-alerts"],
    ["Create a Frigate system metrics widget", "frigate-system"],
    ["Create a Frigate live camera streams widget", "frigate-live-streams"],
    ["Create a Mealie shopping list widget", null],
    ["Create a Karakeep tag metrics widget", null],
    ["Create a RomM download queue widget", null],
    ["Create a Frigate widget", null],
    ["Create a Seerr widget", null],
  ])("selects an exact bundled example only for a matching request: %s", (text, expected) => {
    expect(getRequestedCustomWidgetExampleId([userMessage(text)])).toBe(expected);
  });

  test.each([
    ["Create Mealie and RomM widgets", ["mealie-today", "romm-library"]],
    [
      "Create Frigate live, review alerts, and system metrics widgets",
      ["frigate-live-streams", "frigate-alerts", "frigate-system"],
    ],
    ["Create Mealie and ntfy widgets", []],
    ["Create Frigate alerts and Prometheus system metrics widgets", []],
  ])("queues distinct bundled examples for a batch: %s", (text, expected) => {
    expect(getRequestedCustomWidgetExampleIds([userMessage(text)])).toEqual(expected);
  });

  test.each([
    ["Create and install a Custom Widget. Requirements: show repository health", true],
    ["Make me a Mealie widget", true],
    ["Change it to purple", false],
  ])("detects fresh widget creation: %s", (text, expected) => {
    expect(isFreshCustomWidgetCreationRequest([userMessage(text)])).toBe(expected);
  });

  test.each([
    ["Create a Mealie widget", false],
    ["Create two custom widgets", true],
    ["Build widgets for Mealie and RomM", true],
  ])("detects multi-widget authoring batches: %s", (text, expected) => {
    expect(hasMultiCustomWidgetCreationRequest([userMessage(text)])).toBe(expected);
  });

  test.each(["List my custom widgets", "Delete a custom widget", "Explain custom widgets"])(
    "leaves management intent to the general Custom Widget MCP group: %s",
    (text) => {
      expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(false);
    },
  );

  test.each([
    "Create a dashboard with widgets for my services",
    "Create a board with a Mealie widget",
    "Populate my dashboard with widgets",
    "Set up a board with custom widgets",
    "Add a widget to my dashboard",
    "Create a new widget",
    "Create a responsive widget",
    "Create a polished widget",
  ])("leaves board and widget management intent to the general tools: %s", (text) => {
    expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(false);
  });

  test.each([
    "Make me a weather widget",
    "Create a clock widget",
    "Build a calendar widget",
    "I want a widget for weather",
    "Create a widget using my weather integration",
  ])("leaves known native widget kinds to the general widget tools: %s", (text) => {
    expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(false);
  });

  test("continues after a Custom Widget tool call", () => {
    const messages: UIMessage[] = [
      userMessage("Continue"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewCreate",
            toolCallId: "preview-1",
            state: "output-available",
            input: { name: "Fixtures" },
            output: { previewId: "preview-1" },
          },
        ],
      },
    ];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(true);
  });

  test("continues a pronoun-based edit only with recent Custom Widget lifecycle context", () => {
    const activeTools = ["customWidget_validateTemplate", "customWidget_previewCreate"];
    const messages: UIMessage[] = [
      userMessage("Create a custom widget"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_validateTemplate",
            toolCallId: "validate-1",
            state: "output-available",
            input: { template: "<Text>Green</Text>" },
            output: { valid: true },
          },
        ],
      },
      userMessage("Make it purple"),
    ];
    const steps = [{ toolResults: [{ toolName: "customWidget_validateTemplate", output: { valid: true } }] }];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(true);
    expect(shouldRequireCustomWidgetAuthoringTool(activeTools, steps, [], messages)).toBe(true);
    expect(needsCustomWidgetAuthoringContext([userMessage("Make it purple")])).toBe(false);
    expect(shouldRequireCustomWidgetAuthoringTool(activeTools, steps, [], [userMessage("Make it purple")])).toBe(false);
  });

  test("resumes a style-only edit after placement and retrieves the exact persisted definition first", () => {
    const messages = persistedAndPlacedWidgetMessages("Make it purple and use a compact header");
    const restoredSteps = getCustomWidgetToolStepsFromUiMessages(messages);
    const followUp = getCustomWidgetFollowUpEditContext(messages);
    const tools = [
      "customWidget_getSkill",
      "customWidget_list",
      "customWidget_get",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
      "customWidget_configurationRequestUser",
      "customWidget_createFromPreview",
      "customWidget_updateFromPreview",
    ];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(true);
    expect(followUp).toEqual({
      definitionId: "mealie-widget-1",
      preserveDataContract: true,
      allowSourceChanges: false,
    });
    expect(
      getCustomWidgetPhaseToolNames(tools, restoredSteps, { followUpDefinitionId: followUp?.definitionId }),
    ).toEqual(["customWidget_get"]);
    expect(shouldRequireCustomWidgetAuthoringTool(["customWidget_get"], [], [], messages)).toBe(true);

    const afterExactLoad = [
      ...restoredSteps,
      {
        toolResults: [
          {
            toolName: "customWidget_get",
            output: {
              id: "mealie-widget-1",
              sources: {
                default: {
                  type: "integration",
                  integrationKind: "mealie",
                  integrationId: "mealie-home",
                },
              },
              requests: { meals: { path: "/api/households/mealplans/today" } },
              options: {},
              template: "<Text>{data.meals?.name}</Text>",
            },
          },
        ],
      },
    ];
    const editTools = getCustomWidgetPhaseToolNames(tools, afterExactLoad, {
      followUpDefinitionId: followUp?.definitionId,
      restoredStepCount: restoredSteps.length,
      continueAfterPersistence: false,
    });
    expect(editTools).toContain("customWidget_previewCreate");
    expect(editTools).not.toContain("customWidget_validateTemplate");
    expect(editTools).not.toContain("customWidget_list");
    expect(editTools).not.toContain("customWidget_createFromPreview");
    expect(editTools).not.toContain("customWidget_configurationRequestUser");

    const completedEditEvidence = [
      ...afterExactLoad,
      { toolResults: [{ toolName: "customWidget_validateTemplate", output: { valid: true } }] },
      {
        toolResults: [
          {
            toolName: "customWidget_previewCreate",
            output: {
              success: true,
              persistenceTool: "customWidget_updateFromPreview",
              previewSession: { id: "preview-edit-1" },
              sourceConfigurations: [],
              queries: [{ requestId: "meals" }],
              actions: [],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-edit-1", requestId: "meals", ok: true },
          },
        ],
      },
    ];
    expect(
      getCustomWidgetPhaseToolNames(tools, completedEditEvidence, {
        followUpDefinitionId: followUp?.definitionId,
        restoredStepCount: restoredSteps.length,
        continueAfterPersistence: false,
      }),
    ).toEqual(["customWidget_updateFromPreview"]);
  });

  test("resumes a feature/request edit without freezing the data contract", () => {
    const messages = persistedAndPlacedWidgetMessages("Add a weekly meal-plan request and show its next three meals");

    expect(getCustomWidgetFollowUpEditContext(messages)).toEqual({
      definitionId: "mealie-widget-1",
      preserveDataContract: false,
      allowSourceChanges: false,
    });
  });

  test("retains follow-up identity and style constraints when the edit continues on another turn", () => {
    const messages: UIMessage[] = [
      ...persistedAndPlacedWidgetMessages("Make it purple"),
      {
        id: "assistant-follow-up-load",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_get",
            toolCallId: "get-follow-up-widget",
            state: "output-available",
            input: { id: "mealie-widget-1" },
            output: {
              id: "mealie-widget-1",
              sources: {
                default: {
                  type: "integration",
                  integrationKind: "mealie",
                  integrationId: "mealie-home",
                },
              },
              requests: { meals: { path: "/api/households/mealplans/today" } },
              options: {},
              template: "<Text>{data.meals?.name}</Text>",
            },
          },
        ],
      },
      userMessage("Continue"),
    ];

    expect(getCustomWidgetFollowUpEditContext(messages)).toMatchObject({
      definitionId: "mealie-widget-1",
      preserveDataContract: true,
      allowSourceChanges: false,
      loadedDefinition: {
        id: "mealie-widget-1",
        sources: {
          default: { integrationKind: "mealie", integrationId: "mealie-home" },
        },
      },
    });
  });

  test("restores a definition loaded after the latest follow-up user message", () => {
    const messages: UIMessage[] = [
      ...persistedAndPlacedWidgetMessages("Make it purple"),
      {
        id: "assistant-follow-up-load",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_get",
            toolCallId: "get-follow-up-widget",
            state: "output-available",
            input: { id: "mealie-widget-1" },
            output: {
              id: "mealie-widget-1",
              sources: {
                default: {
                  type: "integration",
                  integrationKind: "mealie",
                  integrationId: "mealie-home",
                },
              },
              requests: { meals: { path: "/api/households/mealplans/today" } },
              options: {},
              template: "<Text>{data.meals?.name}</Text>",
            },
          },
        ],
      },
    ];

    expect(getCustomWidgetFollowUpEditContext(messages)).toMatchObject({
      definitionId: "mealie-widget-1",
      loadedDefinition: { id: "mealie-widget-1" },
    });
    expect(getCustomWidgetToolStepsFromUiMessages(messages).at(-1)).toMatchObject({
      toolResults: [{ toolName: "customWidget_get", output: { id: "mealie-widget-1" } }],
    });
  });

  test("does not attach a fresh widget request to the previously placed definition", () => {
    const messages = persistedAndPlacedWidgetMessages("Create a new Frigate custom widget");

    expect(getCustomWidgetFollowUpEditContext(messages)).toBeNull();
    expect(getCustomWidgetToolStepsFromUiMessages(messages)).toEqual([]);
  });

  test("does not attach a stale loaded definition from another widget", () => {
    const messages: UIMessage[] = [
      userMessage("Create a Mealie custom widget"),
      {
        id: "assistant-mixed-widget-history",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_createFromPreview",
            toolCallId: "persist-widget-a",
            state: "output-available",
            input: { previewSessionId: "preview-a" },
            output: { id: "widget-a" },
          },
          {
            type: "dynamic-tool",
            toolName: "customWidget_get",
            toolCallId: "load-widget-b",
            state: "output-available",
            input: { id: "widget-b" },
            output: { id: "widget-b", template: "<Text>Widget B</Text>" },
          },
        ],
      },
      userMessage("Make it purple"),
    ];

    expect(getCustomWidgetFollowUpEditContext(messages)).toEqual({
      definitionId: "widget-a",
      preserveDataContract: true,
      allowSourceChanges: false,
    });
  });

  test.each([
    "Change it to show ten items",
    "Modify it to use a compact header",
    "Adjust it to wrap long labels",
    "Add a latency chart to it",
    "Remove the footer from it",
  ])("requires lifecycle continuation for a contextual edit: %s", (text) => {
    const activeTools = ["customWidget_get", "customWidget_validateTemplate", "customWidget_previewCreate"];
    const messages: UIMessage[] = [
      userMessage("Create a custom widget"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_get",
            toolCallId: "get-1",
            state: "output-available",
            input: { id: "widget-1" },
            output: { id: "widget-1", template: "<Text>Green</Text>" },
          },
        ],
      },
      userMessage(text),
    ];
    const steps = [{ toolResults: [{ toolName: "customWidget_get", output: { id: "widget-1" } }] }];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(true);
    expect(shouldRequireCustomWidgetAuthoringTool(activeTools, steps, [], messages)).toBe(true);
  });

  test("does not activate from stale authoring history", () => {
    const messages: UIMessage[] = [
      userMessage("Explain custom widgets"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Custom Widgets render safe JSX." }],
      },
      userMessage("How healthy is my media server?"),
    ];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(false);
  });

  test("starts authoring with direct preview and optional context, without skill or validation gates", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_getComponentCatalog",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_getExample",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "board_getAllBoards",
    ];

    const activeNames = getCustomWidgetPhaseToolNames(tools, []);

    expect(activeNames).toContain("customWidget_previewCreate");
    expect(activeNames).toContain("customWidget_getExample");
    expect(activeNames).not.toContain("customWidget_getSkill");
    expect(activeNames).not.toContain("customWidget_validateTemplate");
  });

  test("starts a fresh creation with preview only", () => {
    const tools = [
      "customWidget_list",
      "customWidget_get",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_previewCreate",
    ];

    expect(getCustomWidgetPhaseToolNames(tools, [], { preferDirectPreview: true })).toEqual([
      "customWidget_previewCreate",
    ]);
  });

  test("loads a matching bundled example, binds a saved integration when available, then previews", () => {
    const tools = ["integration_all", "customWidget_getExample", "customWidget_previewCreate", "ask_user"];
    const example = {
      toolResults: [
        {
          toolName: "customWidget_getExample",
          output: {
            id: "mealie-today",
            widget: { sources: { default: { type: "integration", integrationKind: "mealie" } } },
          },
        },
      ],
    };

    const options = { preferDirectPreview: true, preferredExampleId: "mealie-today" };

    expect(getCustomWidgetPhaseToolNames(tools, [], options)).toEqual(["customWidget_getExample"]);
    expect(getCustomWidgetPhaseToolNames(tools, [example], options)).toEqual(["integration_all"]);
    expect(
      getCustomWidgetPhaseToolNames(
        tools,
        [
          ...example.toolResults.map((result) => ({ toolResults: [result] })),
          { toolResults: [{ toolName: "integration_all", output: [] }] },
        ],
        options,
      ),
    ).toEqual(["customWidget_previewCreate"]);
  });

  test("asks for one native choice when a bundled preset has multiple matching saved integrations", () => {
    const tools = ["integration_all", "customWidget_getExample", "customWidget_previewCreate", "ask_user"];
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_getExample",
            output: {
              id: "mealie-today",
              widget: { sources: { default: { type: "integration", integrationKind: "mealie" } } },
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "integration_all",
            output: [
              { id: "home", kind: "mealie", permissions: { hasFullAccess: true } },
              { id: "work", kind: "mealie", permissions: { hasFullAccess: true } },
            ],
          },
        ],
      },
    ];
    const options = { preferDirectPreview: true, preferredExampleId: "mealie-today" };

    expect(getCustomWidgetPhaseToolNames(tools, steps, options)).toEqual(["ask_user"]);
    expect(
      getCustomWidgetPhaseToolNames(
        tools,
        [...steps, { toolResults: [{ toolName: "ask_user", output: { selected: "home" } }] }],
        options,
      ),
    ).toEqual(["customWidget_previewCreate"]);
    expect(
      isAuthoringToolRequiredAfter(steps[1]?.toolResults ?? [], ["ask_user"], [userMessage("Make a Mealie widget")]),
    ).toBe(true);
  });

  test("advances a multi-widget preset queue after each successful persistence", () => {
    const tools = ["customWidget_getExample", "customWidget_previewCreate"];
    const preferredExampleIds = ["mealie-today", "romm-library"];
    const persistedFirst = {
      toolResults: [{ toolName: "customWidget_createFromPreview", output: { id: "created-mealie" } }],
    };

    expect(getCustomWidgetPhaseToolNames(tools, [], { preferredExampleIds })).toEqual(["customWidget_getExample"]);
    expect(getCustomWidgetPhaseToolNames(tools, [persistedFirst], { preferredExampleIds })).toEqual([
      "customWidget_getExample",
    ]);
    expect(
      getCustomWidgetPhaseToolNames(
        tools,
        [
          persistedFirst,
          { toolResults: [{ toolName: "customWidget_createFromPreview", output: { id: "created-romm" } }] },
        ],
        { preferredExampleIds },
      ),
    ).toEqual([]);
  });

  test("previews a bundled direct-HTTP example without unrelated integration discovery", () => {
    const tools = ["integration_all", "customWidget_getExample", "customWidget_previewCreate"];
    const example = {
      toolResults: [
        {
          toolName: "customWidget_getExample",
          output: {
            id: "dispatcharr-channels",
            widget: { sources: { default: { baseUrl: "https://your-service.example.com" } } },
          },
        },
      ],
    };

    expect(
      getCustomWidgetPhaseToolNames(tools, [example], {
        preferDirectPreview: true,
        preferredExampleId: "dispatcharr-channels",
      }),
    ).toEqual(["customWidget_previewCreate"]);
  });

  test("moves a valid template directly into preview and evidence phases", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_previewJournal",
      "customWidget_createFromPreview",
    ];

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        { toolResults: [{ toolName: "customWidget_validateTemplate", output: { valid: true } }] },
      ]),
    ).toEqual(["customWidget_previewCreate"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        { toolResults: [{ toolName: "customWidget_previewCreate", output: { success: true } }] },
      ]),
    ).toEqual([
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_previewJournal",
      "customWidget_createFromPreview",
    ]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        { toolResults: [{ toolName: "customWidget_createFromPreview", output: { id: "widget-1" } }] },
      ]),
    ).toEqual(["customWidget_findComponents", "customWidget_getComponents", "customWidget_previewCreate"]);
    expect(
      getCustomWidgetPhaseToolNames(
        tools,
        [{ toolResults: [{ toolName: "customWidget_createFromPreview", output: { id: "widget-1" } }] }],
        { continueAfterPersistence: false },
      ),
    ).toEqual([]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            { toolName: "customWidget_validateTemplate", output: { valid: false } },
            { toolName: "customWidget_validateTemplate", output: { valid: true } },
          ],
        },
      ]),
    ).toEqual(["customWidget_findComponents", "customWidget_getComponents", "customWidget_previewCreate"]);
  });

  test("keeps an approved preview in the evidence phase before step zero", () => {
    const tools = [
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_previewJournal",
      "customWidget_createFromPreview",
      "customWidget_findComponents",
    ];
    const responseMessages = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "preview-call-1",
            toolName: "customWidget_previewCreate",
            output: {
              type: "json",
              value: {
                success: true,
                previewSession: { id: "preview-1" },
                queries: [{ requestId: "status" }],
              },
            },
          },
        ],
      },
    ];

    const responseSteps = getCustomWidgetToolStepsFromResponseMessages(responseMessages);

    expect(getCustomWidgetPhaseToolNames(tools, responseSteps)).toEqual(["customWidget_previewQuery"]);
    expect(getCustomWidgetPhaseToolNames(tools, [])).toEqual([
      "customWidget_previewCreate",
      "customWidget_findComponents",
    ]);
  });

  test("does not restore an abandoned configuration phase into a new widget request", () => {
    const messages = sourceConfigurationPausedMessages("Create a new Mealie custom widget instead");

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(true);
    expect(getCustomWidgetToolStepsFromUiMessages(messages)).toEqual([]);
    expect(
      getCustomWidgetPhaseToolNames(
        ["customWidget_getSkill", "customWidget_configurationRequestUser", "customWidget_createFromPreview"],
        getCustomWidgetToolStepsFromUiMessages(messages),
      ),
    ).toEqual([]);
  });

  test.each(["Continue", "I completed the secure source configuration", "Change it to use a compact header"])(
    "restores a credential-paused phase for a genuine continuation: %s",
    (latestUserText) => {
      const messages = sourceConfigurationPausedMessages(latestUserText);
      const restoredSteps = getCustomWidgetToolStepsFromUiMessages(messages);

      expect(restoredSteps.map(({ toolResults }) => toolResults[0]?.toolCallId)).toEqual([
        "preview-create",
        "configure-dispatcharr",
      ]);
      expect(
        getCustomWidgetPhaseToolNames(
          ["customWidget_getSkill", "customWidget_configurationRequestUser", "customWidget_createFromPreview"],
          restoredSteps,
        ),
      ).toEqual(["customWidget_configurationRequestUser"]);
      if (latestUserText === "Continue") {
        expect(
          shouldRequireCustomWidgetAuthoringTool(["customWidget_configurationRequestUser"], [], [], messages),
        ).toBe(true);
      }
    },
  );

  test("restores the original preview across repeated source-configuration pauses", () => {
    const messages: UIMessage[] = [
      userMessage("Create a custom widget with two authenticated sources"),
      {
        id: "assistant-first-source",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewCreate",
            toolCallId: "preview-create",
            state: "output-available",
            input: { definition: {} },
            output: {
              success: true,
              previewSession: { id: "preview-1" },
              sourceConfigurations: [{ sourceId: "primary" }, { sourceId: "secondary" }],
              queries: [{ requestId: "primary-status" }, { requestId: "secondary-status" }],
              actions: [],
            },
          },
          {
            type: "dynamic-tool",
            toolName: "customWidget_configurationRequestUser",
            toolCallId: "configure-primary",
            state: "output-available",
            input: { previewSessionId: "preview-1", sourceId: "primary" },
            output: {
              requestId: "request-primary",
              previewSessionId: "preview-1",
              sourceId: "primary",
              status: "pending",
              url: "https://homarr.test/configure/primary",
            },
          },
        ],
      },
      userMessage("Continue"),
      {
        id: "assistant-second-source",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_configurationRequestUser",
            toolCallId: "check-primary",
            state: "output-available",
            input: { requestId: "request-primary" },
            output: {
              requestId: "request-primary",
              previewSessionId: "preview-1",
              sourceId: "primary",
              status: "completed",
            },
          },
          {
            type: "dynamic-tool",
            toolName: "customWidget_configurationRequestUser",
            toolCallId: "configure-secondary",
            state: "output-available",
            input: { previewSessionId: "preview-1", sourceId: "secondary" },
            output: {
              requestId: "request-secondary",
              previewSessionId: "preview-1",
              sourceId: "secondary",
              status: "pending",
              url: "https://homarr.test/configure/secondary",
            },
          },
        ],
      },
      userMessage("Continue"),
    ];
    const tools = [
      "customWidget_previewQuery",
      "customWidget_configurationRequestUser",
      "customWidget_createFromPreview",
    ];
    const restoredSteps = getCustomWidgetToolStepsFromUiMessages(messages);

    expect(restoredSteps.map(({ toolResults }) => toolResults[0]?.toolCallId)).toEqual([
      "preview-create",
      "configure-primary",
      "check-primary",
      "configure-secondary",
    ]);
    expect(getCustomWidgetPhaseToolNames(tools, restoredSteps)).toEqual(["customWidget_configurationRequestUser"]);
    expect(shouldRequireCustomWidgetAuthoringTool(["customWidget_configurationRequestUser"], [], [], messages)).toBe(
      true,
    );
  });

  test("requires suggested HTTP source configuration before preview evidence", () => {
    const tools = [
      "customWidget_previewQuery",
      "customWidget_configurationRequestUser",
      "customWidget_createFromPreview",
    ];
    const previewStep = {
      toolResults: [
        {
          toolName: "customWidget_previewCreate",
          output: {
            success: true,
            previewSession: { id: "preview-1" },
            sourceConfigurations: [{ sourceId: "default" }],
            queries: [{ requestId: "status" }],
            actions: [],
          },
        },
      ],
    };

    expect(getCustomWidgetPhaseToolNames(tools, [previewStep])).toEqual(["customWidget_configurationRequestUser"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        previewStep,
        {
          toolResults: [
            {
              toolName: "customWidget_configurationRequestUser",
              output: {
                requestId: "request-1",
                previewSessionId: "preview-1",
                sourceId: "default",
                status: "pending",
              },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_configurationRequestUser"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        previewStep,
        {
          toolResults: [
            {
              toolName: "customWidget_configurationRequestUser",
              output: {
                requestId: "request-1",
                previewSessionId: "preview-1",
                sourceId: "default",
                status: "completed",
              },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_previewQuery"]);
  });

  test("allows an expired source-configuration request to be replaced", () => {
    const tools = [
      "customWidget_previewQuery",
      "customWidget_configurationRequestUser",
      "customWidget_createFromPreview",
    ];
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_previewCreate",
            output: {
              success: true,
              previewSession: { id: "preview-1" },
              sourceConfigurations: [{ sourceId: "default" }],
              queries: [{ requestId: "status" }],
              actions: [],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_configurationRequestUser",
            output: {
              requestId: "request-1",
              previewSessionId: "preview-1",
              sourceId: "default",
              status: "pending",
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_configurationRequestUser",
            output: {
              requestId: "request-1",
              status: "expired",
              error: "The requested resource was not found or is not compatible with this tool.",
              recovery: {
                recoverable: true,
                kind: "expired-source-configuration-request",
                requiredNextTool: "customWidget_configurationRequestUser",
              },
            },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual(["customWidget_configurationRequestUser"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        ...steps,
        {
          toolResults: [
            {
              toolName: "customWidget_configurationRequestUser",
              output: {
                requestId: "request-2",
                previewSessionId: "preview-1",
                sourceId: "default",
                status: "completed",
              },
            },
          ],
        },
        {
          toolResults: [
            {
              toolName: "customWidget_previewQuery",
              output: { sessionId: "preview-1", requestId: "status", sourceId: "default", ok: true },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_createFromPreview"]);
  });

  test("routes authentication recovery securely and keeps request repair available for other failures", () => {
    const tools = [
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponent",
      "customWidget_previewQuery",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_configurationRequestUser",
      "customWidget_createFromPreview",
    ];
    const previewStep = {
      toolResults: [
        {
          toolName: "customWidget_previewCreate",
          output: {
            success: true,
            previewSession: { id: "preview-1" },
            sourceConfigurations: [],
            queries: [{ requestId: "status" }],
            actions: [],
          },
        },
      ],
    };
    const authenticationFailure = {
      toolResults: [
        {
          toolName: "customWidget_previewQuery",
          output: {
            sessionId: "preview-1",
            requestId: "status",
            sourceId: "default",
            ok: false,
            status: 401,
            error: "HTTP 401: Unauthorized",
          },
        },
      ],
    };

    expect(getCustomWidgetPhaseToolNames(tools, [previewStep, authenticationFailure])).toEqual([
      "customWidget_configurationRequestUser",
    ]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        previewStep,
        authenticationFailure,
        {
          toolResults: [
            {
              toolName: "customWidget_configurationRequestUser",
              output: {
                requestId: "request-1",
                previewSessionId: "preview-1",
                sourceId: "default",
                status: "completed",
              },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_previewQuery"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        previewStep,
        {
          toolResults: [
            {
              toolName: "customWidget_previewQuery",
              output: {
                sessionId: "preview-1",
                requestId: "status",
                ok: false,
                error: "Connection refused",
              },
            },
          ],
        },
      ]),
    ).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponent",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
    ]);
  });

  test("keeps failed validation and preview calls on narrow repair paths", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponent",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_createFromPreview",
    ];

    for (const [toolName, output, expectedTools] of [
      [
        "customWidget_validateTemplate",
        { valid: false, diagnostics: [{ severity: "error", message: "Unexpected token" }] },
        ["customWidget_previewCreate"],
      ],
      [
        "customWidget_validateTemplate",
        {
          valid: false,
          diagnostics: [{ severity: "error", message: "UNKNOWN_COMPONENT: 'div' is not available" }],
        },
        ["customWidget_getComponent", "customWidget_previewCreate"],
      ],
      [
        "customWidget_previewCreate",
        { error: "Definition is invalid: sources.default.auth: Invalid input" },
        [
          "customWidget_getReference",
          "customWidget_findComponents",
          "customWidget_getComponent",
          "customWidget_getComponents",
          "customWidget_previewCreate",
        ],
      ],
      [
        "customWidget_previewReviseTemplate",
        { error: "Provide template or templateLines, not both" },
        ["customWidget_findComponents", "customWidget_getComponent", "customWidget_previewReviseTemplate"],
      ],
    ] as const) {
      expect(getCustomWidgetPhaseToolNames(tools, [{ toolResults: [{ toolName, output }] }])).toEqual(expectedTools);
    }
  });

  test("routes a missing component through one focused replacement path and forces continuation", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getComponent",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
    ];
    const messages = [userMessage("Create a custom widget for my dashboard")];
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_validateTemplate",
            output: {
              valid: false,
              diagnostics: [{ severity: "error", message: "UNKNOWN_COMPONENT: 'IconCheck' is not available" }],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_getComponent",
            output: {
              error: "The requested resource was not found or is not compatible with this tool.",
              recovery: {
                recoverable: true,
                kind: "component-not-found",
                allowedNextTools: [
                  "customWidget_findComponents",
                  "customWidget_getComponents",
                  "customWidget_validateTemplate",
                ],
              },
            },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual([
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_previewCreate",
    ]);
    expect(
      shouldRequireCustomWidgetAuthoringTool(getCustomWidgetPhaseToolNames(tools, steps) ?? [], steps, [], messages),
    ).toBe(true);
  });

  test("keeps prior preview evidence after an unchanged revision", () => {
    const tools = [
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_createFromPreview",
    ];
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_previewCreate",
            output: {
              success: true,
              previewSession: { id: "preview-1" },
              queries: [{ requestId: "status" }],
              actions: [],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-1", requestId: "status", ok: true },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewReviseTemplate",
            output: {
              error: "Revised preview template is unchanged",
              unchanged: true,
              preservesPreviewEvidence: true,
              sessionId: "preview-1",
              recovery: { recoverable: true, kind: "unchanged-preview-revision" },
            },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual(["customWidget_createFromPreview"]);
  });

  test("advances directly to persistence after revised preview evidence completes", () => {
    const tools = [
      "customWidget_validateTemplate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_createFromPreview",
    ];
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_previewReviseTemplate",
            output: {
              success: true,
              previewSession: { id: "preview-1", revision: 1 },
              queries: [{ requestId: "status" }],
              actions: [],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: {
              sessionId: "preview-1",
              requestId: "status",
              ok: true,
              evidenceComplete: true,
              recommendedNextTool: "customWidget_createFromPreview",
            },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual(["customWidget_createFromPreview"]);
  });

  test("finalizes an edit preview through updateFromPreview", () => {
    const tools = [
      "customWidget_previewCreate",
      "customWidget_previewQuery",
      "customWidget_createFromPreview",
      "customWidget_updateFromPreview",
    ];
    const steps = [
      {
        toolResults: [
          {
            toolName: "customWidget_previewCreate",
            output: {
              success: true,
              persistenceTool: "customWidget_updateFromPreview",
              previewSession: { id: "preview-edit" },
              queries: [{ requestId: "status" }],
              actions: [],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-edit", requestId: "status", ok: true },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual(["customWidget_updateFromPreview"]);
    expect(getCustomWidgetPhaseToolNames(tools, steps, { legacyMigrationOnly: true })).toEqual([
      "customWidget_updateFromPreview",
    ]);
  });

  test("exposes focused context tools only after the skill entrypoint is loaded", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_list",
      "customWidget_get",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
      "customWidget_previewCreate",
    ];

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        { toolResults: [{ toolName: "customWidget_getSkill", output: { content: "skill" } }] },
      ]),
    ).toEqual([
      "customWidget_list",
      "customWidget_get",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
      "customWidget_previewCreate",
    ]);
  });

  test("stages Workshop discovery, install, and the next coordinated widget", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
      "customWidget_workshopInstall",
    ];
    const skillLoaded = [{ toolResults: [{ toolName: "customWidget_getSkill", output: { content: "skill" } }] }];
    const workshopSearch = [
      ...skillLoaded,
      { toolResults: [{ toolName: "customWidget_workshopSearch", output: { items: [] } }] },
    ];
    const failedWorkshopGet = [
      ...workshopSearch,
      { toolResults: [{ toolName: "customWidget_workshopGet", output: { error: "unavailable" } }] },
    ];
    const successfulWorkshopGet = [
      ...workshopSearch,
      {
        toolResults: [
          {
            toolName: "customWidget_workshopGet",
            output: { widget: { name: "Fixtures" }, sourceSetup: [] },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, skillLoaded)).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
    ]);
    expect(getCustomWidgetPhaseToolNames(tools, failedWorkshopGet)).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
    ]);
    expect(getCustomWidgetPhaseToolNames(tools, successfulWorkshopGet)).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
      "customWidget_workshopInstall",
    ]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        ...successfulWorkshopGet,
        {
          toolResults: [{ toolName: "customWidget_workshopInstall", output: { error: "source setup required" } }],
        },
      ]),
    ).toEqual(getCustomWidgetPhaseToolNames(tools, successfulWorkshopGet));
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        ...successfulWorkshopGet,
        {
          toolResults: [
            {
              toolName: "customWidget_workshopInstall",
              output: { status: "installed", definitionId: "widget-1" },
            },
          ],
        },
      ]),
    ).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
    ]);
  });

  test("keeps one concrete component repair path open for validation warnings", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
    ];

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_validateTemplate",
              output: {
                valid: true,
                diagnostics: [{ severity: "warning", message: "UNKNOWN_MANTINE_PROP: requestId" }],
              },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_getComponent", "customWidget_previewCreate"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_validateTemplate",
              output: {
                valid: true,
                diagnostics: [{ severity: "warning", message: "UNKNOWN_MANTINE_PROP: requestId" }],
              },
            },
          ],
        },
        {
          toolResults: [{ toolName: "customWidget_getComponent", output: { name: "RefreshButton", props: [] } }],
        },
      ]),
    ).toEqual(["customWidget_previewCreate"]);
  });

  test("keeps evidence tools until every preview request succeeds, then allows persistence", () => {
    const tools = [
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_previewJournal",
      "customWidget_createFromPreview",
    ];
    const previewStep = {
      toolResults: [
        {
          toolName: "customWidget_previewCreate",
          output: {
            success: true,
            previewSession: { id: "preview-1" },
            queries: [{ requestId: "counts" }, { requestId: "recent" }],
            actions: [{ requestId: "approve" }],
          },
        },
      ],
    };
    const partialEvidence = [
      previewStep,
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-1", requestId: "counts", ok: true },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewAction",
            output: { sessionId: "preview-1", requestId: "approve", ok: true, simulated: true },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, partialEvidence)).toEqual(["customWidget_previewQuery"]);
    const completeEvidence = [
      ...partialEvidence,
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-1", requestId: "recent", ok: true },
          },
        ],
      },
    ];

    expect(getCustomWidgetPhaseToolNames(tools, completeEvidence)).toEqual(["customWidget_createFromPreview"]);
    expect(getCustomWidgetPhaseToolNames(tools, completeEvidence, { legacyMigrationOnly: true })).toEqual([]);
  });

  test("recognizes the current user v1 migration task without inheriting it into a new task", () => {
    const migration = userMessage('Migrate {"$schema":"homarr-custom-widget-v1"}');
    const continuation = userMessage("Continue after source configuration");
    const freshCreation = userMessage("Create a new custom widget for Mealie");
    const assistantQuote: UIMessage = {
      id: "assistant-migration-quote",
      role: "assistant",
      parts: [{ type: "text", text: 'The data includes "$schema":"homarr-custom-widget-v1".' }],
    };

    expect(hasCustomWidgetLegacyMigrationContext([migration, continuation])).toBe(true);
    expect(hasCustomWidgetLegacyMigrationContext([assistantQuote])).toBe(false);
    expect(hasCustomWidgetLegacyMigrationContext([migration, freshCreation])).toBe(false);
  });

  test("closes focused discovery after four searches and proceeds to drafting", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_getExample",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
    ];
    const steps = Array.from({ length: 4 }, () => ({
      toolResults: [{ toolName: "customWidget_findComponents", output: { components: [] } }],
    }));

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual([
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_previewCreate",
    ]);
  });

  test("previews directly after Homarr reports that context retrieval is complete", () => {
    const tools = [
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
    ];

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_getComponents",
              output: { phaseComplete: true, components: [] },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_previewCreate"]);
  });

  test("removes repeated reference retrieval while keeping remaining context and validation available", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
    ];

    const activeNames = getCustomWidgetPhaseToolNames(tools, [
      { toolResults: [{ toolName: "customWidget_getSkill", output: { content: "skill" } }] },
      { toolResults: [{ toolName: "customWidget_getReference", output: { name: "schema", content: "schema" } }] },
      {
        toolResults: [
          {
            toolName: "customWidget_getReference",
            output: {
              contextAlreadyLoaded: true,
              nextStep: "Reuse the earlier result for this exact context request.",
            },
          },
        ],
      },
    ]);

    expect(activeNames).toEqual(
      expect.arrayContaining([
        "customWidget_findComponents",
        "customWidget_getComponents",
        "customWidget_previewCreate",
      ]),
    );
    expect(activeNames).not.toContain("customWidget_getReference");
    expect(activeNames).not.toContain("customWidget_validateTemplate");
  });

  test("requires another tool after successful discovery or validation during a build request", () => {
    const activeTools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponent",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_configurationRequestUser",
      "customWidget_createFromPreview",
    ];
    const messages = [userMessage("Create a custom widget for my dashboard")];
    for (const [toolName, output] of [
      ["customWidget_getExample", { id: "mealie-today", widget: { sources: {} } }],
      ["customWidget_getComponents", { components: [] }],
      ["customWidget_previewAction", { ok: false, error: "Preview source credentials are missing" }],
      ["customWidget_getSkill", { skillMd: "skill" }],
      ["customWidget_getReference", { name: "schema", content: "schema" }],
      ["customWidget_findComponents", { components: [] }],
      ["customWidget_previewReviseTemplate", { success: true }],
      ["customWidget_previewAction", { ok: true, error: null }],
      ["customWidget_validateTemplate", { valid: true, diagnostics: [{ severity: "warning", message: "review" }] }],
      ["customWidget_previewCreate", { success: true }],
      ["customWidget_previewQuery", { ok: true, error: null }],
      ["customWidget_previewQuery", { ok: false, status: 401, error: "HTTP 401: Unauthorized" }],
      ["customWidget_configurationRequestUser", { status: "completed" }],
      ["customWidget_validateTemplate", { valid: false, diagnostics: [] }],
      ["customWidget_previewCreate", { error: "Definition is invalid: sources.default.auth: Invalid input" }],
      ["customWidget_previewReviseTemplate", { error: "Provide template or templateLines" }],
      ["customWidget_createFromPreview", { error: "Test every final preview query successfully: status" }],
    ] as const) {
      expect(isAuthoringToolRequiredAfter([{ toolName, output }], activeTools, messages)).toBe(true);
    }
    expect(
      isAuthoringToolRequiredAfter(
        [{ toolName: "integration_all", output: [] }],
        ["customWidget_previewCreate"],
        messages,
      ),
    ).toBe(true);
    expect(
      isAuthoringToolRequiredAfter(
        [{ toolName: "customWidget_getExample", output: { id: "mealie-today", widget: { sources: {} } } }],
        ["integration_all"],
        messages,
      ),
    ).toBe(true);
    expect(
      isAuthoringToolRequiredAfter(
        [{ toolName: "customWidget_getComponents", output: { phaseComplete: true } }],
        activeTools,
        [userMessage("Create a Homarr Custom JSX v2 dashboard widget and save it")],
      ),
    ).toBe(true);
    expect(
      isAuthoringToolRequiredAfter(
        [
          { toolName: "customWidget_getComponents", output: { components: [] } },
          { toolName: "customWidget_getReference", output: { name: "runtime", content: "runtime" } },
        ],
        activeTools,
        messages,
      ),
    ).toBe(true);

    for (const [toolName, output] of [
      ["customWidget_configurationRequestUser", { status: "pending" }],
      ["customWidget_previewQuery", { ok: true, error: "timeout" }],
      ["customWidget_previewCreate", { error: "Preview service unavailable" }],
    ] as const) {
      expect(isAuthoringToolRequiredAfter([{ toolName, output }], activeTools, messages)).toBe(false);
    }
  });

  test("requires the one-prompt research path from the first step through a successful GET probe", () => {
    const researchTool = "customWidget_recordIntegrationResearch";
    const activeTools = [
      "homarr_enableToolGroups",
      "integration_getKinds",
      "integration_all",
      "integration_request",
      researchTool,
      "customWidget_getSkill",
    ];
    const messages = [userMessage("Make me a Mealie widget")];

    expect(shouldRequireCustomWidgetAuthoringTool(activeTools, [], [], messages)).toBe(true);
    for (const [toolName, output] of [
      ["homarr_enableToolGroups", { enabledGroups: ["integration"] }],
      ["integration_getKinds", [{ kind: "mealie", supportsHttpRequests: true }]],
      ["integration_all", [{ id: "integration-mealie", kind: "mealie", permissions: { hasFullAccess: true } }]],
      [researchTool, { recorded: true, status: "ready" }],
      ["integration_request", { ok: true, status: 200, data: { items: [] } }],
    ] as const) {
      expect(
        shouldRequireCustomWidgetAuthoringTool(activeTools, [{ toolResults: [{ toolName, output }] }], [], messages),
      ).toBe(true);
    }
  });

  test("stops safely when research or a saved-integration probe is unavailable", () => {
    const messages = [userMessage("Make me a Mealie widget")];
    const lifecycleTools = ["customWidget_recordIntegrationResearch", "customWidget_getSkill"];

    for (const [toolNames, toolName, output] of [
      [
        lifecycleTools,
        "customWidget_recordIntegrationResearch",
        { recorded: false, status: "unavailable", reason: "No official API contract" },
      ],
      [lifecycleTools, "integration_request", { ok: false, status: 401, error: "Unauthorized" }],
      [["customWidget_getSkill"], "integration_all", []],
    ] as const) {
      expect(
        shouldRequireCustomWidgetAuthoringTool(toolNames, [{ toolResults: [{ toolName, output }] }], [], messages),
      ).toBe(false);
    }
  });

  test("does not force validation-only, failed, saved, or client-tool continuations", () => {
    const activeTools = ["customWidget_getComponent", "customWidget_validateTemplate"];
    const successfulDiscovery = {
      toolResults: [{ toolName: "customWidget_getComponents", output: { phaseComplete: true } }],
    };

    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [successfulDiscovery],
        [],
        [userMessage("Validate and fix this custom widget")],
      ),
    ).toBe(true);

    for (const [steps, messages] of [
      [[successfulDiscovery], [userMessage("Validate this widget")]],
      [[successfulDiscovery], [userMessage("Create a widget"), userMessage("Only validate this custom widget")]],
      [
        [{ toolResults: [{ toolName: "customWidget_getComponents", output: { error: "upstream" } }] }],
        [userMessage("Create a custom widget")],
      ],
      [
        [{ toolResults: [{ toolName: "customWidget_createFromPreview", output: { id: "widget-1" } }] }],
        [userMessage("Create a custom widget")],
      ],
    ] as const) {
      expect(shouldRequireCustomWidgetAuthoringTool(activeTools, steps, [], messages)).toBe(false);
    }
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ ...successfulDiscovery, toolCalls: [{ toolCallId: "ask-1", toolName: "ask_user" }] }],
        [],
        [userMessage("Create a custom widget")],
      ),
    ).toBe(false);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [],
        [successfulDiscovery],
        [
          userMessage("Create a custom widget"),
          {
            id: "assistant-cancelled",
            role: "assistant",
            parts: [
              {
                type: "dynamic-tool",
                toolName: "configure_widget",
                toolCallId: "configure-1",
                state: "output-available",
                input: {},
                output: { cancelled: true },
              },
            ],
          },
        ],
      ),
    ).toBe(false);
  });

  test("previews directly after a selected documentation batch", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
    ];

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_getComponents",
              output: { components: [{ name: "SubFetch" }] },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_previewCreate"]);
  });

  test("bounds parallel focused searches and reopens after failed validation", () => {
    const controller = createCustomWidgetDiscoveryPhaseController();

    expect(Array.from({ length: 4 }, () => controller.claim("customWidget_findComponents"))).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(controller.claim("customWidget_findComponents")).toBe(false);
    expect(controller.claim("customWidget_getComponents")).toBe(true);
    expect(controller.claim("customWidget_getComponents")).toBe(false);
    expect(controller.claim("customWidget_getExample")).toBe(true);
    expect(controller.claim("customWidget_getExample")).toBe(false);
    expect(controller.claim("customWidget_getComponent")).toBe(true);
    expect(controller.claim("customWidget_getComponent")).toBe(true);
    expect(controller.claim("customWidget_getComponent")).toBe(false);
    controller.observe("customWidget_validateTemplate", { valid: false });
    expect(controller.claim("customWidget_findComponents")).toBe(true);
    expect(controller.claim("customWidget_getComponents")).toBe(true);
  });
});

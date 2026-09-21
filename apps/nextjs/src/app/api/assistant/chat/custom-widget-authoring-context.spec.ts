import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";

import {
  createCustomWidgetDiscoveryPhaseController,
  getActiveCustomWidgetToolNames,
  getCustomWidgetPhaseToolNames,
  getCustomWidgetToolStepsFromResponseMessages,
  needsCustomWidgetAuthoringContext,
  shouldRequireCustomWidgetAuthoringTool,
} from "./custom-widget-authoring-context";

const userMessage = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

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
    "I want a widget for Seerr",
    "Repair this custom-widget",
    "Validate this Custom JSX definition",
    '{"$schema":"homarr-custom-widget-v2"}',
  ])("detects explicit authoring intent: %s", (text) => {
    expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(true);
  });

  test.each(["List my custom widgets", "Delete a custom widget", "Explain custom widgets"])(
    "leaves management intent to the general Custom Widget MCP group: %s",
    (text) => {
      expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(false);
    },
  );

  test.each([
    "Make me a weather widget",
    "Create a clock widget",
    "Build a calendar widget",
    "I want a widget for weather",
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

  test("activates only Custom Widget tools for an administrator authoring turn", () => {
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

    expect(getActiveCustomWidgetToolNames(tools, [userMessage("Create two custom widgets")], true)).toEqual([
      "customWidget_getSkill",
    ]);
    expect(getActiveCustomWidgetToolNames(tools, [userMessage("Create a custom widget")], false)).toEqual([]);
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
    ).toEqual(["customWidget_validateTemplate", "customWidget_previewCreate", "customWidget_previewReviseTemplate"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        { toolResults: [{ toolName: "customWidget_previewCreate", output: { success: true } }] },
      ]),
    ).toEqual([
      "customWidget_validateTemplate",
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
    ).toBeNull();
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            { toolName: "customWidget_validateTemplate", output: { valid: false } },
            { toolName: "customWidget_validateTemplate", output: { valid: true } },
          ],
        },
      ]),
    ).toBeNull();
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

    expect(getCustomWidgetPhaseToolNames(tools, responseSteps)).toEqual([
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_previewJournal",
      "customWidget_createFromPreview",
    ]);
    expect(getCustomWidgetPhaseToolNames(tools, [])).toBeNull();
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

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_validateTemplate",
              output: { valid: false, diagnostics: [{ severity: "error", message: "Unexpected token" }] },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_validateTemplate"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_validateTemplate",
              output: {
                valid: false,
                diagnostics: [{ severity: "error", message: "UNKNOWN_COMPONENT: 'div' is not available" }],
              },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_getComponent", "customWidget_validateTemplate"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_previewCreate",
              output: { error: "Definition is invalid: sources.default.auth: Invalid input" },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_getReference", "customWidget_validateTemplate"]);
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        {
          toolResults: [
            {
              toolName: "customWidget_previewReviseTemplate",
              output: { error: "Provide template or templateLines, not both" },
            },
          ],
        },
      ]),
    ).toEqual(["customWidget_validateTemplate"]);
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
      "customWidget_validateTemplate",
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
  });

  test("exposes focused context tools only after the skill entrypoint is loaded", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_validateTemplate",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
      "customWidget_previewCreate",
    ];

    expect(
      getCustomWidgetPhaseToolNames(tools, [
        { toolResults: [{ toolName: "customWidget_getSkill", output: { content: "skill" } }] },
      ]),
    ).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_validateTemplate",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
    ]);
  });

  test("stages Workshop discovery, install, and the next coordinated widget", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_validateTemplate",
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
      "customWidget_validateTemplate",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
    ]);
    expect(getCustomWidgetPhaseToolNames(tools, failedWorkshopGet)).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_validateTemplate",
      "customWidget_workshopSearch",
      "customWidget_workshopGet",
    ]);
    expect(getCustomWidgetPhaseToolNames(tools, successfulWorkshopGet)).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_validateTemplate",
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
      "customWidget_validateTemplate",
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
    ).toEqual([
      "customWidget_getComponent",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
    ]);
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
    ).toEqual(["customWidget_validateTemplate", "customWidget_previewCreate", "customWidget_previewReviseTemplate"]);
  });

  test("keeps evidence tools until every preview request succeeds, then allows correction or persistence", () => {
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

    expect(getCustomWidgetPhaseToolNames(tools, partialEvidence)).toEqual(tools);
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
    expect(
      getCustomWidgetPhaseToolNames(tools, [
        ...completeEvidence,
        { toolResults: [{ toolName: "customWidget_validateTemplate", output: { valid: true } }] },
      ]),
    ).toEqual(["customWidget_validateTemplate", "customWidget_previewCreate", "customWidget_previewReviseTemplate"]);

    const revisedPreview = [
      ...completeEvidence,
      { toolResults: [{ toolName: "customWidget_validateTemplate", output: { valid: true } }] },
      {
        toolResults: [
          {
            toolName: "customWidget_previewReviseTemplate",
            output: {
              success: true,
              evidenceReset: true,
              previewSession: { id: "preview-1", revision: 1 },
              queries: [{ requestId: "counts" }, { requestId: "recent" }],
              actions: [{ requestId: "approve" }],
            },
          },
        ],
      },
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-1", requestId: "counts", ok: true },
          },
        ],
      },
    ];
    expect(getCustomWidgetPhaseToolNames(tools, revisedPreview)).toEqual(tools);

    const completeRevisedEvidence = [
      ...revisedPreview,
      {
        toolResults: [
          {
            toolName: "customWidget_previewQuery",
            output: { sessionId: "preview-1", requestId: "recent", ok: true },
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
    expect(getCustomWidgetPhaseToolNames(tools, completeRevisedEvidence)).toEqual(["customWidget_createFromPreview"]);
  });

  test("closes focused discovery after four searches until validation", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_getExample",
      "customWidget_validateTemplate",
    ];
    const steps = Array.from({ length: 4 }, () => ({
      toolResults: [{ toolName: "customWidget_findComponents", output: { components: [] } }],
    }));

    expect(getCustomWidgetPhaseToolNames(tools, steps)).toEqual([
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_validateTemplate",
    ]);
  });

  test("forces validation after Homarr reports that context retrieval is complete", () => {
    const tools = [
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_validateTemplate",
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
    ).toEqual(["customWidget_validateTemplate"]);
  });

  test("removes repeated reference retrieval while keeping remaining context and validation available", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_validateTemplate",
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
        "customWidget_validateTemplate",
      ]),
    );
    expect(activeNames).not.toContain("customWidget_getReference");
    expect(activeNames).not.toEqual(["customWidget_validateTemplate"]);
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
      "customWidget_createFromPreview",
    ];
    const messages = [userMessage("Create a custom widget for my dashboard")];

    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_getComponents", output: { components: [] } }] }],
        [],
        messages,
      ),
    ).toBe(true);
    for (const [toolName, output] of [
      ["customWidget_getSkill", { skillMd: "skill" }],
      ["customWidget_getReference", { name: "schema", content: "schema" }],
      ["customWidget_findComponents", { components: [] }],
      ["customWidget_previewReviseTemplate", { success: true }],
      ["customWidget_previewAction", { ok: true, error: null }],
    ] as const) {
      expect(
        shouldRequireCustomWidgetAuthoringTool(activeTools, [{ toolResults: [{ toolName, output }] }], [], messages),
      ).toBe(true);
    }
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_getComponents", output: { phaseComplete: true } }] }],
        [],
        [userMessage("Create a Homarr Custom JSX v2 dashboard widget and save it")],
      ),
    ).toBe(true);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [
          {
            toolResults: [
              { toolName: "customWidget_getComponents", output: { components: [] } },
              { toolName: "customWidget_getReference", output: { name: "runtime", content: "runtime" } },
            ],
          },
        ],
        [],
        messages,
      ),
    ).toBe(true);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [
          {
            toolResults: [
              {
                toolName: "customWidget_validateTemplate",
                output: { valid: true, diagnostics: [{ severity: "warning", message: "review" }] },
              },
            ],
          },
        ],
        [],
        messages,
      ),
    ).toBe(true);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_previewCreate", output: { success: true } }] }],
        [],
        messages,
      ),
    ).toBe(true);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_previewQuery", output: { ok: true, error: null } }] }],
        [],
        messages,
      ),
    ).toBe(true);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_previewQuery", output: { ok: true, error: "timeout" } }] }],
        [],
        messages,
      ),
    ).toBe(false);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        ["customWidget_validateTemplate"],
        [
          {
            toolResults: [{ toolName: "customWidget_validateTemplate", output: { valid: false, diagnostics: [] } }],
          },
        ],
        [],
        messages,
      ),
    ).toBe(true);

    for (const [toolName, output] of [
      ["customWidget_validateTemplate", { valid: false, diagnostics: [] }],
      ["customWidget_previewCreate", { error: "Definition is invalid: sources.default.auth: Invalid input" }],
      ["customWidget_previewReviseTemplate", { error: "Provide template or templateLines" }],
      ["customWidget_createFromPreview", { error: "Test every final preview query successfully: status" }],
    ] as const) {
      expect(
        shouldRequireCustomWidgetAuthoringTool(activeTools, [{ toolResults: [{ toolName, output }] }], [], messages),
      ).toBe(true);
    }
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [
          {
            toolResults: [{ toolName: "customWidget_previewCreate", output: { error: "Preview service unavailable" } }],
          },
        ],
        [],
        messages,
      ),
    ).toBe(false);
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

    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [successfulDiscovery],
        [],
        [userMessage("Validate this widget")],
      ),
    ).toBe(false);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [successfulDiscovery],
        [],
        [userMessage("Create a widget"), userMessage("Only validate this custom widget")],
      ),
    ).toBe(false);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_getComponents", output: { error: "upstream" } }] }],
        [],
        [userMessage("Create a custom widget")],
      ),
    ).toBe(false);
    expect(
      shouldRequireCustomWidgetAuthoringTool(
        activeTools,
        [{ toolResults: [{ toolName: "customWidget_createFromPreview", output: { id: "widget-1" } }] }],
        [],
        [userMessage("Create a custom widget")],
      ),
    ).toBe(false);
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

  test("keeps only references and validation after a selected documentation batch", () => {
    const tools = [
      "customWidget_findComponents",
      "customWidget_getReference",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_validateTemplate",
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
    ).toEqual(["customWidget_getReference", "customWidget_validateTemplate"]);
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

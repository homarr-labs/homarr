import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";

import {
  createCustomWidgetDiscoveryPhaseController,
  getActiveCustomWidgetToolNames,
  getCustomWidgetPhaseToolNames,
  needsCustomWidgetAuthoringContext,
} from "./custom-widget-authoring-context";

const userMessage = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

describe("Custom Widget authoring context", () => {
  test.each([
    "Create a custom widget for these fixtures",
    "Create custom widgets for these services",
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

  test("exposes focused context tools only after the skill entrypoint is loaded", () => {
    const tools = [
      "customWidget_getSkill",
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getExample",
      "customWidget_validateTemplate",
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

    expect(getCustomWidgetPhaseToolNames(tools, completeEvidence)).toEqual([
      "customWidget_validateTemplate",
      "customWidget_previewReviseTemplate",
      "customWidget_createFromPreview",
    ]);
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

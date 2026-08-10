import { convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";

import { getCustomWidgetSkill, getCustomWidgetSkillContent } from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

import {
  createCustomWidgetComponentDocumentBudget,
  createCustomWidgetDynamicContextController,
  getCustomWidgetAuthoringContext,
  isCustomWidgetAuthoringToolName,
  MAX_CUSTOM_WIDGET_COMPONENT_DOCUMENTS,
  MAX_CUSTOM_WIDGET_COMPONENT_DOCUMENTS_WITH_EXAMPLE,
  needsCustomWidgetAuthoringContext,
  preloadedCustomWidgetToolNames,
  prunePreloadedCustomWidgetModelMessages,
} from "./custom-widget-authoring-context";

const userMessage = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

describe("needsCustomWidgetAuthoringContext", () => {
  test.each([
    "Create a custom widget for these fixtures",
    "Create custom widgets for these services",
    "Repair this custom-widget",
    "Validate this Custom JSX definition",
    'Fix this {"$schema":"homarr-custom-widget-v2"}',
  ])("detects explicit authoring intent: %s", (text) => {
    expect(needsCustomWidgetAuthoringContext([userMessage(text)])).toBe(true);
  });

  test("continues loading authoring context after a Custom Widget tool call", () => {
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

  test("keeps context for a user follow-up immediately after a Custom Widget tool call", () => {
    const messages: UIMessage[] = [
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
      userMessage("Make the colors more compact"),
    ];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(true);
  });

  test("does not keep loading context because of stale Custom Widget history", () => {
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

  test("ignores malformed unknown message parts", () => {
    const malformedMessage = {
      id: "malformed",
      role: "user",
      parts: [null, {}, { type: 1 }, { type: "text", text: null }],
    } as unknown as UIMessage;

    expect(needsCustomWidgetAuthoringContext([malformedMessage])).toBe(false);
  });

  test("does not load authoring context for ordinary widget requests or assistant prose", () => {
    const messages: UIMessage[] = [
      userMessage("Add my media server widget to the home board"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "I could also build a custom widget." }],
      },
    ];

    expect(needsCustomWidgetAuthoringContext(messages)).toBe(false);
    expect(getCustomWidgetAuthoringContext(messages, true)).toEqual({ systemContext: "", omittedToolNames: [] });
    expect(Buffer.byteLength(getCustomWidgetAuthoringContext(messages, true).systemContext, "utf8")).toBe(0);
  });
});

describe("getCustomWidgetAuthoringContext", () => {
  test("does not expose administrator-only authoring resources to non-admins", () => {
    expect(getCustomWidgetAuthoringContext([userMessage("Create a custom widget")], false)).toEqual({
      systemContext: "",
      omittedToolNames: [],
    });
  });

  test("preloads the complete installed skill and every exact bundled reference", () => {
    const context = getCustomWidgetAuthoringContext([userMessage("Create a custom widget")], true);
    const skill = getCustomWidgetSkill();

    expect(context.systemContext).toContain(`## Installed skill: ${skill.name} ${skill.version}`);
    expect(context.systemContext).toContain(skill.skillMd.trim());
    expect(context.systemContext).toContain(getCustomWidgetSkillContent());
    for (const [file, content] of Object.entries(skill.references)) {
      expect(context.systemContext).toContain(`# Bundled file: ${file}`);
      expect(context.systemContext).toContain(content.trim());
    }
  });

  test("preloads a valid current JSON Schema and omits only the redundant resource tools", () => {
    const context = getCustomWidgetAuthoringContext([userMessage("Validate my custom widget")], true);
    const schemaBlock = context.systemContext.match(
      /## Current Custom Widget JSON Schema\n\n```json\n(?<schema>[\s\S]+)\n```$/u,
    );

    expect(schemaBlock?.groups?.schema).toBeDefined();
    const schema = JSON.parse(schemaBlock?.groups?.schema ?? "null") as Record<string, unknown>;
    expect(schema).toMatchObject({
      $schema: expect.any(String),
      title: "Homarr Custom JSX v2 widget",
      type: "object",
    });
    expect(schema).toEqual(getCustomWidgetJsonSchema());
    expect(JSON.stringify(schema)).toContain("homarr-custom-widget-v2");
    expect(context.omittedToolNames).toEqual(preloadedCustomWidgetToolNames);
    expect(context.systemContext).toContain(
      "customWidget_getSkill and customWidget_schema are already preloaded below",
    );
    expect(context.systemContext).toContain("intentionally omitted from the available tools");
  });

  test("keeps the complete trusted context within a bounded request budget", () => {
    const context = getCustomWidgetAuthoringContext([userMessage("Create a custom widget")], true);

    expect(Buffer.byteLength(context.systemContext, "utf8")).toBeLessThan(100_000);
  });
});

describe("createCustomWidgetDynamicContextController", () => {
  test("activates only for authoring tools, not lightweight management or Workshop inspection", () => {
    expect(isCustomWidgetAuthoringToolName("customWidget_getComponentCatalog")).toBe(true);
    expect(isCustomWidgetAuthoringToolName("customWidget_validate")).toBe(true);
    expect(isCustomWidgetAuthoringToolName("customWidget_previewCreate")).toBe(true);
    expect(isCustomWidgetAuthoringToolName("customWidget_list")).toBe(false);
    expect(isCustomWidgetAuthoringToolName("customWidget_get")).toBe(false);
    expect(isCustomWidgetAuthoringToolName("customWidget_workshopSearch")).toBe(false);
  });

  test("does not promote protected resources after a non-admin tool attempt", () => {
    const prepareContext = createCustomWidgetDynamicContextController({
      isAdmin: false,
      baseInstructions: "Base instructions",
      availableToolNames: ["customWidget_getSkill", "customWidget_schema"],
    });

    expect(
      prepareContext({
        instructions: "Base instructions",
        messages: [],
        steps: [{ toolCalls: [{ toolName: "customWidget_getSkill" }] }],
      }),
    ).toBeUndefined();
  });

  test("removes component documentation after the targeted retrieval budget is exhausted", () => {
    const prepareContext = createCustomWidgetDynamicContextController({
      isAdmin: true,
      baseInstructions: "Base instructions",
      availableToolNames: ["customWidget_getComponent", "customWidget_validate", "customWidget_previewCreate"],
    });
    const toolCalls = Array.from({ length: MAX_CUSTOM_WIDGET_COMPONENT_DOCUMENTS }, () => ({
      toolName: "customWidget_getComponent",
    }));

    expect(prepareContext({ instructions: "Base instructions", messages: [], steps: [{ toolCalls }] })).toMatchObject({
      activeTools: ["customWidget_validate", "customWidget_previewCreate"],
    });
  });

  test("uses a smaller component budget after a complete example is loaded", () => {
    const prepareContext = createCustomWidgetDynamicContextController({
      isAdmin: true,
      baseInstructions: "Base instructions",
      availableToolNames: ["customWidget_getComponent", "customWidget_getExample", "customWidget_validate"],
    });
    const toolCalls = [
      { toolName: "customWidget_getExample" },
      ...Array.from({ length: MAX_CUSTOM_WIDGET_COMPONENT_DOCUMENTS_WITH_EXAMPLE }, () => ({
        toolName: "customWidget_getComponent",
      })),
    ];

    expect(prepareContext({ instructions: "Base instructions", messages: [], steps: [{ toolCalls }] })).toMatchObject({
      activeTools: ["customWidget_getExample", "customWidget_validate"],
    });
  });

  test("rejects excess parallel component document executions without blocking other tools", () => {
    const budget = createCustomWidgetComponentDocumentBudget(2);

    expect(budget.claim("customWidget_getComponent")).toBe(true);
    expect(budget.claim("customWidget_getComponent")).toBe(true);
    expect(budget.claim("customWidget_getComponent")).toBe(false);
    expect(budget.claim("customWidget_validate")).toBe(true);
  });

  test("reduces the hard execution budget after loading an example", () => {
    const budget = createCustomWidgetComponentDocumentBudget();

    expect(budget.claim("customWidget_getExample")).toBe(true);
    for (let index = 0; index < MAX_CUSTOM_WIDGET_COMPONENT_DOCUMENTS_WITH_EXAMPLE; index += 1) {
      expect(budget.claim("customWidget_getComponent")).toBe(true);
    }
    expect(budget.claim("customWidget_getComponent")).toBe(false);
    expect(budget.claim("customWidget_validate")).toBe(true);
  });
});

describe("prunePreloadedCustomWidgetModelMessages", () => {
  test("removes only preloaded resource call-result pairs and preserves the rest of the turn", async () => {
    const messages: UIMessage[] = [
      userMessage("Create a custom widget"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_getSkill",
            toolCallId: "skill-1",
            state: "output-available",
            input: {},
            output: { name: "homarr-custom-widget" },
          },
          {
            type: "dynamic-tool",
            toolName: "customWidget_schema",
            toolCallId: "schema-1",
            state: "output-available",
            input: {},
            output: { type: "object" },
          },
          { type: "text", text: "I loaded the authoring resources." },
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewCreate",
            toolCallId: "preview-1",
            state: "output-available",
            input: { widget: { name: "Fixtures" } },
            output: { previewId: "preview-1" },
          },
        ],
      },
    ];

    const modelMessages = await convertToModelMessages(messages);
    const result = prunePreloadedCustomWidgetModelMessages(modelMessages);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("customWidget_getSkill");
    expect(serialized).not.toContain("customWidget_schema");
    expect(serialized).toContain("customWidget_previewCreate");
    expect(serialized).toContain("I loaded the authoring resources.");
  });

  test("removes empty assistant and tool messages left by resource-only history", async () => {
    const modelMessages = await convertToModelMessages([
      userMessage("Create a custom widget"),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_getSkill",
            toolCallId: "skill-1",
            state: "output-available",
            input: {},
            output: { name: "homarr-custom-widget" },
          },
        ],
      },
    ]);

    expect(prunePreloadedCustomWidgetModelMessages(modelMessages)).toEqual([
      { role: "user", content: [{ type: "text", text: "Create a custom widget" }] },
    ]);
  });
});

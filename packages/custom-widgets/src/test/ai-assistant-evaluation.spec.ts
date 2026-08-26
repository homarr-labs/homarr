import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import {
  createAssistantEvaluationState,
  customWidgetAssistantEvaluationToolDefinitions,
  executeAssistantEvaluationTool,
  getAssistantEvaluationPreviewResponse,
  getAssistantEvaluationRecoveryToolName,
  getRequiredAssistantEvaluationRequestParams,
  getAssistantEvaluationLifecycleIssues,
} from "../../scripts/ai-assistant-evaluation";

const widget = {
  $schema: "homarr-custom-widget-v2",
  name: "Homelab health",
  description: "Compact health overview",
  sources: {
    default: {
      baseUrl: "https://status.example.test",
      networkScope: "public",
      auth: "none",
    },
  },
  requests: {
    health: {
      source: "default",
      kind: "query",
      method: "GET",
      path: "/v1/health",
      trigger: "load",
      auth: "inherit",
      permission: "view",
      cacheSeconds: 30,
    },
  },
  options: {},
  templateLines: [
    '<Stack gap="sm">',
    '  <Group justify="space-between"><Text fw={700}>Homelab health</Text><RefreshButton /></Group>',
    "  {status.health?.loading ? <Skeleton h={64} /> : null}",
    '  {status.health?.ok === false ? <Alert color="red">Health data is unavailable.</Alert> : null}',
    '  {data.health ? <Stack><Text fw={700}>{data.health.status}</Text><Text>{data.health.openIncidents} incidents · {data.health.latencyMs} ms · {data.health.checkedAt}</Text>{(data.health.services ?? []).map(service => <Text key={service.id}>{service.name}: {service.status} · {service.latencyMs} ms</Text>)}</Stack> : <Text c="dimmed">No health data</Text>}',
    "</Stack>",
  ],
};

describe("Custom Widget assistant live evaluation harness", () => {
  it("exposes the complete documentation and authoring lifecycle", () => {
    expect(customWidgetAssistantEvaluationToolDefinitions.map(({ function: definition }) => definition.name)).toEqual(
      expect.arrayContaining([
        "customWidget_getSkill",
        "customWidget_schema",
        "customWidget_getComponentCatalog",
        "customWidget_validate",
        "customWidget_previewCreate",
        "customWidget_previewQuery",
        "customWidget_createFromPreview",
      ]),
    );
  });

  it("recovers a stalled model at the next required evidence checkpoint", () => {
    const state = createAssistantEvaluationState();
    expect(getAssistantEvaluationRecoveryToolName(state)).toBe("customWidget_getSkill");
    state.calledTools.push("customWidget_getSkill", "customWidget_schema", "customWidget_getComponentCatalog");
    expect(getAssistantEvaluationRecoveryToolName(state)).toBe("customWidget_validate");
  });

  it("rejects skipped evidence and persists the exact fixture-tested definition", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "fake-service-health");
    if (!testCase) throw new Error("Fake service-health case is missing");
    const state = createAssistantEvaluationState();

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: widget }),
    ).toEqual({ error: "Validate this exact complete definition before creating its preview." });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_schema", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_getComponentCatalog", {});
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_validate", { widget })).toMatchObject({
      valid: true,
      summary: { requestIds: ["health"] },
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: widget }),
    ).toMatchObject({
      success: true,
      previewSession: { id: "preview-1" },
      queries: [{ requestId: "health" }],
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Test every preview query before creation: health" });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "health",
        params: {},
      }),
    ).toMatchObject({ ok: true, status: 200, data: testCase.sampleResponse });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-fake-service-health" });
    expect(state.createdWidget).toMatchObject({ name: widget.name, template: widget.templateLines.join("\n") });
    expect(getAssistantEvaluationLifecycleIssues(state)).toEqual([]);
  });

  it("rejects excess parallel component lookups while keeping validation available", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "fake-service-health");
    if (!testCase) throw new Error("Fake service-health case is missing");
    const state = createAssistantEvaluationState();

    for (let index = 0; index < 8; index += 1) {
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: "Text" }),
      ).toMatchObject({ name: "Text" });
    }
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: "Stack" })).toEqual({
      error:
        "The targeted component-document budget is exhausted. Continue with validation using the documentation already loaded.",
    });
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_validate", { widget })).toMatchObject({
      valid: true,
    });
  });

  it("uses four targeted component documents after loading a complete example", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "fake-service-health");
    if (!testCase) throw new Error("Fake service-health case is missing");
    const state = createAssistantEvaluationState();
    executeAssistantEvaluationTool(testCase, state, "customWidget_getExample", { name: "service-dashboard" });

    for (let index = 0; index < 4; index += 1) {
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: "Text" }),
      ).toMatchObject({ name: "Text" });
    }
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: "Stack" })).toEqual({
      error:
        "The targeted component-document budget is exhausted. Continue with validation using the documentation already loaded.",
    });
  });

  it("rejects a late example without reducing the existing component-document budget", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "fake-service-health");
    if (!testCase) throw new Error("Fake service-health case is missing");
    const state = createAssistantEvaluationState();

    for (let index = 0; index < 8; index += 1) {
      executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: "Text" });
    }
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getExample", { name: "service-dashboard" }),
    ).toEqual({
      error:
        "An example must be loaded before component documentation. Keep the existing component-document budget and continue to customWidget_validate.",
    });
    expect(state.calledTools).not.toContain("customWidget_getExample");
    expect(state.calledTools.filter((name) => name === "customWidget_getComponent")).toHaveLength(8);
  });

  it("enforces explicit multi-iteration preview requests before persistence", () => {
    const baseCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "fake-service-health");
    if (!baseCase) throw new Error("Fake service-health case is missing");
    const testCase = { ...baseCase, minimumPreviewCycles: 2 };
    const state = createAssistantEvaluationState();

    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_schema", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_getComponentCatalog", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_validate", { widget });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: widget });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-1",
      requestId: "health",
      params: {},
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ error: expect.stringContaining("at least 2 validated preview-and-query cycles") });
    expect(getAssistantEvaluationRecoveryToolName(state, 2)).toBe("customWidget_validate");
  });

  it("routes multi-request fixtures and requires manual preview parameters", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "pokedex");
    if (!testCase) throw new Error("Pokédex case is missing");
    const detailRequest = {
      source: "default",
      kind: "query" as const,
      method: "GET" as const,
      path: "/api/v2/pokemon/{param:name}",
      trigger: "manual" as const,
      auth: "inherit" as const,
      permission: "view" as const,
    };

    expect(getAssistantEvaluationPreviewResponse(testCase, detailRequest)).toMatchObject({ name: "pikachu" });
    expect(getRequiredAssistantEvaluationRequestParams(detailRequest)).toEqual(["name"]);
  });
});

import { describe, expect, it } from "vitest";

import type { HttpIntegrationKind } from "@homarr/definitions";

import { CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES } from "../../scripts/ai-integration-evaluation-cases";
import {
  assessAssistantFinalResponse,
  createAssistantEvaluationState,
  executeAssistantEvaluationTool,
  getActiveAssistantEvaluationToolDefinitions,
  getAssistantEvaluationLifecycleIssues,
  getAssistantEvaluationPreviewResponse,
} from "../../scripts/ai-assistant-evaluation";
import {
  getCustomWidgetAiEvaluationSuite,
  resolveCustomWidgetAiEvaluationSuiteId,
} from "../../scripts/ai-evaluation-suites";
import { getDeterministicEvaluationIssues } from "../../scripts/ai-evaluation";
import type { CustomWidgetAiEvaluationCase } from "../../scripts/ai-evaluation-cases";
import type { HomarrCustomWidgetV2 } from "../core/custom-jsx-schema";

const getCase = (id: string) => {
  const testCase = CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.find((candidate) => candidate.id === id);
  if (!testCase) throw new Error(`Missing integration evaluation case '${id}'`);
  return testCase;
};

const makeIntegrationWidget = (kind: HttpIntegrationKind, integrationId: string): HomarrCustomWidgetV2 => ({
  $schema: "homarr-custom-widget-v2",
  name: "Integration fixture",
  sources: {
    default: {
      type: "integration",
      integrationKind: kind,
      integrationId,
    },
  },
  requests: {
    status: {
      source: "default",
      kind: "query",
      method: "GET",
      path: "/api/status",
      trigger: "load",
      auth: "inherit",
      permission: "view",
    },
  },
  options: {},
  template: "<Stack><Text>Ready</Text></Stack>",
});

const withoutUiExpectations = (testCase: CustomWidgetAiEvaluationCase): CustomWidgetAiEvaluationCase => {
  if (!testCase.expectations) throw new Error("Expected deterministic expectations");
  return {
    ...testCase,
    expectations: {
      ...testCase.expectations,
      minimumTemplateCharacters: undefined,
      requests: [],
      templateIncludes: undefined,
      templateIncludesAny: undefined,
      forbidUnexpectedRequests: false,
    },
  };
};

describe("Custom Widget integration benchmark", () => {
  it("keeps a separate stable 12-case suite with balanced fixed splits", () => {
    expect(CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.map(({ id }) => id)).toEqual([
      "dispatcharr-channel-lineup",
      "karakeep-recent-bookmarks",
      "mealie-todays-meals",
      "frigate-unreviewed-alerts",
      "dispatcharr-system-activity",
      "karakeep-library-pulse",
      "romm-library-overview",
      "frigate-review-and-health",
      "mealie-weekly-plan",
      "tubearchivist-archive-overview",
      "frigate-live-safety-fallback",
      "dispatcharr-now-playing-permission",
    ]);
    const splitCounts = Object.fromEntries(
      ["train", "dev", "heldout"].map((split) => [
        split,
        CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.filter((testCase) => testCase.split === split).length,
      ]),
    );
    expect(splitCounts).toEqual({ train: 4, dev: 4, heldout: 4 });
    expect(new Set(CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.map(({ id }) => id)).size).toBe(12);
  });

  it("resolves core by default and integrations only when explicitly selected", () => {
    expect(resolveCustomWidgetAiEvaluationSuiteId(undefined)).toBe("core");
    expect(resolveCustomWidgetAiEvaluationSuiteId("integrations")).toBe("integrations");
    expect(getCustomWidgetAiEvaluationSuite("integrations")).toBe(CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES);
    expect(() => resolveCustomWidgetAiEvaluationSuiteId("future")).toThrow("core, integrations");
  });

  it("uses researched HTTP sources for Dispatcharr and saved integration sources for native kinds", () => {
    const dispatcharrCases = CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.filter(({ id }) =>
      id.startsWith("dispatcharr-"),
    );
    expect(dispatcharrCases).toHaveLength(3);
    expect(dispatcharrCases.every((testCase) => testCase.research !== undefined)).toBe(true);
    expect(dispatcharrCases.every((testCase) => testCase.availableIntegrations === undefined)).toBe(true);
    expect(dispatcharrCases.every((testCase) => testCase.expectations?.sourceType !== "integration")).toBe(true);

    const nativeCases = CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.filter(
      (testCase) => testCase.expectations?.sourceType === "integration",
    );
    expect(nativeCases).toHaveLength(9);
    expect(
      nativeCases.every((testCase) => {
        const expectations = testCase.expectations;
        if (expectations?.sourceType !== "integration") return false;
        return testCase.availableIntegrations?.some(
          (integration) =>
            integration.id === expectations.sourceIntegrationId &&
            integration.kind === expectations.sourceIntegrationKind &&
            integration.supportsHttpRequests &&
            integration.permissions.hasFullAccess,
        );
      }),
    ).toBe(true);
  });

  it("accepts the discovered native integration and rejects wrong IDs and HTTP credential duplication", () => {
    const testCase = withoutUiExpectations(getCase("karakeep-recent-bookmarks"));
    expect(getDeterministicEvaluationIssues(testCase, makeIntegrationWidget("karakeep", "int-karakeep-main"))).toEqual(
      [],
    );
    expect(
      getDeterministicEvaluationIssues(testCase, makeIntegrationWidget("karakeep", "int-karakeep-wrong")),
    ).toContainEqual(expect.objectContaining({ path: ["sources", "default", "integrationId"] }));
    expect(
      getDeterministicEvaluationIssues(testCase, {
        ...makeIntegrationWidget("karakeep", "int-karakeep-main"),
        sources: {
          default: {
            baseUrl: "http://karakeep.local:3000",
            networkScope: "private",
            auth: "bearer",
          },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["sources", "default", "integrationKind"] }),
        expect.objectContaining({ path: ["sources", "default", "integrationId"] }),
      ]),
    );
  });

  it("exposes realistic integration discovery fixtures only for integration cases", () => {
    const nativeCase = getCase("mealie-todays-meals");
    const nativeState = createAssistantEvaluationState(true);
    expect(
      getActiveAssistantEvaluationToolDefinitions(nativeState).map(({ function: definition }) => definition.name),
    ).toEqual(expect.arrayContaining(["integration_getKinds", "integration_all"]));
    expect(executeAssistantEvaluationTool(nativeCase, nativeState, "integration_getKinds", {})).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "mealie", supportsHttpRequests: true })]),
    );
    expect(executeAssistantEvaluationTool(nativeCase, nativeState, "integration_all", {})).toEqual([
      expect.objectContaining({ id: "int-mealie-lab", permissions: expect.objectContaining({ hasFullAccess: false }) }),
      expect.objectContaining({ id: "int-mealie-main", permissions: expect.objectContaining({ hasFullAccess: true }) }),
    ]);

    const coreState = createAssistantEvaluationState();
    expect(
      getActiveAssistantEvaluationToolDefinitions(coreState).map(({ function: definition }) => definition.name),
    ).not.toEqual(expect.arrayContaining(["integration_getKinds", "integration_all"]));
  });

  it("requires native discovery and a concise non-lazy final handoff", () => {
    const testCase = getCase("frigate-live-safety-fallback");
    const state = createAssistantEvaluationState(true, testCase.placement);
    state.createdWidgets.push(makeIntegrationWidget("frigate", "int-frigate-main"));
    state.placementEvidence.push({ widgetId: "widget-1", boardId: "board-home", itemId: "item-1" });
    state.calledTools.push(
      "customWidget_getSkill",
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_createFromPreview",
      "integration_getKinds",
      "integration_all",
      "configure_widget",
      "board_addItem",
    );
    state.finalText = "Done.";
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual(
      expect.arrayContaining([
        "The assistant never called customWidget_previewQuery.",
        "The final response omitted 'created'.",
        "The final response omitted 'refresh'.",
        "The final response omitted 'live'.",
      ]),
    );
    state.calledTools.push("customWidget_previewQuery");
    state.finalText =
      "Created and saved Integration fixture on the Home dashboard with manual refresh. Authenticated live media is unavailable in this widget runtime, so no credential-bearing stream URL was generated.";
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    state.finalText = `Created ${"very ".repeat(200)}verbose refresh live handoff.`;
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toContainEqual(
      expect.stringContaining("characters; the limit is 600"),
    );
  });

  it("rejects lazy, dumped, multiline, and false-placement handoffs", () => {
    const widget = makeIntegrationWidget("frigate", "int-frigate-main");
    const assess = (text: string) =>
      assessAssistantFinalResponse({
        text,
        persistedWidgets: [widget],
        maxCharacters: 600,
        requiredTerms: ["refresh"],
      });
    expect(assess("Done.").passed).toBe(false);
    expect(assess('Created Integration fixture. {"requests":{}} Refresh is available.').issues).toContainEqual(
      expect.stringContaining("dumped implementation"),
    );
    expect(assess("Created Integration fixture with refresh.\n- Added details").issues).toContainEqual(
      expect.stringContaining("one short paragraph"),
    );
    expect(
      assess("Created Integration fixture with refresh and added it to your dashboard for daily use.").issues,
    ).toContainEqual(expect.stringContaining("without placement evidence"));
    expect(
      assessAssistantFinalResponse({
        text: "Created Integration fixture with refresh and placed it on the Home board for daily use.",
        persistedWidgets: [widget],
        maxCharacters: 600,
        requiredTerms: ["refresh"],
        placementEvidence: [{ widgetId: "widget-1", boardId: "board-home", itemId: "item-1" }],
      }).passed,
    ).toBe(true);
    expect(
      assess(
        "Created and saved Integration fixture with tested data and manual refresh. It is ready in Custom Widgets.",
      ).passed,
    ).toBe(true);
  });

  it("pins adversarial response envelopes and unsupported-media behavior", () => {
    const frigateSummary = getCase("frigate-review-and-health");
    const summaryRequest = {
      source: "default",
      kind: "query",
      method: "GET",
      path: "/api/review/summary",
      trigger: "load",
      auth: "inherit",
      permission: "view",
    } as const;
    expect(getAssistantEvaluationPreviewResponse(frigateSummary, summaryRequest)).toMatchObject({
      last24Hours: expect.any(Object),
    });
    expect(getAssistantEvaluationPreviewResponse(frigateSummary, summaryRequest)).not.toHaveProperty("root");

    const tubeCase = getCase("tubearchivist-archive-overview");
    expect(
      tubeCase.expectations?.requests.find(({ pathIncludes }) => pathIncludes === "/api/video/")?.queryIncludes,
    ).toEqual({
      sort: "downloaded",
      order: "desc",
    });
    expect(tubeCase.apiNotes).toContain("{data,paginate}");
    expect(tubeCase.apiNotes).toContain("do not add limit");

    const liveCase = getCase("frigate-live-safety-fallback");
    expect(liveCase.expectations?.requests).toEqual([
      expect.objectContaining({ method: "GET", pathIncludes: "/api/stats" }),
    ]);
    expect(liveCase.apiNotes).toContain("Never put JWT/API credentials in a media URL");
  });

  it("pins mixed casing and direct-array contracts that stale tutorials commonly get wrong", () => {
    const weekly = getCase("mealie-weekly-plan");
    expect(weekly.expectations?.requests[0]?.queryIncludes).toMatchObject({
      start_date: "2026-09-21",
      end_date: "2026-09-27",
      perPage: "20",
    });
    expect(weekly.expectations?.requests[0]?.requiredResponsePaths).toEqual(["items"]);

    const alerts = getCase("frigate-unreviewed-alerts");
    expect(Array.isArray(alerts.sampleResponse)).toBe(true);
    expect(alerts.apiNotes).toContain("direct array, not an envelope");

    const dispatcharr = getCase("dispatcharr-channel-lineup");
    expect(dispatcharr.expectations?.requests[0]?.queryIncludes).toMatchObject({ page_size: "12" });
    expect(dispatcharr.expectations?.requests[0]?.requiredResponsePaths).toEqual(["results"]);
  });
});

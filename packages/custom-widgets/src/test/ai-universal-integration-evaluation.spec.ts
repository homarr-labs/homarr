import { describe, expect, it } from "vitest";

import { httpIntegrationKinds, integrationDefs } from "@homarr/definitions/integration";

import {
  createAssistantEvaluationState,
  executeAssistantEvaluationTool,
  getAssistantEvaluationLifecycleIssues,
} from "../../scripts/ai-assistant-evaluation";
import { getCustomWidgetAiEvaluationSuite } from "../../scripts/ai-evaluation-suites";
import {
  CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS,
  CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES,
} from "../../scripts/ai-universal-integration-evaluation-cases";

describe("universal Custom Widget integration benchmark", () => {
  it("covers every and only reusable HTTP integration kind exactly once", () => {
    const contractKinds = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS.map(({ kind }) => kind).toSorted();
    expect(contractKinds).toEqual([...httpIntegrationKinds].toSorted());
    expect(new Set(contractKinds).size).toBe(httpIntegrationKinds.length);
    expect(CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES).toHaveLength(httpIntegrationKinds.length);
  });

  it("keeps services disjoint across stable balanced splits", () => {
    const splitCounts = Object.fromEntries(
      ["train", "dev", "heldout"].map((split) => [
        split,
        CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.filter((testCase) => testCase.split === split).length,
      ]),
    );
    expect(splitCounts).toEqual({ train: 14, dev: 14, heldout: 13 });
    expect(getCustomWidgetAiEvaluationSuite("integration-coverage")).toBe(
      CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES,
    );
  });

  it("adds realistic permission and wrong-kind noise around one exact reusable source", () => {
    for (const testCase of CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES) {
      const expectation = testCase.expectations;
      if (expectation?.sourceType !== "integration") throw new Error(`Missing source expectation for ${testCase.id}`);
      expect(testCase.availableIntegrations).toHaveLength(3);
      expect(testCase.availableIntegrations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expectation.sourceIntegrationId,
            kind: expectation.sourceIntegrationKind,
            permissions: expect.objectContaining({ hasFullAccess: true }),
          }),
          expect.objectContaining({
            kind: expectation.sourceIntegrationKind,
            permissions: expect.objectContaining({ hasFullAccess: false }),
          }),
        ]),
      );
      expect(
        testCase.availableIntegrations?.some(
          (integration) => integration.name.endsWith("Old") && integration.kind !== expectation.sourceIntegrationKind,
        ),
      ).toBe(true);
    }
  });

  it("requires every reusable integration case to bind and render verified response semantics", () => {
    for (const testCase of CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES) {
      const request = testCase.expectations?.requests[0];
      expect(request?.requiresResponseBinding, `${testCase.id} does not bind its response`).toBe(true);
      expect(
        Boolean(request?.requiredResponsePaths?.length) || Boolean(request?.requiredResponseMemberPaths?.length),
        `${testCase.id} has no verified response paths or members`,
      ).toBe(true);
    }
  });

  it("simulates the complete production kind catalog instead of revealing only the answer", () => {
    const testCase = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.find(
      ({ id }) => id === "universal-mealie",
    );
    if (!testCase) throw new Error("Mealie coverage case missing");
    const state = createAssistantEvaluationState(true);
    const kinds = executeAssistantEvaluationTool(testCase, state, "integration_getKinds", {});
    expect(kinds).toEqual(
      Object.entries(integrationDefs).map(([kind, definition]) => ({
        kind,
        name: definition.name,
        category: definition.category,
        requiredSecrets: definition.secretKinds,
        supportsHttpRequests: definition.supportsHttpRequests,
      })),
    );
    expect(kinds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "mealie", supportsHttpRequests: true }),
        expect.objectContaining({ kind: "autobrr", supportsHttpRequests: false }),
      ]),
    );
  });

  it("returns stale and irrelevant search distractors beside the first-party contract", () => {
    const testCase = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.find(({ id }) => id === "universal-stash");
    if (!testCase) throw new Error("Stash coverage case missing");
    const state = createAssistantEvaluationState(true);
    const output = executeAssistantEvaluationTool(testCase, state, "web_search", {
      query: "Stash official API documentation",
    });
    expect(output).toMatchObject({
      results: [
        { authority: "community" },
        { authority: "first-party", url: testCase.documentationUrl },
        { authority: "unknown" },
      ],
    });
  });

  it("rejects unfocused research queries before giving lifecycle credit", () => {
    const testCase = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.find(
      ({ id }) => id === "universal-prometheus",
    );
    if (!testCase) throw new Error("Prometheus coverage case missing");
    const state = createAssistantEvaluationState(true);
    executeAssistantEvaluationTool(testCase, state, "web_search", { query: "monitoring docs" });
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual(
      expect.arrayContaining([
        "The primary-documentation search omitted required term 'Prometheus'.",
        "The primary-documentation search omitted required term 'api'.",
      ]),
    );
  });
});

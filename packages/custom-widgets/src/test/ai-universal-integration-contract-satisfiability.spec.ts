import { describe, expect, it } from "vitest";

import type { HomarrCustomWidgetV2 } from "../core";
import { getDeterministicEvaluationIssues } from "../../scripts/ai-evaluation";
import {
  CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS,
  CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES,
} from "../../scripts/ai-universal-integration-evaluation-cases";

const responseExpression = (path: string) => ["data", "query", ...path.split(".")].join("?.");

const makeKnownGoodWidget = (
  testCase: (typeof CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES)[number],
  contract: (typeof CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS)[number],
): HomarrCustomWidgetV2 => {
  const expectations = testCase.expectations;
  if (expectations?.sourceType !== "integration") throw new Error(`Missing integration expectation for ${testCase.id}`);
  const responseRows = contract.responsePaths
    .map((path) => `<Text>{${responseExpression(path)} ?? "No data"}</Text>`)
    .join("");
  return {
    $schema: "homarr-custom-widget-v2",
    name: `${contract.kind} contract fixture`,
    description: "Deterministic benchmark satisfiability fixture",
    sources: {
      default: {
        type: "integration",
        integrationId: expectations.sourceIntegrationId,
        integrationKind: expectations.sourceIntegrationKind,
      },
    },
    requests: {
      query: {
        source: "default",
        kind: "query",
        method: contract.method ?? "GET",
        trigger: "load",
        auth: "inherit",
        permission: "view",
        path: contract.path,
        ...(contract.query ? { query: contract.query } : {}),
        ...(contract.body ? { body: contract.body } : {}),
      },
    },
    options: {},
    template: `<Stack><RefreshButton requestId="query" /><Text>{status.query?.loading ? "Loading" : "Ready"}</Text>${responseRows}<Text>No data</Text></Stack>`,
  };
};

describe("universal integration benchmark satisfiability", () => {
  it.each(
    CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.map(
      (testCase, index) => [testCase.id, testCase, CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS[index]] as const,
    ),
  )("accepts a known-good contract fixture for %s", (_id, testCase, contract) => {
    if (!contract) throw new Error(`Contract missing for ${testCase.id}`);
    const widget = makeKnownGoodWidget(testCase, contract);
    expect(getDeterministicEvaluationIssues(testCase, widget)).toEqual([]);
  });

  it.each(CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES)(
    "rejects wrong integration identity for $id",
    (testCase) => {
      const index = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.indexOf(testCase);
      const contract = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS[index];
      if (!contract) throw new Error(`Contract missing for ${testCase.id}`);
      const widget = makeKnownGoodWidget(testCase, contract);
      const source = widget.sources.default;
      if (!source || source.type !== "integration") throw new Error("Fixture source must be an integration");
      source.integrationId = "wrong-instance";
      expect(getDeterministicEvaluationIssues(testCase, widget)).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["sources", "default", "integrationId"] })]),
      );
    },
  );

  it.each(CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES)(
    "rejects a request routed through a decoy integration source for $id",
    (testCase) => {
      const index = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.indexOf(testCase);
      const contract = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS[index];
      const decoyContract =
        CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS[
          (index + 1) % CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS.length
        ];
      if (!contract || !decoyContract) throw new Error(`Contract missing for ${testCase.id}`);
      const widget = makeKnownGoodWidget(testCase, contract);
      widget.sources.decoy = {
        type: "integration",
        integrationId: `int-${decoyContract.kind}-production`,
        integrationKind: decoyContract.kind,
      };
      const request = widget.requests.query;
      if (!request) throw new Error("Fixture request is missing");
      request.source = "decoy";

      expect(getDeterministicEvaluationIssues(testCase, widget)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["requests", "query", "source"],
            message: expect.stringContaining("expected saved integration"),
          }),
        ]),
      );
    },
  );

  it.each(CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES)(
    "rejects an undocumented extra request for $id",
    (testCase) => {
      const index = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.indexOf(testCase);
      const contract = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS[index];
      if (!contract) throw new Error(`Contract missing for ${testCase.id}`);
      const widget = makeKnownGoodWidget(testCase, contract);
      widget.requests.undocumented = {
        source: "default",
        kind: "query",
        method: "GET",
        trigger: "load",
        auth: "inherit",
        permission: "view",
        path: "/invented/endpoint",
      };
      expect(getDeterministicEvaluationIssues(testCase, widget)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["requests", "undocumented"],
            message: expect.stringContaining("Remove undocumented request"),
          }),
        ]),
      );
    },
  );
});

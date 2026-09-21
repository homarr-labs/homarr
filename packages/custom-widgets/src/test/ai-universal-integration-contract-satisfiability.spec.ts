import { describe, expect, it } from "vitest";

import type { HomarrCustomWidgetV2 } from "../core";
import { customWidgetDefinitionSchema } from "../core";
import { getDeterministicEvaluationIssues } from "../../scripts/ai-evaluation";
import {
  CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS,
  CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES,
} from "../../scripts/ai-universal-integration-evaluation-cases";

const responseExpression = (path: string) =>
  path
    .split(".")
    .reduce(
      (expression, segment) =>
        /^[A-Za-z_$][\w$]*$/u.test(segment)
          ? `${expression}?.${segment}`
          : /^\d+$/u.test(segment)
            ? `${expression}?.[${segment}]`
            : `${expression}?.[${JSON.stringify(segment)}]`,
      "data?.query",
    );

const collectResponsePaths = (value: unknown, prefix: string[] = []): string[][] => {
  if (typeof value !== "object" || value === null) return [prefix];
  const entries = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(value);
  if (entries.length === 0) return [prefix];
  return [prefix, ...entries.flatMap(([key, entry]) => collectResponsePaths(entry, [...prefix, key]))];
};

const findResponseMemberPath = (response: unknown, memberPath: string) => {
  const expected = memberPath.split(".");
  return collectResponsePaths(response).find(
    (path) =>
      path.length >= expected.length &&
      expected.every((segment, index) => segment === path[path.length - expected.length + index]),
  );
};

const pathStartsWith = (path: readonly string[], prefix: readonly string[]) =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

const makeKnownGoodWidget = (
  testCase: (typeof CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES)[number],
  contract: (typeof CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS)[number],
): HomarrCustomWidgetV2 => {
  const expectations = testCase.expectations;
  if (expectations?.sourceType !== "integration") throw new Error(`Missing integration expectation for ${testCase.id}`);
  const responseRows = contract.responsePaths
    .map((path) => `<Text>${path}: {JSON.stringify(${responseExpression(path)} ?? null)}</Text>`)
    .join("");
  const memberPaths = (contract.responseMemberPaths ?? []).map((memberPath) => {
    const path = findResponseMemberPath(contract.response, memberPath);
    if (!path) throw new Error(`Fixture response for ${contract.kind} is missing ${memberPath}`);
    return { memberPath, path };
  });
  const dynamicRecordPaths = (contract.dynamicRecordPaths ?? []).map((path) => path.split(".").filter(Boolean));
  const dynamicMemberPaths = new Set<string>();
  const dynamicRows = dynamicRecordPaths
    .map((recordPath, recordIndex) => {
      const recordMembers = memberPaths.filter(
        ({ path }) => pathStartsWith(path, recordPath) && path.length > recordPath.length,
      );
      recordMembers.forEach(({ memberPath }) => dynamicMemberPaths.add(memberPath));
      const recordExpression = recordPath.length === 0 ? "data?.query" : responseExpression(recordPath.join("."));
      return `{Object.values(${recordExpression} ?? {}).map((item, index) => <Stack key={index}>${
        recordMembers.length > 0
          ? recordMembers
              .map(({ memberPath, path }) => {
                const dynamicPath = path.slice(recordPath.length + 1).join(".");
                const expression = dynamicPath
                  ? responseExpression(dynamicPath).replace("data?.query", "item")
                  : "item";
                return `<Text>${memberPath}: {JSON.stringify(${expression} ?? null)}</Text>`;
              })
              .join("")
          : `<Text>record ${recordIndex}: {JSON.stringify(item ?? null)}</Text>`
      }</Stack>)}`;
    })
    .join("");
  const memberRows = memberPaths
    .filter(({ memberPath }) => !dynamicMemberPaths.has(memberPath))
    .map(({ memberPath, path }) => {
      return `<Text>${memberPath}: {JSON.stringify(${responseExpression(path.join("."))} ?? null)}</Text>`;
    })
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
    template: `<Stack><RefreshButton requestId="query" />{status.query?.loading ? <Text>Loading</Text> : status.query?.ok === false ? <Alert color="red">Unable to load</Alert> : data.query == null ? <Text>No data</Text> : <Stack>${responseRows}${memberRows}${dynamicRows}</Stack>}</Stack>`,
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
    const parsed = customWidgetDefinitionSchema.parse(widget);
    expect(getDeterministicEvaluationIssues(testCase, parsed)).toEqual([]);
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

  it.each(
    CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES.flatMap((testCase, index) => {
      const contract = CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS[index];
      return contract?.dynamicRecordPaths ? [[testCase.id, testCase, contract] as const] : [];
    }),
  )("rejects fixture-key-specific rendering for %s", (_id, testCase, contract) => {
    const widget = makeKnownGoodWidget(testCase, contract);
    const recordPath = contract.dynamicRecordPaths?.[0]?.split(".").filter(Boolean) ?? [];
    const record = recordPath.reduce<unknown>((value, segment) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
      return (value as Record<string, unknown>)[segment];
    }, contract.response);
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      throw new Error(`Fixture response for ${contract.kind} has no dynamic record`);
    }
    const fixtureKey = Object.keys(record)[0];
    if (!fixtureKey) throw new Error(`Fixture response for ${contract.kind} has no dynamic key`);
    const recordAccess = recordPath.map((segment) => `?.[${JSON.stringify(segment)}]`).join("");
    const staticPath = [...recordPath, fixtureKey].map((segment) => `?.[${JSON.stringify(segment)}]`).join("");
    widget.template = `<Stack><RefreshButton requestId="query" />{status.query?.loading ? <Text>Loading</Text> : status.query?.ok === false ? <Alert color="red">Unable to load</Alert> : Object.values(data.query${recordAccess} ?? {}).map((_item, index) => <Text key={index}>{JSON.stringify(data.query${staticPath} ?? null)}</Text>)}</Stack>`;
    expect(getDeterministicEvaluationIssues(testCase, widget)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("dynamically keyed data.query") }),
      ]),
    );
  });

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

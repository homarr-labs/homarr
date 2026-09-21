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

const collectFixturePaths = (value: unknown, prefix: string[] = []): string[][] => {
  if (typeof value !== "object" || value === null) return [prefix];
  const entries = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(value);
  if (entries.length === 0) return [prefix];
  return [prefix, ...entries.flatMap(([key, entry]) => collectFixturePaths(entry, [...prefix, key]))];
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
  it("keeps a separate stable 15-case suite with balanced fixed splits", () => {
    expect(CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.map(({ id }) => id)).toEqual([
      "dispatcharr-channel-lineup",
      "karakeep-recent-bookmarks",
      "mealie-todays-meals",
      "frigate-unreviewed-alerts",
      "romm-platform-missing-inventory",
      "dispatcharr-system-activity",
      "karakeep-library-pulse",
      "romm-library-overview",
      "frigate-review-and-health",
      "tubearchivist-channel-queue-health",
      "mealie-weekly-plan",
      "tubearchivist-archive-overview",
      "frigate-live-safety-fallback",
      "dispatcharr-now-playing-permission",
      "dispatcharr-auth-recovery",
    ]);
    const splitCounts = Object.fromEntries(
      ["train", "dev", "heldout"].map((split) => [
        split,
        CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.filter((testCase) => testCase.split === split).length,
      ]),
    );
    expect(splitCounts).toEqual({ train: 5, dev: 5, heldout: 5 });
    expect(new Set(CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.map(({ id }) => id)).size).toBe(15);
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
    expect(dispatcharrCases).toHaveLength(4);
    expect(dispatcharrCases.every((testCase) => testCase.research !== undefined)).toBe(true);
    expect(dispatcharrCases.every((testCase) => testCase.availableIntegrations === undefined)).toBe(true);
    expect(dispatcharrCases.every((testCase) => testCase.expectations?.sourceType !== "integration")).toBe(true);

    const nativeCases = CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.filter(
      (testCase) => testCase.expectations?.sourceType === "integration",
    );
    expect(nativeCases).toHaveLength(11);
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

  it("forces exact-name full-access selection through same-kind integration noise", () => {
    const noisyCases = [
      ["karakeep-recent-bookmarks", "Karakeep"],
      ["romm-platform-missing-inventory", "RomM"],
      ["tubearchivist-channel-queue-health", "TubeArchivist"],
      ["frigate-unreviewed-alerts", "Frigate"],
    ] as const;

    for (const [caseId, targetName] of noisyCases) {
      const testCase = getCase(caseId);
      const expectations = testCase.expectations;
      if (expectations?.sourceType !== "integration") throw new Error(`${caseId} must use an integration source`);
      const sameKind =
        testCase.availableIntegrations?.filter(
          (integration) => integration.kind === expectations.sourceIntegrationKind,
        ) ?? [];

      expect(sameKind.length, caseId).toBeGreaterThanOrEqual(3);
      expect(
        sameKind
          .filter((integration) => integration.name === targetName && integration.permissions.hasFullAccess)
          .map(({ id }) => id),
        caseId,
      ).toEqual([expectations.sourceIntegrationId]);
      expect(
        sameKind.some((integration) => integration.name === targetName && !integration.permissions.hasFullAccess),
        caseId,
      ).toBe(true);
      expect(
        sameKind.some((integration) => integration.name !== targetName && integration.permissions.hasFullAccess),
        caseId,
      ).toBe(true);
    }
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
    const request = makeIntegrationWidget("karakeep", "int-karakeep-main").requests.status;
    if (!request) throw new Error("Integration fixture request is missing");
    expect(
      getDeterministicEvaluationIssues(testCase, {
        ...makeIntegrationWidget("karakeep", "int-karakeep-main"),
        requests: {
          status: { ...request, query: { filter: "token=plaintext" } },
        },
      }),
    ).toContainEqual(expect.objectContaining({ path: ["requests", "status"] }));
    expect(
      getDeterministicEvaluationIssues(testCase, {
        ...makeIntegrationWidget("karakeep", "int-karakeep-main"),
        requests: {
          status: { ...request, body: { api_key: "plaintext" } },
        },
      }),
    ).toContainEqual(expect.objectContaining({ path: ["requests", "status"] }));
  });

  it("exposes realistic integration discovery fixtures only for integration cases", () => {
    const nativeCase = getCase("mealie-todays-meals");
    const nativeState = createAssistantEvaluationState(true);
    executeAssistantEvaluationTool(nativeCase, nativeState, "customWidget_getSkill", {});
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

  it("requires native discovery and a truthful Frigate live limitation handoff", () => {
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
        "The final response omitted 'live media'.",
        "The final response omitted 'unavailable'.",
        "The final response omitted 'credential'.",
      ]),
    );
    state.calledTools.push("customWidget_previewQuery");
    state.finalText =
      "Created and saved Integration fixture on the Home dashboard with manual refresh. Live media is available with safely embedded credentials.";
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toContain(
      "The final response omitted 'unavailable'.",
    );
    state.finalText =
      "Created and saved Integration fixture on the Home dashboard; it shows camera status with manual refresh. Authenticated live media is unavailable in this widget runtime, so no credential-bearing stream URL was generated.";
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    state.finalText =
      "Created and saved Integration fixture on the Home dashboard with manual refresh. Live media is unavailable through the credential-safe widget runtime, but live camera is available.";
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toContain(
      "The final response made the forbidden claim 'live camera is available'.",
    );
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
        text: "Created Integration fixture, which shows Frigate review alerts with refresh, and placed it on the Home board for daily use.",
        persistedWidgets: [widget],
        maxCharacters: 600,
        requiredTerms: ["refresh"],
        placementEvidence: [{ widgetId: "widget-1", boardId: "board-home", itemId: "item-1" }],
      }).passed,
    ).toBe(true);
    expect(
      assess(
        "Created and saved Integration fixture, which shows tested data with manual refresh. It is ready in Custom Widgets.",
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
    expect(
      tubeCase.expectations?.requests.find(({ pathIncludes }) => pathIncludes === "/api/video/")?.queryExcludes,
    ).toEqual(["limit"]);
    expect(tubeCase.apiNotes).toContain("{data,paginate}");
    expect(tubeCase.apiNotes).toContain("do not add limit");

    const liveCase = getCase("frigate-live-safety-fallback");
    expect(liveCase.expectations?.requests).toEqual([
      expect.objectContaining({ method: "GET", pathIncludes: "/api/stats" }),
    ]);
    expect(liveCase.apiNotes).toContain("Never put JWT/API credentials in a media URL");
  });

  it("rejects protected media renderers and opts recoverable multi-request cases into independent status handling", () => {
    const protectedMediaCaseIds = [
      "frigate-unreviewed-alerts",
      "romm-platform-missing-inventory",
      "romm-library-overview",
      "tubearchivist-channel-queue-health",
      "tubearchivist-archive-overview",
      "frigate-live-safety-fallback",
    ] as const;
    const protectedMediaComponents = ["Image", "Avatar", "BackgroundImage"] as const;

    for (const caseId of protectedMediaCaseIds) {
      const testCase = getCase(caseId);
      const expectations = testCase.expectations;
      if (expectations?.sourceType !== "integration") throw new Error(`${caseId} must use an integration source`);
      expect(expectations.forbiddenTemplateComponents, caseId).toEqual(
        expect.arrayContaining([...protectedMediaComponents]),
      );

      for (const component of protectedMediaComponents) {
        const widget = makeIntegrationWidget(expectations.sourceIntegrationKind, expectations.sourceIntegrationId);
        widget.template = `<${component} src="/protected-media" />`;
        expect(
          getDeterministicEvaluationIssues(withoutUiExpectations(testCase), widget),
          `${caseId} ${component}`,
        ).toContainEqual({
          path: ["template"],
          message: `Remove forbidden ${component} usage from this protected-media widget.`,
        });
      }
    }

    for (const caseId of [
      "dispatcharr-system-activity",
      "karakeep-library-pulse",
      "romm-library-overview",
      "frigate-review-and-health",
      "tubearchivist-channel-queue-health",
      "tubearchivist-archive-overview",
      "dispatcharr-auth-recovery",
    ]) {
      expect(getCase(caseId).expectations?.requiresIndependentStatusHandling, caseId).toBe(true);
    }
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
    expect(dispatcharr.expectations?.requests[0]?.requiredResponseMemberPaths).toEqual(
      expect.arrayContaining(["name", "channel_number", "effective_name", "effective_channel_number"]),
    );
    expect(dispatcharr.expectations?.requests[0]?.requiredNullableResponseMemberPaths).toEqual([
      "effective_name",
      "effective_channel_number",
    ]);
    expect(dispatcharr.previewResponses?.[0]?.response).toMatchObject({
      results: [{}, { name: "News Backup", effective_name: null, effective_channel_number: null }],
    });
  });

  it("grades nullable service fields against member-specific fallbacks", () => {
    const requiredNullablePaths = new Map([
      ["karakeep-recent-bookmarks", ["summary", "content.title"]],
      ["mealie-todays-meals", ["recipe.name"]],
      ["frigate-unreviewed-alerts", ["end_time"]],
      ["romm-platform-missing-inventory", ["name", "summary", "metadatum.first_release_date", "total"]],
      ["karakeep-library-pulse", ["summary", "content.title"]],
      ["romm-library-overview", ["name", "total"]],
      ["tubearchivist-channel-queue-health", ["active_true", "ignore", "published", "timestamp"]],
      ["mealie-weekly-plan", ["recipe.name"]],
      ["tubearchivist-archive-overview", ["type_shorts", "channel.channel_name"]],
      ["dispatcharr-auth-recovery", ["name", "effective_channel_number"]],
    ] as const);

    for (const [caseId, expectedPaths] of requiredNullablePaths) {
      const actualPaths = (getCase(caseId).expectations?.requests ?? []).flatMap(
        ({ requiredNullableResponseMemberPaths }) => requiredNullableResponseMemberPaths ?? [],
      );
      expect(actualPaths, caseId).toEqual(expect.arrayContaining([...expectedPaths]));
    }
  });

  it("pins platform-scoped missing ROM pagination, nullable totals, and optional metadata", () => {
    const testCase = getCase("romm-platform-missing-inventory");
    const request = testCase.expectations?.requests[0];
    expect(request?.queryIncludes).toEqual({
      platform_ids: "7",
      missing: "true",
      limit: "8",
      offset: "0",
      order_by: "created_at",
      order_dir: "desc",
      with_char_index: "false",
      with_filter_values: "false",
      with_rom_id_index: "false",
      with_total: "false",
    });
    expect(request?.requiredResponsePaths).toEqual(["items", "total", "limit", "offset"]);
    expect(request?.requiredResponseMemberPaths).toEqual(
      expect.arrayContaining([
        "name",
        "fs_name_no_ext",
        "missing_from_fs",
        "metadatum.first_release_date",
        "metadatum.average_rating",
      ]),
    );
    expect(testCase.previewResponses?.[0]?.response).toMatchObject({ total: null, limit: 8, offset: 0 });
    expect(testCase.expectations?.forbiddenTemplateComponents).toContain("Image");
    expect(testCase.expectations?.templateExcludes).toEqual(
      expect.arrayContaining(["path_cover_small", "merged_screenshots", "screenshot_path", "path_video"]),
    );
  });

  it("pins TubeArchivist channel and queue health envelopes without authenticated thumbnails", () => {
    const testCase = getCase("tubearchivist-channel-queue-health");
    expect(testCase.expectations?.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pathIncludes: "/api/stats/channel/" }),
        expect.objectContaining({ pathIncludes: "/api/stats/download/" }),
        expect.objectContaining({
          pathIncludes: "/api/download/",
          queryIncludes: { filter: "pending", page: "0" },
          requiredResponsePaths: ["data", "paginate"],
        }),
      ]),
    );
    const queueResponse = testCase.previewResponses?.find(
      ({ pathIncludes }) => pathIncludes === "/api/download/",
    )?.response;
    expect(queueResponse).toMatchObject({
      paginate: expect.objectContaining({ current_page: 0, total_hits: 13 }),
    });
    expect(queueResponse).toHaveProperty(
      "data",
      expect.arrayContaining([
        expect.objectContaining({ published: expect.anything(), channel_name: "Homelab Notes" }),
      ]),
    );
    expect(testCase.expectations?.templateExcludes).toContain("vid_thumb_url");
    expect(testCase.expectations?.forbiddenTemplateComponents).toContain("Image");
  });

  it("requires researched Dispatcharr header recovery and rejects plaintext credential patterns", () => {
    const testCase = getCase("dispatcharr-auth-recovery");
    expect(testCase.research).toMatchObject({
      requiredQueryTerms: ["dispatcharr", "swagger", "authentication"],
      forbiddenQueryTerms: ["reddit", "youtube"],
    });
    expect(testCase.research?.searchResults?.every(({ authority }) => authority === "first-party")).toBe(true);
    expect(testCase.expectations).toMatchObject({
      sourceBaseUrl: "http://dispatcharr.local",
      sourceNetworkScope: "private",
      sourceAuth: "apiKeyHeader",
      sourceAuthName: "X-API-Key",
    });
    expect(testCase.expectations?.templateExcludes).toEqual(
      expect.arrayContaining(["Authorization", "Basic ", "Bearer ", "username=", "password=", "token="]),
    );
  });

  it("requires each Dispatcharr research query to name the concrete contract being investigated", () => {
    const requiredTermsByCase = {
      "dispatcharr-channel-lineup": ["dispatcharr", "swagger", "channels", "pagination", "authentication"],
      "dispatcharr-system-activity": ["dispatcharr", "version", "system events", "admin", "swagger"],
      "dispatcharr-now-playing-permission": ["dispatcharr", "channels", "current programs", "post", "admin"],
      "dispatcharr-auth-recovery": ["dispatcharr", "swagger", "authentication"],
    } as const;

    for (const [caseId, requiredTerms] of Object.entries(requiredTermsByCase)) {
      const testCase = getCase(caseId);
      expect(testCase.research?.requiredQueryTerms, caseId).toEqual(requiredTerms);

      const state = createAssistantEvaluationState(true);
      executeAssistantEvaluationTool(testCase, state, "web_search", { query: "Dispatcharr documentation" });
      expect(getAssistantEvaluationLifecycleIssues(testCase, state), caseId).toEqual(
        expect.arrayContaining(
          requiredTerms
            .filter((term) => term !== "dispatcharr")
            .map((term) => `The primary-documentation search omitted required term '${term}'.`),
        ),
      );
    }
  });

  it("uses explicit frozen first-party results for every Dispatcharr research contract", () => {
    const dispatcharrCases = CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.filter(({ id }) =>
      id.startsWith("dispatcharr-"),
    );

    for (const testCase of dispatcharrCases) {
      expect(testCase.research?.requiresFrozenSearchResults, testCase.id).toBe(true);
      expect(testCase.research?.searchResults?.length, testCase.id).toBeGreaterThan(0);
      expect(
        testCase.research?.searchResults?.every(
          ({ authority, content }) => authority === "first-party" && content !== testCase.apiNotes,
        ),
        testCase.id,
      ).toBe(true);
    }
  });

  it("never substitutes apiNotes when a research contract requires frozen lookup evidence", () => {
    const testCase = getCase("dispatcharr-channel-lineup");
    if (!testCase.research) throw new Error("Dispatcharr lineup research fixture is missing");
    const missingFrozenResults: CustomWidgetAiEvaluationCase = {
      ...testCase,
      research: { ...testCase.research, searchResults: undefined },
    };

    expect(() =>
      executeAssistantEvaluationTool(missingFrozenResults, createAssistantEvaluationState(true), "web_search", {
        query: missingFrozenResults.research?.query,
      }),
    ).toThrow("requires frozen first-party search results");
  });

  it("requires Frigate dynamic records, aggregate metrics, service metrics, and reviewed state", () => {
    const healthCase = getCase("frigate-review-and-health");
    const healthExpectations = healthCase.expectations;
    const summaryExpectation = healthExpectations?.requests.find(
      ({ pathIncludes }) => pathIncludes === "/api/review/summary",
    );
    const statsExpectation = healthExpectations?.requests.find(({ pathIncludes }) => pathIncludes === "/api/stats");
    if (healthExpectations?.sourceType !== "integration" || !summaryExpectation || !statsExpectation) {
      throw new Error("Frigate health expectations are missing");
    }
    expect(summaryExpectation.requiredBinaryResponseDerivations).toEqual([
      {
        operator: "-",
        leftPath: "last24Hours.total_alert",
        rightPath: "last24Hours.reviewed_alert",
      },
      {
        operator: "-",
        leftPath: "last24Hours.total_detection",
        rightPath: "last24Hours.reviewed_detection",
      },
    ]);
    expect(statsExpectation.requiredDynamicResponseRecordPaths).toEqual(["cameras", "detectors", "service.storage"]);
    expect(statsExpectation.requiredResponsePaths).toEqual(
      expect.arrayContaining(["service.uptime", "service.version", "camera_fps"]),
    );

    const scopedHealthCase: CustomWidgetAiEvaluationCase = {
      ...healthCase,
      expectations: {
        ...healthExpectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: statsExpectation.kind,
            method: statsExpectation.method,
            pathIncludes: statsExpectation.pathIncludes,
            requiredDynamicResponseRecordPaths: statsExpectation.requiredDynamicResponseRecordPaths,
            requiredResponseMemberPaths: ["connection_quality", "inference_speed", "used"],
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const keyedFixtureWidget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("frigate", "int-frigate-main"),
      requests: {
        stats: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/stats",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
      template:
        '<Stack>{Object.values(data.stats.cameras ?? {}).map((_camera, index) => <Text key={index}>{data.stats.cameras.driveway.connection_quality}</Text>)}{Object.values(data.stats.detectors ?? {}).map((_detector, index) => <Text key={index}>{data.stats.detectors.coral.inference_speed}</Text>)}{Object.values(data.stats.service?.storage ?? {}).map((_storage, index) => <Text key={index}>{data.stats.service.storage["/media/frigate/recordings"].used}</Text>)}</Stack>',
    };
    expect(getDeterministicEvaluationIssues(scopedHealthCase, keyedFixtureWidget)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("dynamically keyed data.stats.cameras") }),
        expect.objectContaining({ message: expect.stringContaining("dynamically keyed data.stats.detectors") }),
        expect.objectContaining({ message: expect.stringContaining("dynamically keyed data.stats.service.storage") }),
      ]),
    );
    expect(
      getDeterministicEvaluationIssues(scopedHealthCase, {
        ...keyedFixtureWidget,
        template:
          "<Stack>{Object.values(data.stats.cameras ?? {}).map(({ connection_quality }, index) => <Text key={index}>{connection_quality}</Text>)}{Object.entries(data.stats.detectors ?? {}).map(([name, { inference_speed }]) => <Text key={name}>{inference_speed}</Text>)}{Object.entries(data.stats.service?.storage ?? {}).map(([path, { used }]) => <Text key={path}>{used}</Text>)}</Stack>",
      }),
    ).toEqual([]);

    const scopedSummaryCase: CustomWidgetAiEvaluationCase = {
      ...healthCase,
      expectations: {
        ...healthExpectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: summaryExpectation.kind,
            method: summaryExpectation.method,
            pathIncludes: summaryExpectation.pathIncludes,
            requiredBinaryResponseDerivations: summaryExpectation.requiredBinaryResponseDerivations,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const summaryWidget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("frigate", "int-frigate-main"),
      requests: {
        review: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/review/summary",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
      template:
        "<Stack><Text>{data.review?.last24Hours?.total_alert - data.review?.last24Hours?.reviewed_alert}</Text><Text>{data.review?.last24Hours?.total_detection - data.review?.last24Hours?.reviewed_detection}</Text></Stack>",
    };
    expect(getDeterministicEvaluationIssues(scopedSummaryCase, summaryWidget)).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(scopedSummaryCase, {
        ...summaryWidget,
        template:
          "<Stack><Text>{(data.review?.last24Hours?.total_alert ?? 0) - (data.review?.last24Hours?.reviewed_alert ?? 0)}</Text><Text>{(data.review?.last24Hours?.total_detection ?? 0) - (data.review?.last24Hours?.reviewed_detection ?? 0)}</Text></Stack>",
      }),
    ).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(scopedSummaryCase, {
        ...summaryWidget,
        template:
          "<Stack><Text>{Math.max(0, (data.review?.last24Hours?.total_alert ?? 0) - (data.review?.last24Hours?.reviewed_alert ?? 0))}</Text><Text>{Math.max(0, (data.review?.last24Hours?.total_detection ?? 0) - (data.review?.last24Hours?.reviewed_detection ?? 0))}</Text></Stack>",
      }),
    ).toEqual([]);
    for (const template of [
      "<Stack><Text>total_alert - reviewed_alert</Text><Text>total_detection - reviewed_detection</Text><Text>{data.review?.last24Hours?.total_alert} {data.review?.last24Hours?.reviewed_alert} {data.review?.last24Hours?.total_detection} {data.review?.last24Hours?.reviewed_detection}</Text></Stack>",
      "<Stack><Text>{data.review?.last24Hours?.total_alert + data.review?.last24Hours?.reviewed_alert}</Text><Text>{data.review?.last24Hours?.total_detection + data.review?.last24Hours?.reviewed_detection}</Text></Stack>",
      "<Stack><Text>{data.review?.decoy?.last24Hours?.total_alert - data.review?.decoy?.last24Hours?.reviewed_alert}</Text><Text>{data.review?.decoy?.last24Hours?.total_detection - data.review?.decoy?.last24Hours?.reviewed_detection}</Text></Stack>",
    ]) {
      expect(getDeterministicEvaluationIssues(scopedSummaryCase, { ...summaryWidget, template })).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("Derive last24Hours.total_alert") }),
      );
    }

    const liveCase = getCase("frigate-live-safety-fallback");
    const liveStats = liveCase.expectations?.requests.find(({ pathIncludes }) => pathIncludes === "/api/stats");
    expect(liveStats?.requiredDynamicResponseRecordPaths).toEqual(["cameras"]);
    expect(liveStats?.requiredResponsePaths).toEqual(expect.arrayContaining(["cameras", "camera_fps"]));

    const alertsCase = getCase("frigate-unreviewed-alerts");
    const alertExpectation = alertsCase.expectations?.requests[0];
    expect(alertExpectation?.requiredResponseMemberPaths).toContain("has_been_reviewed");
    expect(alertsCase.expectations?.templateIncludes).toContain("has_been_reviewed");
    if (alertsCase.expectations?.sourceType !== "integration" || !alertExpectation) {
      throw new Error("Frigate alert expectations are missing");
    }
    const scopedAlertsCase: CustomWidgetAiEvaluationCase = {
      ...alertsCase,
      expectations: {
        ...alertsCase.expectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: alertExpectation.kind,
            method: alertExpectation.method,
            pathIncludes: alertExpectation.pathIncludes,
            requiredResponseMemberPaths: ["has_been_reviewed"],
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        templateExcludes: undefined,
        forbiddenTemplateComponents: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const staticReviewedStateWidget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("frigate", "int-frigate-main"),
      requests: {
        alerts: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/review",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
      template:
        "<Stack><Text>has_been_reviewed: Unreviewed</Text>{(data.alerts ?? []).map((alert) => <Text>{alert.camera}</Text>)}</Stack>",
    };
    expect(getDeterministicEvaluationIssues(scopedAlertsCase, staticReviewedStateWidget)).toContainEqual(
      expect.objectContaining({
        message: "Render the verified response member has_been_reviewed through a real JSX member access.",
      }),
    );
    expect(
      getDeterministicEvaluationIssues(scopedAlertsCase, {
        ...staticReviewedStateWidget,
        template:
          "<Stack>{(data.alerts ?? []).map((alert) => <Text key={data.alerts?.[0]?.has_been_reviewed}>{alert.camera}</Text>)}</Stack>",
      }),
    ).toContainEqual(
      expect.objectContaining({
        message: "Render the verified response member has_been_reviewed through a real JSX member access.",
      }),
    );
  });

  it("requires a visible Frigate 24-hour filter and rejects static fallback labels", () => {
    const testCase = getCase("frigate-unreviewed-alerts");
    const expectation = testCase.expectations?.requests[0];
    if (!expectation || testCase.expectations?.sourceType !== "integration") {
      throw new Error("Frigate alert expectations are missing");
    }
    expect(expectation.requiredResponseTimeWindows).toEqual([{ memberPath: "start_time", maxAgeSeconds: 86_400 }]);
    expect(testCase.sampleResponse).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: expect.stringContaining("stale") })]),
    );
    const scopedCase: CustomWidgetAiEvaluationCase = {
      ...testCase,
      expectations: {
        ...testCase.expectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: expectation.kind,
            method: expectation.method,
            pathIncludes: expectation.pathIncludes,
            requiredResponseTimeWindows: expectation.requiredResponseTimeWindows,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const widget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("frigate", "int-frigate-main"),
      requests: {
        alerts: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/review",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
      template:
        "<Stack>{(data.alerts ?? []).filter((alert) => alert.start_time >= Math.floor(Date.now() / 1000) - 86400).map((alert) => <Text>{alert.camera}</Text>)}</Stack>",
    };
    expect(getDeterministicEvaluationIssues(scopedCase, widget)).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template: "<Stack>{(data.alerts ?? []).map((alert) => <Text>{alert.camera}</Text>)}</Stack>",
      }),
    ).toContainEqual(expect.objectContaining({ message: expect.stringContaining("last 86400 seconds") }));
  });

  it("binds required empty states to the matched response collection", () => {
    expect(getCase("dispatcharr-channel-lineup").expectations?.requests[0]?.requiredEmptyState).toEqual({
      responsePath: "results",
      textAnyOf: ["No channels", "No channel", "Nothing here"],
    });
    expect(getCase("dispatcharr-auth-recovery").expectations?.requests[1]?.requiredEmptyState).toEqual({
      responsePath: "results",
      textAnyOf: ["No channels", "Nothing returned", "Empty lineup"],
    });
    expect(getCase("mealie-weekly-plan").expectations?.requests[0]?.requiredEmptyState).toEqual({
      responsePath: "items",
      textAnyOf: ["No meals", "Nothing planned", "Empty week"],
    });

    const testCase = getCase("mealie-todays-meals");
    const expectations = testCase.expectations;
    const mealsExpectation = expectations?.requests[0];
    if (expectations?.sourceType !== "integration" || !mealsExpectation?.requiredEmptyState) {
      throw new Error("Mealie empty-state expectations are missing");
    }
    expect(mealsExpectation.requiredEmptyState).toEqual({
      responsePath: "$",
      textAnyOf: ["No meals", "Nothing planned", "Plan is empty"],
    });
    const scopedCase: CustomWidgetAiEvaluationCase = {
      ...testCase,
      expectations: {
        ...expectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: mealsExpectation.kind,
            method: mealsExpectation.method,
            pathIncludes: mealsExpectation.pathIncludes,
            requiredEmptyState: mealsExpectation.requiredEmptyState,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const widget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("mealie", "int-mealie-main"),
      requests: {
        meals: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/households/mealplans/today",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
        decoy: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/households/mealplans/decoy",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
    };
    for (const template of [
      "<Stack>{data.meals?.length === 0 ? <Text>No meals</Text> : <Text>Meal plan</Text>}</Stack>",
      "<Stack>{!data.meals?.length && <Text>Nothing planned</Text>}</Stack>",
      "<Stack>{data.meals?.length ? <Text>Meal plan</Text> : <Text>Plan is empty</Text>}</Stack>",
    ]) {
      expect(getDeterministicEvaluationIssues(scopedCase, { ...widget, template })).toEqual([]);
    }
    for (const template of [
      "<Stack><Text>No meals</Text><Text>{data.meals?.length}</Text></Stack>",
      "<Stack>{!data.decoy?.length && <Text>No meals</Text>}</Stack>",
      "<Stack>{data.meals?.length === 0 ? <Text>Nothing available</Text> : <Text>Meal plan</Text>}<Text>No meals</Text></Stack>",
    ]) {
      expect(getDeterministicEvaluationIssues(scopedCase, { ...widget, template })).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("empty state") }),
      );
    }
  });

  it("requires Karakeep content fields inside their discriminated variant branches", () => {
    const recentCase = getCase("karakeep-recent-bookmarks");
    const expectations = recentCase.expectations;
    const bookmarksExpectation = expectations?.requests[0];
    if (expectations?.sourceType !== "integration" || !bookmarksExpectation?.requiredDiscriminatedUnions) {
      throw new Error("Karakeep union expectations are missing");
    }
    expect(getCase("karakeep-library-pulse").expectations?.requests[1]?.requiredDiscriminatedUnions).toEqual(
      bookmarksExpectation.requiredDiscriminatedUnions,
    );
    const scopedCase: CustomWidgetAiEvaluationCase = {
      ...recentCase,
      expectations: {
        ...expectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: bookmarksExpectation.kind,
            method: bookmarksExpectation.method,
            pathIncludes: bookmarksExpectation.pathIncludes,
            requiredDiscriminatedUnions: bookmarksExpectation.requiredDiscriminatedUnions,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const widget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("karakeep", "int-karakeep-main"),
      requests: {
        bookmarks: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/v1/bookmarks",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
      template:
        '<Stack>{(data.bookmarks?.bookmarks ?? []).map(bookmark => bookmark.content?.type === "link" ? <Text>{bookmark.content.url} {bookmark.content.title}</Text> : bookmark.content?.type === "text" ? <Text>{bookmark.content.text} {bookmark.content.sourceUrl}</Text> : bookmark.content?.type === "asset" ? <Text>{bookmark.content.assetType} {bookmark.content.assetId}</Text> : <Text>Unknown bookmark</Text>)}</Stack>',
    };
    expect(getDeterministicEvaluationIssues(scopedCase, widget)).toEqual([]);

    for (const template of [
      "<Stack><Text>link text asset unknown Unknown bookmark</Text>{(data.bookmarks?.bookmarks ?? []).map(bookmark => <Text>{bookmark.content.url} {bookmark.content.title} {bookmark.content.text} {bookmark.content.sourceUrl} {bookmark.content.assetType} {bookmark.content.assetId}</Text>)}</Stack>",
      '<Stack>{(data.bookmarks?.bookmarks ?? []).map(bookmark => bookmark.content?.type === "link" ? <Text>{bookmark.content.text} {bookmark.content.sourceUrl}</Text> : bookmark.content?.type === "text" ? <Text>{bookmark.content.url} {bookmark.content.title}</Text> : bookmark.content?.type === "asset" ? <Text>{bookmark.content.assetType} {bookmark.content.assetId}</Text> : <Text>Unknown bookmark</Text>)}</Stack>',
      '<Stack>{(data.bookmarks?.bookmarks ?? []).map(bookmark => bookmark.content?.type === "link" ? <Text>{bookmark.content.url} {bookmark.content.title}</Text> : bookmark.content?.type === "text" ? <Text>{bookmark.content.text} {bookmark.content.sourceUrl}</Text> : bookmark.content?.type === "asset" ? <Text>{bookmark.content.assetType} {bookmark.content.assetId}</Text> : null)}<Text>Unknown bookmark</Text></Stack>',
    ]) {
      expect(getDeterministicEvaluationIssues(scopedCase, { ...widget, template })).not.toEqual([]);
    }
    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template:
          '<Stack>{(data.bookmarks?.bookmarks ?? []).map(bookmark => bookmark.content?.type === "link" ? <Text>{bookmark.content.text} {bookmark.content.sourceUrl}</Text> : bookmark.content?.type === "text" ? <Text>{bookmark.content.url} {bookmark.content.title}</Text> : bookmark.content?.type === "asset" ? <Text>{bookmark.content.assetType} {bookmark.content.assetId}</Text> : <Text>Unknown bookmark</Text>)}</Stack>',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('content.type === "link" branch') }),
        expect.objectContaining({ message: expect.stringContaining('content.type === "text" branch') }),
      ]),
    );
  });

  it("accepts either Karakeep top domains or tag usage without requiring both", () => {
    const testCase = getCase("karakeep-library-pulse");
    const expectations = testCase.expectations;
    if (expectations?.sourceType !== "integration") throw new Error("Karakeep pulse expectations are missing");
    const statsExpectation = expectations.requests.find(
      ({ pathIncludes }) => pathIncludes === "/api/v1/users/me/stats",
    );
    expect(statsExpectation?.requiredResponseMemberPaths).toBeUndefined();
    expect(statsExpectation?.requiredResponseMemberPathAnyOf).toEqual(["topDomains", "tagUsage"]);
    expect(expectations.templateIncludes).not.toEqual(expect.arrayContaining(["topDomains", "tagUsage"]));
    expect(expectations.templateIncludesAny ?? []).not.toContainEqual(["topDomains", "tagUsage"]);
    if (!statsExpectation) throw new Error("Karakeep stats expectations are missing");

    const scopedCase: CustomWidgetAiEvaluationCase = {
      ...testCase,
      expectations: {
        ...expectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: statsExpectation.kind,
            method: statsExpectation.method,
            pathIncludes: statsExpectation.pathIncludes,
            requiredResponseMemberPathAnyOf: statsExpectation.requiredResponseMemberPathAnyOf,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const widget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("karakeep", "int-karakeep-main"),
      requests: {
        stats: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/v1/users/me/stats",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
        decoy: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/v1/decoy",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
      },
    };
    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template: "<Text>{data.stats?.topDomains?.length ?? 0}</Text>",
      }),
    ).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template: "<Text>{data.stats?.tagUsage?.length ?? 0}</Text>",
      }),
    ).toEqual([]);
    for (const template of [
      "<Text>topDomains or tagUsage</Text>",
      "<Text>{data.decoy?.topDomains?.length ?? 0}</Text>",
      "<Text>{data.stats?.numBookmarks ?? 0}</Text>",
    ]) {
      expect(getDeterministicEvaluationIssues(scopedCase, { ...widget, template })).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("at least one verified response member") }),
      );
    }
  });

  it("does not accept static labels for the new response-member contracts", () => {
    const testCase = getCase("romm-platform-missing-inventory");
    const widget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget("romm", "int-romm-main"),
      requests: {
        inventory: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/roms",
          trigger: "load",
          query: {
            platform_ids: 7,
            missing: true,
            limit: 8,
            offset: 0,
            order_by: "created_at",
            order_dir: "desc",
            with_char_index: false,
            with_filter_values: false,
            with_rom_id_index: false,
            with_total: false,
          },
          auth: "inherit",
          permission: "view",
        },
      },
      template:
        '<Stack><Text>name fs_name_no_ext summary platform_display_name created_at fs_size_bytes missing_from_fs metadatum genres first_release_date average_rating</Text><RefreshButton requestId="inventory" /></Stack>',
    };
    const issues = getDeterministicEvaluationIssues(testCase, widget);
    expect(issues).toContainEqual(
      expect.objectContaining({
        message: "Render the verified response member name through a real JSX member access.",
      }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        message: "Render the verified response member metadatum.first_release_date through a real JSX member access.",
      }),
    );
  });

  it("requires semantic response access and protected-media exclusions for every named-service variant", () => {
    for (const testCase of CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES) {
      for (const request of testCase.expectations?.requests ?? []) {
        expect(
          request.requiresResponseBinding === true ||
            Boolean(request.requiredResponsePaths?.length) ||
            Boolean(request.requiredResponseMemberPaths?.length),
          `${testCase.id} ${request.method} ${request.pathIncludes} has no semantic response assertion`,
        ).toBe(true);
      }
    }

    const nowPlaying = getCase("dispatcharr-now-playing-permission");
    expect(nowPlaying.request).toContain("Dispatcharr possible?");
    expect(nowPlaying.request).not.toContain("dispatcharr.local");
    expect(nowPlaying.sourceConfiguration).toEqual({
      sourceId: "default",
      baseUrl: "http://dispatcharr.local",
      networkScope: "private",
    });
    const currentProgram = nowPlaying.expectations?.requests.find(
      ({ pathIncludes }) => pathIncludes === "/api/epg/current-programs/",
    );
    expect(currentProgram).toMatchObject({
      kind: "query",
      method: "POST",
      trigger: "manual",
      permission: "full",
      bodyIncludes: { channel_uuids: "$single-param-array:*" },
      bodyOnlyKeys: ["channel_uuids"],
      requiredTemplateComponents: ["SubFetch"],
      requiresSubFetchParams: true,
      requiredBoundParamSources: [
        {
          param: "channelUuid",
          component: "Select",
          requestPathIncludes: "/api/channels/channels/",
          itemsPath: "results",
          valuePath: "uuid",
        },
      ],
    });
    expect(currentProgram).not.toHaveProperty("requiresConfirmation");
    expect(nowPlaying.expectations?.templateIncludes).not.toContain("channel_uuids");

    for (const id of [
      "frigate-unreviewed-alerts",
      "romm-library-overview",
      "romm-platform-missing-inventory",
      "tubearchivist-archive-overview",
      "tubearchivist-channel-queue-health",
      "frigate-live-safety-fallback",
    ]) {
      const expectations = getCase(id).expectations;
      expect(expectations?.forbiddenTemplateComponents).toContain("Image");
      expect(expectations?.templateExcludes?.length).toBeGreaterThan(0);
    }
  });

  it("keeps every named response-path contract satisfiable by its matched fixture", () => {
    for (const testCase of CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES) {
      for (const request of testCase.expectations?.requests ?? []) {
        const response = getAssistantEvaluationPreviewResponse(testCase, {
          source: "default",
          kind: request.kind,
          method: request.method,
          path: request.pathIncludes,
          trigger: request.trigger ?? "load",
          auth: "inherit",
          permission: request.permission ?? "view",
        });
        expect(response, `${testCase.id} ${request.pathIncludes} has no matched fixture`).not.toBeUndefined();
        const fixturePaths = collectFixturePaths(response);
        for (const responsePath of request.requiredResponsePaths ?? []) {
          const expectedPath = responsePath.split(".");
          expect(
            fixturePaths.some(
              (path) =>
                path.length >= expectedPath.length && expectedPath.every((segment, index) => path[index] === segment),
            ),
            `${testCase.id} fixture is missing response path ${responsePath}`,
          ).toBe(true);
        }
        for (const memberPath of request.requiredResponseMemberPaths ?? []) {
          const expectedPath = memberPath.split(".");
          expect(
            fixturePaths.some(
              (path) =>
                path.length >= expectedPath.length &&
                expectedPath.every((segment, index) => segment === path[path.length - expectedPath.length + index]),
            ),
            `${testCase.id} fixture is missing response member ${memberPath}`,
          ).toBe(true);
        }
      }
    }
  });

  it("rejects forbidden TubeArchivist query keys and malformed Dispatcharr request bodies", () => {
    const tubeCase = getCase("tubearchivist-archive-overview");
    const tubeExpectations = tubeCase.expectations;
    const tubeRequest = tubeExpectations?.requests.find(({ pathIncludes }) => pathIncludes === "/api/video/");
    if (tubeExpectations?.sourceType !== "integration" || !tubeRequest) {
      throw new Error("TubeArchivist request expectations are missing");
    }
    const scopedTubeCase: CustomWidgetAiEvaluationCase = {
      ...tubeCase,
      expectations: {
        ...tubeExpectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: tubeRequest.kind,
            method: tubeRequest.method,
            pathIncludes: tubeRequest.pathIncludes,
            trigger: tubeRequest.trigger,
            queryIncludes: tubeRequest.queryIncludes,
            queryExcludes: tubeRequest.queryExcludes,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        templateExcludes: undefined,
        forbiddenTemplateComponents: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const tubeWidget: HomarrCustomWidgetV2 = {
      ...makeIntegrationWidget(tubeExpectations.sourceIntegrationKind, tubeExpectations.sourceIntegrationId),
      requests: {
        videos: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/video/",
          trigger: "load",
          query: { sort: "downloaded", order: "desc" },
          auth: "inherit",
          permission: "view",
        },
      },
    };
    expect(getDeterministicEvaluationIssues(scopedTubeCase, tubeWidget)).toEqual([]);
    const tubeVideoRequest = tubeWidget.requests.videos;
    if (!tubeVideoRequest) throw new Error("TubeArchivist fixture request is missing");
    expect(
      getDeterministicEvaluationIssues(scopedTubeCase, {
        ...tubeWidget,
        requests: { videos: { ...tubeVideoRequest, query: { sort: "downloaded", order: "desc", limit: 8 } } },
      }),
    ).toContainEqual(expect.objectContaining({ path: ["requests"] }));

    const dispatcharrCase = getCase("dispatcharr-now-playing-permission");
    const dispatcharrExpectations = dispatcharrCase.expectations;
    const dispatcharrRequest = dispatcharrExpectations?.requests.find(
      ({ pathIncludes }) => pathIncludes === "/api/epg/current-programs/",
    );
    if (!dispatcharrExpectations || dispatcharrExpectations.sourceType === "integration" || !dispatcharrRequest) {
      throw new Error("Dispatcharr request expectations are missing");
    }
    const scopedDispatcharrCase: CustomWidgetAiEvaluationCase = {
      ...dispatcharrCase,
      expectations: {
        ...dispatcharrExpectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: dispatcharrRequest.kind,
            method: dispatcharrRequest.method,
            pathIncludes: dispatcharrRequest.pathIncludes,
            trigger: dispatcharrRequest.trigger,
            permission: dispatcharrRequest.permission,
            bodyIncludes: dispatcharrRequest.bodyIncludes,
            bodyOnlyKeys: dispatcharrRequest.bodyOnlyKeys,
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        templateExcludes: undefined,
        forbiddenTemplateComponents: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const dispatcharrWidget: HomarrCustomWidgetV2 = {
      $schema: "homarr-custom-widget-v2",
      name: "Now playing",
      sources: {
        default: {
          baseUrl: dispatcharrExpectations.sourceBaseUrl,
          networkScope: dispatcharrExpectations.sourceNetworkScope ?? "private",
          auth: { type: "apiKeyHeader", name: dispatcharrExpectations.sourceAuthName ?? "X-API-Key" },
        },
      },
      requests: {
        current: {
          source: "default",
          kind: "query",
          method: "POST",
          path: "/api/epg/current-programs/",
          trigger: "manual",
          permission: "full",
          auth: "inherit",
          body: { channel_uuids: [{ $param: "channelUuid" }] },
        },
      },
      options: {},
      template: "<Text>Now playing</Text>",
    };
    expect(getDeterministicEvaluationIssues(scopedDispatcharrCase, dispatcharrWidget)).toEqual([]);
    const dispatcharrCurrentRequest = dispatcharrWidget.requests.current;
    if (!dispatcharrCurrentRequest) throw new Error("Dispatcharr fixture request is missing");
    for (const body of [
      { channel_uuids: { $param: "channelUuid" } },
      { channel_uuids: [{ $param: "channelUuid" }, { $param: "otherUuid" }] },
      { channel_uuids: [{ $param: "channelUuid" }], username: "admin" },
    ]) {
      expect(
        getDeterministicEvaluationIssues(scopedDispatcharrCase, {
          ...dispatcharrWidget,
          requests: { current: { ...dispatcharrCurrentRequest, body } },
        }),
      ).toContainEqual(expect.objectContaining({ path: ["requests"] }));
    }
  });

  it("requires the Dispatcharr channel UUID selector to drive every current-program parameter", () => {
    const testCase = getCase("dispatcharr-now-playing-permission");
    const expectations = testCase.expectations;
    const currentProgram = expectations?.requests.find(
      ({ pathIncludes }) => pathIncludes === "/api/epg/current-programs/",
    );
    if (!expectations || expectations.sourceType === "integration" || !currentProgram) {
      throw new Error("Dispatcharr current-program expectations are missing");
    }
    const scopedCase: CustomWidgetAiEvaluationCase = {
      ...testCase,
      expectations: {
        ...expectations,
        minimumTemplateCharacters: undefined,
        requests: [
          {
            kind: currentProgram.kind,
            method: currentProgram.method,
            pathIncludes: currentProgram.pathIncludes,
            trigger: currentProgram.trigger,
            permission: currentProgram.permission,
            bodyIncludes: currentProgram.bodyIncludes,
            bodyOnlyKeys: currentProgram.bodyOnlyKeys,
            requiresSubFetchParams: currentProgram.requiresSubFetchParams,
            requiredBoundParamSources: currentProgram.requiredBoundParamSources,
            requiredResponseMemberPaths: ["title"],
          },
        ],
        templateIncludes: undefined,
        templateIncludesAny: undefined,
        templateExcludes: undefined,
        forbiddenTemplateComponents: undefined,
        forbidUnexpectedRequests: false,
      },
    };
    const template =
      '<Stack><Select bind="channelUuid" data={(data.channels?.results ?? []).map(channel => ({ value: channel.uuid, label: channel.effective_name }))} /><SubFetch requestId="current" params={{ channelUuid: inputs.channelUuid }}>{programs => <Text>{programs[0]?.title ?? "No current program"}</Text>}</SubFetch></Stack>';
    const widget: HomarrCustomWidgetV2 = {
      $schema: "homarr-custom-widget-v2",
      name: "Now playing",
      sources: {
        default: {
          baseUrl: expectations.sourceBaseUrl,
          networkScope: expectations.sourceNetworkScope ?? "private",
          auth: { type: "apiKeyHeader", name: expectations.sourceAuthName ?? "X-API-Key" },
        },
      },
      requests: {
        channels: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/channels/channels/",
          trigger: "load",
          auth: "inherit",
          permission: "view",
        },
        current: {
          source: "default",
          kind: "query",
          method: "POST",
          path: "/api/epg/current-programs/",
          trigger: "manual",
          permission: "full",
          auth: "inherit",
          body: { channel_uuids: [{ $param: "channelUuid" }] },
        },
      },
      options: {},
      template,
    };

    expect(getDeterministicEvaluationIssues(scopedCase, widget)).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template: template
          .replace("value: channel.uuid", "value: (channel.uuid)")
          .replace("channelUuid: inputs.channelUuid", "channelUuid: (inputs.channelUuid)"),
      }),
    ).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template:
          '<Stack><Select bind="channelUuid" data={(data.channels?.results ?? []).map(({ uuid, effective_name }) => ({ value: uuid, label: effective_name }))} /><SubFetch requestId="current" params={{ channelUuid: inputs.channelUuid }}>{([program]) => <Text>{program?.title ?? "No current program"}</Text>}</SubFetch></Stack>',
      }),
    ).toEqual([]);

    expect(
      getDeterministicEvaluationIssues(scopedCase, {
        ...widget,
        template: template.replace(" params={{ channelUuid: inputs.channelUuid }}", ""),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("every $param") }),
        expect.objectContaining({ message: expect.stringContaining("pass inputs.channelUuid") }),
      ]),
    );

    for (const adversarialTemplate of [
      template.replace("inputs.channelUuid", '"3a4c76d1-93bb-48ad-883b-943441024769"'),
      template.replace('bind="channelUuid"', 'bind="selectedChannel"'),
      template.replace(
        "(data.channels?.results ?? []).map(channel => ({ value: channel.uuid, label: channel.effective_name }))",
        '[{ value: "3a4c76d1-93bb-48ad-883b-943441024769", label: "BBC One" }]',
      ),
      template
        .replace("value: channel.uuid", "value: channel.id")
        .replace("</Stack>", "<Text>channel.uuid</Text></Stack>"),
      template.replace("value: channel.uuid", "value: channel.name ?? channel.uuid"),
      template.replace("value: channel.uuid", "value: [channel.uuid]"),
      template.replace("value: channel.uuid", 'value: channel.name + ":" + channel.uuid'),
      template.replace(
        "({ value: channel.uuid, label: channel.effective_name })",
        "({ value: channel.name, label: channel.uuid })",
      ),
      template.replace("channelUuid: inputs.channelUuid", 'channelUuid: inputs.channelUuid ?? "fallback"'),
      template.replace("channelUuid: inputs.channelUuid", "channelUuid: [inputs.channelUuid]"),
    ]) {
      expect(getDeterministicEvaluationIssues(scopedCase, { ...widget, template: adversarialTemplate })).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining("Bind Select input 'channelUuid'") }),
      );
    }
  });
});

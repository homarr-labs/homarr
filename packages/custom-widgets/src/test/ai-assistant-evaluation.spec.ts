import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import { CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES } from "../../scripts/ai-integration-evaluation-cases";
import {
  assessAssistantFinalResponse,
  assistantEvaluationToolRequestOptions,
  assistantEvaluationReasoningOptions,
  assistantEvaluationTemperature,
  buildAssistantEvaluationSystemPrompt,
  compactAssistantEvaluationMessages,
  completeAssistantEvaluationCredentialRequest,
  composeAssistantEvaluationFeedback,
  createAssistantEvaluationCaseSnapshot,
  createAssistantEvaluationPromptSnapshot,
  createAssistantEvaluationState,
  customWidgetAssistantEvaluationToolDefinitions,
  executeAssistantEvaluationTool,
  executeActiveAssistantEvaluationTool,
  expireAssistantEvaluationCredentialRequest,
  formatAssistantDeterministicFeedback,
  getActiveAssistantEvaluationToolDefinitions,
  getAssistantEvaluationMaxOutputTokens,
  getAssistantEvaluationProviderPreferences,
  getAssistantEvaluationReasoningOptions,
  getAssistantEvaluationStepTimeoutMs,
  getAssistantEvaluationToolChoice,
  getAssistantEvaluationEfficiencyIssues,
  getAssistantEvaluationLifecycleIssues,
  getAssistantEvaluationPreviewResponse,
  getAssistantEvaluationPromotionEligibility,
  getAssistantJudgeFloor,
  getPortableAssistantLifecycleFeedback,
  getRequiredAssistantEvaluationRequestParams,
  isAssistantEvaluationRetryableStatus,
  mergeAssistantEvaluationFeedback,
  replaceAssistantEvaluationFeedback,
  resumeAssistantEvaluationCredentialRequests,
  resolveAssistantEvaluationMaxLoops,
  selectAssistantEvaluationReviewFeedback,
  selectAssistantEvaluationLifecycleEvidence,
  validateAssistantEvaluationExperimentConfiguration,
} from "../../scripts/ai-assistant-evaluation";
import { CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION } from "../core/ai-prompt";
import {
  appendActiveCustomWidgetToolInstruction,
  selectSequentialCustomWidgetToolCalls,
} from "../core/assistant-tool-step";
import { getDeterministicEvaluationSuiteIssues } from "../../scripts/ai-evaluation";
import {
  customWidgetAuthoringDefinitionSchema,
  normalizeCustomWidgetAuthoringDefinition,
} from "../core/custom-jsx-schema";
import { normalizeCustomWidgetLifecycleToolInput } from "../core/assistant-tool-input";

const healthWidget = {
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

const requestOperationsWidget = {
  $schema: "homarr-custom-widget-v2",
  name: "Seerr request operations",
  sources: {
    default: {
      baseUrl: "http://seerr.local:5055/api/v1",
      networkScope: "private",
      auth: { type: "apiKeyHeader", name: "X-Api-Key" },
    },
  },
  requests: {
    counts: { kind: "query", method: "GET", path: "/request/count", trigger: "load" },
    recent: {
      kind: "query",
      method: "GET",
      path: "/request",
      trigger: "load",
      query: { take: 10, skip: 0, sort: "added", sortDirection: "desc" },
    },
    approve: {
      kind: "action",
      method: "POST",
      path: "/request/{param:requestId}/approve",
      confirmation: "Approve this Seerr request?",
      invalidates: ["counts", "recent"],
    },
    decline: {
      kind: "action",
      method: "POST",
      path: "/request/{param:requestId}/decline",
      confirmation: "Decline this Seerr request?",
      invalidates: ["counts", "recent"],
    },
  },
  options: {},
  templateLines: [
    '<Stack gap="sm">',
    '  <Group justify="space-between"><Title order={4}>Request operations</Title><RefreshButton /></Group>',
    "  {status.counts?.loading || status.recent?.loading ? <Skeleton h={88} /> : null}",
    '  {status.counts?.ok === false || status.recent?.ok === false ? <Alert color="red">Unable to load requests.</Alert> : null}',
    '  {data.counts ? <Stack gap={4}><SimpleGrid cols={{ base: 2, sm: 4 }}><Paper p="sm" withBorder><Text size="xs" c="dimmed">Pending</Text><Text fw={700}>{data.counts.pending}</Text></Paper><Paper p="sm" withBorder><Text size="xs" c="dimmed">Approved</Text><Text fw={700}>{data.counts.approved}</Text></Paper><Paper p="sm" withBorder><Text size="xs" c="dimmed">Available</Text><Text fw={700}>{data.counts.available}</Text></Paper><Paper p="sm" withBorder><Text size="xs" c="dimmed">Total</Text><Text fw={700}>{data.counts.total}</Text></Paper></SimpleGrid><Text size="xs" c="dimmed">Processing {data.counts.processing} · Declined {data.counts.declined}</Text></Stack> : null}',
    '  {data.recent?.results?.length ? <Stack gap="xs">{data.recent.results.map(request => <Group key={request.id} justify="space-between"><Avatar src={request.requestedBy?.avatar} imageProps={{ alt: request.requestedBy?.displayName ?? "Requester" }} /><Stack gap={2}><Text fw={600}>{request.media?.mediaType ?? request.type} · TMDB {request.media?.tmdbId} · Request #{request.id}</Text><Text size="xs" c="dimmed">{request.requestedBy?.displayName ?? "Not provided"} · {request.profileName ?? "Not provided"} · {Date.toLocaleString(request.createdAt, "en-US", "UTC")} UTC · Media {["Unknown", "Pending", "Processing", "Partially Available", "Available", "Blocklisted", "Deleted"][(request.media?.status ?? 1) - 1] ?? "Unknown"} · 4K {["Unknown", "Pending", "Processing", "Partially Available", "Available", "Blocklisted", "Deleted"][(request.media?.status4k ?? 1) - 1] ?? "Unknown"}</Text></Stack><Group><Badge>{["Pending", "Approved", "Declined", "Failed", "Completed"][request.status - 1] ?? "Unknown"}</Badge>{request.status === 1 ? <Group gap="xs"><ActionButton requestId="approve" params={{ requestId: request.id }} size="xs">Approve</ActionButton><ActionButton requestId="decline" params={{ requestId: request.id }} size="xs" color="red">Decline</ActionButton></Group> : null}</Group></Group>)}<Text size="xs" c="dimmed">Page {data.recent.pageInfo?.page} of {data.recent.pageInfo?.pages}</Text></Stack> : <Text c="dimmed">No recent requests.</Text>}',
    "</Stack>",
  ],
};

const mediaResearchWidget = {
  $schema: "homarr-custom-widget-v2",
  name: "Seerr media research",
  sources: requestOperationsWidget.sources,
  requests: {
    search: {
      kind: "query",
      method: "GET",
      path: "/search",
      trigger: "manual",
      query: { query: { $param: "query" }, page: { $param: "page" } },
    },
    requestMovie: {
      kind: "action",
      method: "POST",
      path: "/request",
      body: { mediaType: "movie", mediaId: { $param: "mediaId" } },
      confirmation: "Request this movie from Seerr?",
      invalidates: ["search"],
    },
    requestSeries: {
      kind: "action",
      method: "POST",
      path: "/request",
      body: { mediaType: "tv", mediaId: { $param: "mediaId" }, seasons: "all" },
      confirmation: "Request every available season from Seerr?",
      invalidates: ["search"],
    },
  },
  options: {},
  templateLines: [
    '<Stack gap="sm">',
    '  <Title order={4}>Discover with Seerr</Title><TextInput bind="query" label="Movie or series" placeholder="Search media" />',
    '  <SubFetch requestId="search" trigger="manual" params={{ query: inputs.query, page: inputs.page ?? 1 }}>',
    '    {(result) => result.results?.length ? <Stack gap="sm"><Group justify="space-between"><Text>{result.totalResults} matches · page {result.page}</Text><RefreshButton requestId="search" label="Run again" /></Group><SimpleGrid cols={{ base: 1, sm: 2 }}>{result.results.map(item => <Paper key={`${item.mediaType}-${item.id}`} withBorder p="sm"><Image src={`https://image.tmdb.org/t/p/w780${item.backdropPath ?? item.posterPath}`} alt={item.title ?? item.name} h={96} radius="md" /><Stack gap={4}><Group justify="space-between"><Text fw={700}>{item.title ?? item.name}</Text><Badge>{item.mediaType}</Badge></Group><Text size="sm" lineClamp={2}>{item.overview}</Text><Text size="xs" c="dimmed">{item.voteAverage != null ? `Rating ${item.voteAverage} · ` : ""}{item.releaseDate ?? item.firstAirDate} · {["Unknown", "Pending", "Processing", "Partially Available", "Available", "Blocklisted", "Deleted"][(item.mediaInfo?.status ?? 1) - 1] ?? "Unknown"} · 4K {["Unknown", "Pending", "Processing", "Partially Available", "Available", "Blocklisted", "Deleted"][(item.mediaInfo?.status4k ?? 1) - 1] ?? "Unknown"}</Text>{item.mediaType === "movie" ? <ActionButton requestId="requestMovie" params={{ mediaId: item.id }}>Request movie</ActionButton> : <ActionButton requestId="requestSeries" params={{ mediaId: item.id }}>Request full series</ActionButton>}</Stack></Paper>)}</SimpleGrid><Pagination bind="page" defaultValue={1} resetKey={inputs.query} total={result.totalPages} /></Stack> : <Alert>No matching media found. Try another title.</Alert>}',
    "  </SubFetch>",
    "</Stack>",
  ],
};

const getCase = (id: string) => {
  const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find((candidate) => candidate.id === id);
  if (!testCase) throw new Error(`AI evaluation case '${id}' is missing`);
  return testCase;
};

const validateTemplate = (
  testCase: ReturnType<typeof getCase>,
  state: ReturnType<typeof createAssistantEvaluationState>,
  definition: { templateLines: string[] },
) =>
  executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
    templateLines: definition.templateLines,
  });

const setSuccessfulFinalHandoff = (state: ReturnType<typeof createAssistantEvaluationState>) => {
  const names = state.createdWidgets.map(({ name }) => name).join(" and ");
  state.finalText = `Created ${names}, showing the requested dashboard data with manual refresh and truthful setup limits.`;
};

describe("Custom Widget assistant live evaluation harness", () => {
  it("makes pass@1 experiment loop configuration explicit", () => {
    expect(resolveAssistantEvaluationMaxLoops(undefined, undefined)).toEqual({
      value: 10,
      source: "default",
      configuredValue: null,
    });
    expect(resolveAssistantEvaluationMaxLoops(undefined, "4")).toEqual({
      value: 4,
      source: "environment",
      configuredValue: "4",
    });
    expect(resolveAssistantEvaluationMaxLoops("1", "8")).toEqual({
      value: 1,
      source: "cli",
      configuredValue: "1",
    });
    expect(() => resolveAssistantEvaluationMaxLoops("0", undefined)).toThrow(
      "--max-loops must be an integer between 1 and 10",
    );
    expect(() => resolveAssistantEvaluationMaxLoops("11", undefined)).toThrow(
      "--max-loops must be an integer between 1 and 10",
    );
    expect(() => validateAssistantEvaluationExperimentConfiguration(10, "prompt-study", undefined, "dev")).toThrow(
      "require --max-loops=1",
    );
    expect(() => validateAssistantEvaluationExperimentConfiguration(1, "prompt-study", "3", undefined)).toThrow(
      "require an explicit --split=train|dev|heldout",
    );
    expect(() => validateAssistantEvaluationExperimentConfiguration(1, "prompt-study", "3", "heldout")).not.toThrow();
    expect(() => validateAssistantEvaluationExperimentConfiguration(10, undefined, undefined, "dev", true)).toThrow(
      "require --max-loops=1",
    );
    expect(() => validateAssistantEvaluationExperimentConfiguration(1, undefined, undefined, undefined, true)).toThrow(
      "require an explicit --split=train|dev|heldout",
    );
  });

  it("marks only complete assistant split runs as promotion-eligible", () => {
    expect(
      getAssistantEvaluationPromotionEligibility({
        assistantMode: true,
        requestedCase: undefined,
        requestedSplit: "dev",
        experimentId: "experiment",
        generationId: "generation",
        maxLoops: 1,
        selectedCaseIds: ["case-a", "case-b"],
        expectedCaseIds: ["case-a", "case-b"],
        generatorModel: "openai/gpt-5.6-luna",
        reasoningEffort: "high",
        maxOutputTokens: 32_768,
      }),
    ).toEqual({ eligible: true, reasons: [] });

    expect(
      getAssistantEvaluationPromotionEligibility({
        assistantMode: true,
        requestedCase: undefined,
        requestedSplit: "dev",
        experimentId: "experiment",
        generationId: "generation",
        maxLoops: 1,
        selectedCaseIds: ["case-a", "case-b"],
        expectedCaseIds: ["case-a", "case-b"],
        generatorModel: "openai/gpt-5.6-luna",
        reasoningEffort: "high",
        maxOutputTokens: 10_000,
      }),
    ).toEqual({
      eligible: false,
      reasons: ["promotion requires the production maxOutputTokens=32768"],
    });

    expect(
      getAssistantEvaluationPromotionEligibility({
        assistantMode: true,
        requestedCase: "case-a",
        requestedSplit: "dev",
        experimentId: "experiment",
        generationId: "generation",
        maxLoops: 1,
        selectedCaseIds: ["case-a"],
        expectedCaseIds: ["case-a", "case-b"],
        generatorModel: "openai/gpt-5.6-luna",
        reasoningEffort: "high",
        maxOutputTokens: 32_768,
      }),
    ).toMatchObject({ eligible: false, reasons: expect.arrayContaining([expect.stringContaining("single-case")]) });

    expect(
      getAssistantEvaluationPromotionEligibility({
        assistantMode: true,
        requestedCase: undefined,
        requestedSplit: "dev",
        experimentId: "experiment",
        generationId: "generation",
        maxLoops: 4,
        selectedCaseIds: ["case-a"],
        expectedCaseIds: ["case-a", "case-b"],
        generatorModel: "openai/gpt-5.6-luna",
        reasoningEffort: "high",
        maxOutputTokens: 32_768,
      }),
    ).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining([
        "promotion requires --max-loops=1",
        "selected cases do not cover the complete requested split",
      ]),
    });

    expect(
      getAssistantEvaluationPromotionEligibility({
        assistantMode: true,
        requestedCase: undefined,
        requestedSplit: "train",
        experimentId: "experiment",
        generationId: "generation",
        maxLoops: 1,
        selectedCaseIds: ["case-a"],
        expectedCaseIds: ["case-a"],
        generatorModel: "openai/gpt-5.6-luna",
        reasoningEffort: "high",
        maxOutputTokens: 32_768,
      }),
    ).toEqual({ eligible: false, reasons: ["train split runs are not eligible for promotion"] });

    expect(
      getAssistantEvaluationPromotionEligibility({
        assistantMode: true,
        requestedCase: undefined,
        requestedSplit: "dev",
        experimentId: "experiment",
        generationId: "generation",
        maxLoops: 1,
        selectedCaseIds: ["case-a"],
        expectedCaseIds: ["case-a"],
        generatorModel: "deepseek/deepseek-v4.1-flash",
        reasoningEffort: "high",
        maxOutputTokens: 32_768,
      }),
    ).toEqual({
      eligible: false,
      reasons: ["promotion requires max reasoning for generator model 'deepseek/deepseek-v4.1-flash'"],
    });
  });

  it("keeps tool staging around an immutable candidate assistant policy", () => {
    const candidatePolicy = "Candidate policy generation 3";
    const prompt = buildAssistantEvaluationSystemPrompt(candidatePolicy, 2);

    expect(prompt).toContain(candidatePolicy);
    expect(prompt.startsWith(CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION)).toBe(true);
    expect(prompt).toContain("Complete and persist all 2 requested widget jobs");
    expect(prompt.indexOf(candidatePolicy)).toBeGreaterThan(0);
  });

  it("snapshots exact prompt provenance with a stable hash", () => {
    const snapshot = createAssistantEvaluationPromptSnapshot({
      text: "Candidate policy generation 3\n",
      source: "candidate-file",
      sourceFile: "experiments/generation-3.md",
    });

    expect(snapshot).toEqual({
      text: "Candidate policy generation 3\n",
      source: "candidate-file",
      sourceFile: "experiments/generation-3.md",
      sha256: "ccc86a34470f3fc4d3410ddac282662aa1509c038081a501b3b89a0a978adebe",
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("snapshots ordered benchmark cases and their exact content", () => {
    const cases = [
      { id: "case-b", split: "dev", request: "Second" },
      { id: "case-a", split: "dev", request: "First" },
    ];
    const snapshot = createAssistantEvaluationCaseSnapshot(cases);

    expect(snapshot.caseIds).toEqual(["case-b", "case-a"]);
    expect(snapshot.sha256).toBe("114c6c575f1f248b9e722883158e6da394677a45efa42873967d08d0dc45abdc");
    expect(Object.isFrozen(snapshot.caseIds)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("preserves completed lifecycle evidence when deterministic grading rejects the result", () => {
    const state = createAssistantEvaluationState();
    const widget = normalizeCustomWidgetAuthoringDefinition(customWidgetAuthoringDefinitionSchema.parse(healthWidget));
    state.createdWidgets.push(widget);
    state.calledTools.push("customWidget_previewCreate", "customWidget_createFromPreview");

    expect(selectAssistantEvaluationLifecycleEvidence([], [], [state, createAssistantEvaluationState()])).toEqual({
      widgets: [widget],
      calledTools: ["customWidget_previewCreate", "customWidget_createFromPreview"],
    });
  });

  it("keeps the production-sized default while allowing a bounded low-credit live-evaluation override", () => {
    expect(getAssistantEvaluationMaxOutputTokens(undefined)).toBe(32_768);
    expect(getAssistantEvaluationMaxOutputTokens("10000")).toBe(10_000);
    expect(getAssistantEvaluationMaxOutputTokens("32768")).toBe(32_768);
    expect(getAssistantEvaluationMaxOutputTokens("50000")).toBe(32_768);
    expect(getAssistantEvaluationMaxOutputTokens("2048")).toBe(4_096);
    expect(getAssistantEvaluationMaxOutputTokens("not-a-number")).toBe(32_768);
  });

  it("uses the production step and remaining total timeout ceilings", () => {
    expect(getAssistantEvaluationStepTimeoutMs(undefined, 240_000)).toBe(60_000);
    expect(getAssistantEvaluationStepTimeoutMs("30000", 240_000)).toBe(30_000);
    expect(getAssistantEvaluationStepTimeoutMs("600000", 12_345)).toBe(12_345);
    expect(getAssistantEvaluationStepTimeoutMs("600000", 0)).toBe(1);
  });

  it("matches production retry policy for transient provider failures", () => {
    expect(isAssistantEvaluationRetryableStatus(408)).toBe(true);
    expect(isAssistantEvaluationRetryableStatus(409)).toBe(true);
    expect(isAssistantEvaluationRetryableStatus(429)).toBe(true);
    expect(isAssistantEvaluationRetryableStatus(503)).toBe(true);
    expect(isAssistantEvaluationRetryableStatus(400)).toBe(false);
    expect(isAssistantEvaluationRetryableStatus(404)).toBe(false);
  });
  it("reports the weakest widget review as the multi-widget score floor", () => {
    const stronger = { total: 85 };
    const weaker = { total: 83 };

    expect(getAssistantJudgeFloor([stronger, weaker] as never)).toBe(weaker);
    expect(getAssistantJudgeFloor([])).toBeNull();
  });

  it("matches production by disabling parallel tool calls", () => {
    expect(assistantEvaluationToolRequestOptions).toEqual({
      tool_choice: "auto",
      parallel_tool_calls: false,
    });
    expect(assistantEvaluationReasoningOptions).toEqual({ effort: "high", exclude: true });
    expect(getAssistantEvaluationReasoningOptions(undefined, "openai/gpt-5.6-luna")).toEqual({
      effort: "high",
      exclude: true,
    });
    expect(getAssistantEvaluationReasoningOptions(undefined, "deepseek/deepseek-v4.1-flash")).toEqual({
      effort: "max",
      exclude: true,
    });
    expect(getAssistantEvaluationReasoningOptions("max")).toEqual({ effort: "max", exclude: true });
    expect(getAssistantEvaluationReasoningOptions("high")).toEqual({ effort: "high", exclude: true });
    expect(() => getAssistantEvaluationReasoningOptions("unsupported")).toThrow(
      "CUSTOM_WIDGET_AI_REASONING_EFFORT must be one of",
    );
    expect(
      getAssistantEvaluationProviderPreferences({
        CUSTOM_WIDGET_AI_PROVIDER_ORDER: "DeepInfra",
        CUSTOM_WIDGET_AI_PROVIDER_QUANTIZATIONS: "fp8",
      }),
    ).toEqual({ order: ["deepinfra"], allow_fallbacks: false, quantizations: ["fp8"] });
    expect(assistantEvaluationTemperature).toBe(0.2);
  });

  it("uses the authoring definition schema for preview tool input", () => {
    const previewTool = customWidgetAssistantEvaluationToolDefinitions.find(
      ({ function: definition }) => definition.name === "customWidget_previewCreate",
    );
    const previewParameters = previewTool?.function.parameters as { properties?: Record<string, unknown> } | undefined;
    const definitionSchema = previewParameters?.properties?.definition;

    expect(definitionSchema).toEqual(z.toJSONSchema(customWidgetAuthoringDefinitionSchema, { io: "input" }));
    expect(definitionSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        $schema: { const: "homarr-custom-widget-v2" },
        sources: { type: "object" },
        requests: { type: "object" },
        templateLines: { type: "array" },
      },
    });
    expect(previewParameters?.properties?.definitionId).toEqual({ type: "string" });
    const createFromPreviewTool = customWidgetAssistantEvaluationToolDefinitions.find(
      ({ function: definition }) => definition.name === "customWidget_createFromPreview",
    );
    expect(createFromPreviewTool?.function.parameters).toMatchObject({
      required: ["previewSessionId"],
      properties: {
        previewSessionId: { type: "string" },
        targetBoardId: { type: "string", minLength: 1 },
      },
    });
    const updateFromPreviewTool = customWidgetAssistantEvaluationToolDefinitions.find(
      ({ function: definition }) => definition.name === "customWidget_updateFromPreview",
    );
    expect(updateFromPreviewTool?.function.parameters).toMatchObject({
      required: ["previewSessionId"],
      properties: { previewSessionId: { type: "string" } },
    });
    expect(
      customWidgetAssistantEvaluationToolDefinitions.some(
        ({ function: definition }) => definition.name === "customWidget_configurationRequestUser",
      ),
    ).toBe(true);
  });

  it("requires secure credential configuration, Continue, and fresh evidence for authenticated HTTP previews", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, requestOperationsWidget);

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: requestOperationsWidget,
        secrets: [{ sourceId: "default", kind: "apiKey", value: "must-not-enter-model-context" }],
      }),
    ).toEqual({
      error: "Assistant preview inputs must not contain credentials. Use secure source configuration before evidence.",
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: requestOperationsWidget,
      }),
    ).toMatchObject({
      sourceConfigurations: [expect.objectContaining({ sourceId: "default" })],
    });

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "counts",
        params: {},
      }),
    ).toMatchObject({
      ok: false,
      sourceId: "default",
      requiredNextTool: "customWidget_configurationRequestUser",
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toContain("customWidget_configurationRequestUser");
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        previewSessionId: "preview-1",
        sourceId: "missing",
      }),
    ).toEqual({ error: "Preview source was not found" });
    const setup = executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      previewSessionId: "preview-1",
      sourceId: "default",
    });
    expect(setup).toMatchObject({ requestId: "configuration-1", status: "pending" });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        previewSessionId: "preview-1",
        sourceId: "default",
      }),
    ).toMatchObject({
      error: expect.stringContaining("already exists"),
      requestId: "configuration-1",
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        requestId: "configuration-1",
      }),
    ).toEqual({
      requestId: "configuration-1",
      status: "pending",
      previewSessionId: "preview-1",
      sourceId: "default",
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Configure preview source 'default' before persistence" });

    expect(resumeAssistantEvaluationCredentialRequests(state)).toEqual(["configuration-1"]);
    expect(state.syntheticCredentialContinues).toBe(1);
    expect(state.previews.get("preview-1")).toMatchObject({ revision: 1 });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        requestId: "configuration-1",
      }),
    ).toEqual({
      requestId: "configuration-1",
      status: "completed",
      previewSessionId: "preview-1",
      sourceId: "default",
    });
    expect(getActiveAssistantEvaluationToolDefinitions(state).map(({ function: tool }) => tool.name)).toContain(
      "customWidget_previewQuery",
    );
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Test every preview query before creation: counts, recent" });

    for (const requestId of ["counts", "recent"]) {
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
          sessionId: "preview-1",
          requestId,
          params: {},
        }),
      ).toMatchObject({ ok: true, status: 200 });
    }
    for (const requestId of ["approve", "decline"]) {
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewAction", {
        sessionId: "preview-1",
        requestId,
        params: { requestId: 91 },
      });
    }
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-seerr-media-workflows-1" });
  });

  it("blocks action-only authenticated evidence until secure source configuration completes", () => {
    const testCase = getCase("seerr-media-workflows");
    const actionOnlyWidget = {
      $schema: "homarr-custom-widget-v2",
      name: "Authenticated action",
      sources: requestOperationsWidget.sources,
      requests: {
        restart: {
          kind: "action",
          method: "POST",
          path: "/admin/restart",
          confirmation: "Restart the service?",
          permission: "full",
        },
      },
      options: {},
      templateLines: ['<ActionButton requestId="restart" color="red">Restart service</ActionButton>'],
    };
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, actionOnlyWidget);
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: actionOnlyWidget,
      }),
    ).toMatchObject({
      queries: [],
      actions: [expect.objectContaining({ requestId: "restart" })],
      sourceConfigurations: [expect.objectContaining({ sourceId: "default" })],
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewAction", {
        sessionId: "preview-1",
        requestId: "restart",
        params: {},
      }),
    ).toMatchObject({
      ok: false,
      sourceId: "default",
      requiredNextTool: "customWidget_configurationRequestUser",
    });
    expect(state.previews.get("preview-1")?.testedActions).toEqual(new Set());
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Configure preview source 'default' before persistence" });

    executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      previewSessionId: "preview-1",
      sourceId: "default",
    });
    resumeAssistantEvaluationCredentialRequests(state);
    executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      requestId: "configuration-1",
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewAction", {
        sessionId: "preview-1",
        requestId: "restart",
        params: {},
      }),
    ).toMatchObject({ ok: true, simulated: true });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-seerr-media-workflows-1" });
  });

  it("configures a placeholder URL before evidence without treating it as an auth-only 401", () => {
    const testCase = CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES.find(
      ({ id }) => id === "dispatcharr-now-playing-permission",
    );
    if (!testCase) throw new Error("Dispatcharr placeholder evaluation case is missing");
    const definition = {
      $schema: "homarr-custom-widget-v2",
      name: "Dispatcharr setup fixture",
      sources: {
        default: {
          baseUrl: "https://your-dispatcharr.example.com",
          networkScope: "private",
          auth: { type: "apiKeyHeader", name: "X-API-Key" },
        },
      },
      requests: {
        channels: {
          source: "default",
          kind: "query",
          method: "GET",
          path: "/api/channels/channels/",
          trigger: "load",
          query: { page: 1, page_size: 12, ordering: "channel_number" },
          auth: "inherit",
          permission: "view",
        },
      },
      options: {},
      templateLines: [
        '<Stack><RefreshButton requestId="channels" />{status.channels?.loading ? <Text>Loading</Text> : status.channels?.ok === false ? <Alert>{status.channels.error}</Alert> : <Text>{data.channels?.count}</Text>}</Stack>',
      ],
    };
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, definition);
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: {
          ...definition,
          sources: {
            default: {
              ...definition.sources.default,
              baseUrl: "http://dispatcharr.local",
            },
          },
        },
      }),
    ).toMatchObject({
      error: expect.stringContaining("did not supply this self-hosted URL"),
      recovery: { kind: "source-placeholder-required" },
    });
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition })).toMatchObject(
      {
        sourceConfigurations: [
          {
            sourceId: "default",
            nextStep: expect.stringContaining("before testing"),
          },
        ],
      },
    );
    expect(getActiveAssistantEvaluationToolDefinitions(state).map(({ function: tool }) => tool.name)).toContain(
      "customWidget_configurationRequestUser",
    );
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "channels",
        params: {},
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("requires secure URL or credential configuration"),
      requiredNextTool: "customWidget_configurationRequestUser",
    });
    expect(state.previews.get("preview-1")?.journal).toEqual([]);
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        previewSessionId: "preview-1",
        sourceId: "default",
      }),
    ).toMatchObject({ requestId: "configuration-1", status: "pending" });
    expect(resumeAssistantEvaluationCredentialRequests(state)).toEqual(["configuration-1"]);
    expect(state.previews.get("preview-1")?.widget.sources.default).toMatchObject({
      baseUrl: "http://dispatcharr.local",
      networkScope: "private",
      auth: { type: "apiKeyHeader", name: "X-API-Key" },
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        requestId: "configuration-1",
      }),
    ).toEqual({
      requestId: "configuration-1",
      status: "completed",
      previewSessionId: "preview-1",
      sourceId: "default",
    });
    expect(getActiveAssistantEvaluationToolDefinitions(state).map(({ function: tool }) => tool.name)).toContain(
      "customWidget_previewQuery",
    );
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "channels",
        params: {},
      }),
    ).toMatchObject({ ok: true, status: 200 });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
        targetBoardId: "board-home",
      }),
    ).toMatchObject({ id: "created-dispatcharr-now-playing-permission-1" });
    expect(state.createdWidgets[0]?.sources.default).toMatchObject({
      baseUrl: "http://dispatcharr.local",
      networkScope: "private",
    });
  });

  it("does not configure the required but unused source of a static widget", () => {
    const testCase = getCase("fake-service-health");
    const definition = {
      $schema: "homarr-custom-widget-v2",
      name: "Static dashboard note",
      sources: {
        default: { baseUrl: "https://example.com", networkScope: "public", auth: "bearer" },
      },
      requests: {},
      options: {},
      templateLines: ["<Text>Static dashboard note</Text>"],
    };
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, definition);

    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition })).toMatchObject(
      {
        sourceConfigurations: [],
        queries: [],
        actions: [],
      },
    );
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-fake-service-health-1" });
  });

  it("rejects expired and failed credential setup evidence", () => {
    const testCase = getCase("seerr-media-workflows");
    const createState = () => {
      const state = createAssistantEvaluationState();
      validateTemplate(testCase, state, requestOperationsWidget);
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: requestOperationsWidget,
      });
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "counts",
        params: {},
      });
      executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
        previewSessionId: "preview-1",
        sourceId: "default",
      });
      return state;
    };

    const expiredState = createState();
    expect(expireAssistantEvaluationCredentialRequest(expiredState, "configuration-1")).toBe(true);
    expect(
      executeAssistantEvaluationTool(testCase, expiredState, "customWidget_configurationRequestUser", {
        requestId: "configuration-1",
      }),
    ).toMatchObject({
      error: "Source configuration request expired or was not found",
      requestId: "configuration-1",
      status: "expired",
      recovery: {
        recoverable: true,
        kind: "expired-source-configuration-request",
        requiredNextTool: "customWidget_configurationRequestUser",
      },
    });
    expect(
      executeAssistantEvaluationTool(testCase, expiredState, "customWidget_configurationRequestUser", {
        previewSessionId: "preview-1",
        sourceId: "default",
      }),
    ).toMatchObject({
      requestId: "configuration-2",
      previewSessionId: "preview-1",
      sourceId: "default",
      status: "pending",
    });
    expect(completeAssistantEvaluationCredentialRequest(expiredState, "configuration-2")).toBe(true);
    expect(
      executeAssistantEvaluationTool(testCase, expiredState, "customWidget_configurationRequestUser", {
        requestId: "configuration-2",
      }),
    ).toMatchObject({
      requestId: "configuration-2",
      previewSessionId: "preview-1",
      sourceId: "default",
      status: "completed",
    });
    expect(
      executeAssistantEvaluationTool(testCase, expiredState, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Test every preview query before creation: counts, recent" });
    expect(getAssistantEvaluationLifecycleIssues(testCase, expiredState)).not.toContain(
      "The assistant did not verify completed source configuration request 'configuration-1'.",
    );

    const forbiddenState = createState();
    expect(completeAssistantEvaluationCredentialRequest(forbiddenState, "configuration-1", { httpStatus: 403 })).toBe(
      true,
    );
    executeAssistantEvaluationTool(testCase, forbiddenState, "customWidget_configurationRequestUser", {
      requestId: "configuration-1",
    });
    expect(
      executeAssistantEvaluationTool(testCase, forbiddenState, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "counts",
        params: {},
      }),
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      executeAssistantEvaluationTool(testCase, forbiddenState, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Test every preview query before creation: counts, recent" });
  });

  it("simulates editing an existing definition through updateFromPreview", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    validateTemplate(testCase, state, healthWidget);
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: healthWidget,
        definitionId: "existing-widget-1",
      }),
    ).toMatchObject({
      success: true,
      previewSession: { id: "preview-1" },
      persistenceTool: "customWidget_updateFromPreview",
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({
      error: "This edit preview must update its existing custom widget with customWidget_updateFromPreview",
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "health",
        params: {},
      }),
    ).toMatchObject({
      evidenceComplete: true,
      recommendedNextTool: "customWidget_updateFromPreview",
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_updateFromPreview"]);
    expect(
      executeActiveAssistantEvaluationTool(testCase, state, "customWidget_updateFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({
      id: "existing-widget-1",
      managementPath: "/manage/custom-widgets/edit/existing-widget-1",
    });
    expect(state.createdWidgets).toHaveLength(1);
    setSuccessfulFinalHandoff(state);
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
  });

  it("forces known-board placement through configure_widget and board_addItem with evidence", () => {
    const testCase = {
      ...getCase("fake-service-health"),
      placement: { targetBoardId: "board-home", targetBoardName: "Home" },
    };
    const state = createAssistantEvaluationState(false, testCase.placement);
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    validateTemplate(testCase, state, healthWidget);
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-1",
      requestId: "health",
      params: {},
    });

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({
      error: "Persist this preview with targetBoardId 'board-home' so the requested placement can be verified.",
      recovery: { recoverable: true, requiredNextTool: "customWidget_createFromPreview" },
    });
    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("required");
    const creation = executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
      previewSessionId: "preview-1",
      targetBoardId: "board-home",
    });
    expect(creation).toMatchObject({
      id: "created-fake-service-health-1",
      nextAction: {
        targetBoardId: "board-home",
        options: { definitionId: "created-fake-service-health-1" },
      },
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["configure_widget"]);
    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("required");

    const configured = executeActiveAssistantEvaluationTool(testCase, state, "configure_widget", {
      boardId: "board-home",
      boardName: "Home",
      kind: "customApi",
      summary: "Place the tested health widget",
      options: { definitionId: "created-fake-service-health-1" },
      integrationIds: [],
    });
    expect(configured).toEqual({
      boardId: "board-home",
      kind: "customApi",
      options: { definitionId: "created-fake-service-health-1" },
      integrationIds: [],
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["board_addItem"]);

    expect(
      executeActiveAssistantEvaluationTool(testCase, state, "board_addItem", {
        boardId: "board-home",
        kind: "customApi",
        options: { definitionId: "created-fake-service-health-1" },
        integrationIds: [],
      }),
    ).toEqual({ itemId: "item-fake-service-health-1" });
    expect(state.placementEvidence).toEqual([
      {
        widgetId: "created-fake-service-health-1",
        boardId: "board-home",
        itemId: "item-fake-service-health-1",
      },
    ]);
    setSuccessfulFinalHandoff(state);
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    expect(
      assessAssistantFinalResponse({
        text: "Created Homelab health, showing service health with manual refresh, and placed it on the Home board.",
        persistedWidgets: state.createdWidgets,
        maxCharacters: 600,
        requiredTerms: ["refresh"],
        placementEvidence: state.placementEvidence,
      }).passed,
    ).toBe(true);
  });

  it("requires one substantive concise handoff for every assistant case", () => {
    const persistedWidgets = [
      normalizeCustomWidgetAuthoringDefinition(customWidgetAuthoringDefinitionSchema.parse(healthWidget)),
    ];
    expect(
      assessAssistantFinalResponse({
        text: "Created Homelab health, showing service health with manual refresh and clear setup limits.",
        persistedWidgets,
        maxCharacters: 600,
        requiredTerms: [],
      }),
    ).toMatchObject({ passed: true, issues: [] });

    expect(
      assessAssistantFinalResponse({
        text: "Created Homelab health dashboard widget successfully for everyday use.",
        persistedWidgets,
        maxCharacters: 600,
        requiredTerms: [],
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        "The final response must briefly state what data or capability the widget shows.",
        "The final response must briefly state refresh or update behavior.",
      ]),
    );
    expect(
      assessAssistantFinalResponse({
        text: "Created Homelab health, showing service health with manual refresh.\nSaved with setup limits documented.",
        persistedWidgets,
        maxCharacters: 600,
        requiredTerms: [],
      }).issues,
    ).toContain("The final response must be one short paragraph without headings, lists, or code fences.");
  });

  it("requires actionable lifecycle transitions but permits completion and terminal failure prose", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("auto");
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("required");

    executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
      templateLines: ["<UnknownComponent />"],
    });
    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("required");

    state.failure = "The lifecycle service is unavailable";
    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("auto");
    state.failure = null;
    state.createdWidgets.push(
      normalizeCustomWidgetAuthoringDefinition(customWidgetAuthoringDefinitionSchema.parse(healthWidget)),
    );
    expect(getAssistantEvaluationToolChoice(state, 1)).toBe("auto");
  });

  it("batches context reads but keeps the first call when a provider mixes in lifecycle work", () => {
    const webSearch = { id: "search", function: { name: "web_search" } };
    const skill = { id: "skill", function: { name: "customWidget_getSkill" } };
    const reference = { id: "reference", function: { name: "customWidget_getReference" } };
    const validate = { id: "validate", function: { name: "customWidget_validateTemplate" } };
    const duplicatePreview = { id: "preview", function: { name: "customWidget_previewCreate" } };
    const contextSelection = selectSequentialCustomWidgetToolCalls([webSearch, skill, reference]);

    expect(contextSelection.selected).toEqual([webSearch, skill, reference]);
    expect(contextSelection.rejected).toEqual([]);

    const selection = selectSequentialCustomWidgetToolCalls([webSearch, validate, duplicatePreview]);

    expect(selection.selected).toEqual([webSearch]);
    expect(selection.rejected).toEqual([validate, duplicatePreview]);

    const customWidgetFirst = selectSequentialCustomWidgetToolCalls([validate, webSearch, duplicatePreview]);
    expect(customWidgetFirst.selected).toEqual([validate]);
    expect(customWidgetFirst.rejected).toEqual([webSearch, duplicatePreview]);

    const componentRepair = { id: "repair", function: { name: "customWidget_getComponent" } };
    const redundantRepair = { id: "redundant-repair", function: { name: "customWidget_getComponent" } };
    const repairSelection = selectSequentialCustomWidgetToolCalls([componentRepair, redundantRepair]);
    expect(repairSelection.selected).toEqual([componentRepair]);
    expect(repairSelection.rejected).toEqual([redundantRepair]);
  });

  it("tells the model which tools remain active without carrying stale names", () => {
    const instructions = appendActiveCustomWidgetToolInstruction("Author the requested widgets.", [
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
    ]);

    expect(instructions).toContain("customWidget_previewCreate");
    expect(instructions).not.toContain("customWidget_getComponents");
  });

  it("retains useful prior feedback while deduplicating retry noise", () => {
    const feedback = ["media-research: render overview and availability"];

    mergeAssistantEvaluationFeedback(feedback, [
      "The assistant repeated the same context request.",
      "The assistant repeated the same context request.",
    ]);

    expect(feedback).toEqual([
      "media-research: render overview and availability",
      "The assistant repeated the same context request.",
    ]);

    mergeAssistantEvaluationFeedback(
      feedback,
      Array.from({ length: 20 }, (_, index) => `new review issue ${index + 1}`),
    );
    expect(feedback).toHaveLength(16);
    expect(feedback[0]).toBe("media-research: render overview and availability");
    expect(feedback.at(-1)).toBe("new review issue 20");
  });

  it("replaces resolved retry diagnostics instead of carrying stale failures", () => {
    const feedback = ["media-research: old action binding failure"];

    replaceAssistantEvaluationFeedback(feedback, ["media-research: render totalResults"]);

    expect(feedback).toEqual(["media-research: render totalResults"]);
  });

  it("keeps semantic and review targets across a transient lifecycle failure", () => {
    expect(
      composeAssistantEvaluationFeedback(
        ["template: render totalResults"],
        ["media-research: improve hierarchy"],
        ["The provider returned an empty step"],
      ),
    ).toEqual([
      "template: render totalResults",
      "media-research: improve hierarchy",
      "The provider returned an empty step",
    ]);
  });

  it("keeps review retries focused on the highest-impact fixes per widget", () => {
    expect(
      selectAssistantEvaluationReviewFeedback(
        [
          { highestImpactFixes: ["A", "B", "C", "D"], problems: [] },
          { highestImpactFixes: ["E", "F", "G", "H"], problems: [] },
        ] as never,
        ["request-operations", "media-research"],
      ),
    ).toEqual([
      "request-operations: A",
      "request-operations: B",
      "request-operations: C",
      "media-research: E",
      "media-research: F",
      "media-research: G",
    ]);
  });

  it("does not carry preview-session-local failures into a fresh attempt", () => {
    expect(
      getPortableAssistantLifecycleFeedback([
        "customWidget_previewReviseTemplate: Preview session not found",
        "customWidget_previewReviseTemplate: Preview session revision changed from 0 to 1",
        "customWidget_validateTemplate: UNKNOWN_COMPONENT: 'Time' is not available",
      ]),
    ).toEqual(["customWidget_validateTemplate: UNKNOWN_COMPONENT: 'Time' is not available"]);
  });

  it("preserves the exact manifest path in deterministic retry feedback", () => {
    expect(
      formatAssistantDeterministicFeedback([
        {
          path: ["requests", "requestMovie", "invalidates"],
          message: "media-research: invalidate the search query after success.",
        },
      ]),
    ).toEqual(["requests.requestMovie.invalidates: media-research: invalidate the search query after success."]);
  });

  it("exposes the lazy production authoring and evidence lifecycle", () => {
    const names = customWidgetAssistantEvaluationToolDefinitions.map(({ function: definition }) => definition.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "web_search",
        "customWidget_getSkill",
        "customWidget_schema",
        "customWidget_getReference",
        "customWidget_getComponentCatalog",
        "customWidget_findComponents",
        "customWidget_getComponents",
        "customWidget_validateTemplate",
        "customWidget_previewCreate",
        "customWidget_previewReviseTemplate",
        "customWidget_previewQuery",
        "customWidget_previewAction",
        "customWidget_previewJournal",
        "customWidget_createFromPreview",
      ]),
    );
    expect(names).not.toContain("customWidget_validate");
  });

  it("starts with compact authoring context tools and stages later lifecycle tools by phase", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();
    const getActiveNames = () =>
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name);

    expect(getActiveNames()).toEqual(["web_search", "customWidget_getSkill"]);
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    expect(getActiveNames()).toEqual([
      "customWidget_getReference",
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_getExample",
      "customWidget_validateTemplate",
    ]);
    expect(getActiveNames()).not.toEqual(
      expect.arrayContaining(["customWidget_previewCreate", "customWidget_createFromPreview"]),
    );

    executeAssistantEvaluationTool(testCase, state, "customWidget_getComponents", {
      names: ["Stack", "TextInput", "Button"],
    });
    expect(getActiveNames()).toEqual(["customWidget_getReference", "customWidget_validateTemplate"]);

    validateTemplate(testCase, state, mediaResearchWidget);
    expect(getActiveNames()).toEqual([
      "customWidget_validateTemplate",
      "customWidget_previewCreate",
      "customWidget_previewReviseTemplate",
    ]);
  });

  it("stages saved-integration discovery after the skill like production", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState(true);
    const activeNames = () =>
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name);

    expect(activeNames()).toEqual(["web_search", "customWidget_getSkill"]);
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    expect(activeNames()).toEqual(expect.arrayContaining(["integration_getKinds", "integration_all"]));
  });

  it("compacts obsolete documentation and validation calls but retains the current preview", () => {
    const messages = [
      { role: "system" as const, content: "policy" },
      { role: "user" as const, content: "Create two widgets" },
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: "runtime-reference",
            type: "function" as const,
            function: { name: "customWidget_getReference", arguments: '{"name":"runtime"}' },
          },
        ],
      },
      { role: "tool" as const, tool_call_id: "runtime-reference", content: "authoritative runtime rules" },
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: "docs-1",
            type: "function" as const,
            function: { name: "customWidget_getComponent", arguments: '{"name":"Select"}' },
          },
        ],
      },
      { role: "tool" as const, tool_call_id: "docs-1", content: "large docs" },
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: "validate-1",
            type: "function" as const,
            function: { name: "customWidget_validateTemplate", arguments: '{"template":"old"}' },
          },
        ],
      },
      { role: "tool" as const, tool_call_id: "validate-1", content: '{"valid":true}' },
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: "preview-1",
            type: "function" as const,
            function: { name: "customWidget_previewCreate", arguments: '{"definition":{"name":"current"}}' },
          },
        ],
      },
      { role: "tool" as const, tool_call_id: "preview-1", content: '{"previewSession":{"id":"preview-1"}}' },
    ];

    const serialized = JSON.stringify(compactAssistantEvaluationMessages(messages, 1));

    expect(serialized).not.toContain("docs-1");
    expect(serialized).not.toContain("validate-1");
    expect(serialized).toContain("runtime-reference");
    expect(serialized).toContain("preview-1");
  });

  it("loads a compact skill entrypoint and never imposes an arbitrary component-document cap", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    const skill = executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});

    expect(JSON.stringify(skill)).toContain("customWidget_getReference");
    expect(JSON.stringify(skill)).not.toContain("# Bundled file:");
    const componentNames = [
      "Text",
      "Badge",
      "Card",
      "Stack",
      "Group",
      "Paper",
      "Image",
      "Button",
      "Alert",
      "Progress",
      "Title",
      "Divider",
    ];
    for (let phase = 0; phase < 6; phase += 1) {
      for (let index = 0; index < 2; index += 1) {
        const componentName = componentNames[phase * 2 + index];
        expect(
          executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: componentName }),
        ).toMatchObject({ name: componentName });
      }
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
          template: "<UnknownComponent />",
        }),
      ).toMatchObject({ valid: false });
    }
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getExample", { name: "service-dashboard" }),
    ).toMatchObject({ id: "service-dashboard" });
  });

  it("keeps a missing component lookup recoverable through one focused replacement search", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
      template: "<IconCheck />",
    });

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getComponent", { name: "IconCheck" }),
    ).toMatchObject({
      error: "Custom JSX component not found",
      recovery: {
        recoverable: true,
        kind: "component-not-found",
      },
      nextStep: expect.stringContaining("Do not retry"),
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_findComponents", "customWidget_getComponents", "customWidget_validateTemplate"]);
  });

  it("retrieves selected component docs in one bounded batch", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getComponents", {
        names: ["SubFetch", "ActionButton", "TextInput", "SubFetch"],
      }),
    ).toMatchObject({
      components: [
        expect.objectContaining({ name: "SubFetch" }),
        expect.objectContaining({ name: "ActionButton" }),
        expect.objectContaining({ name: "TextInput" }),
      ],
      notFound: [],
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_getReference", "customWidget_validateTemplate"]);
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getComponents", {
        names: ["Image", "Badge"],
      }),
    ).toMatchObject({ phaseComplete: true, components: [] });
  });

  it("returns a compact marker instead of reloading identical context", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "schema" }),
    ).toMatchObject({ name: "schema", content: expect.any(String) });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toContain("customWidget_getReference");
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "runtime" }),
    ).toMatchObject({ name: "runtime", content: expect.any(String) });
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "runtime" })).toEqual({
      contextAlreadyLoaded: true,
      nextStep: "Reuse the earlier result for this exact context request.",
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual([
      "customWidget_findComponents",
      "customWidget_getComponents",
      "customWidget_getComponent",
      "customWidget_getSharedProps",
      "customWidget_getExample",
      "customWidget_validateTemplate",
    ]);
    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
  });

  it("moves from focused discovery to batched docs and validation after four searches", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();
    for (let index = 0; index < 4; index += 1) {
      executeAssistantEvaluationTool(testCase, state, "customWidget_findComponents", {
        query: `capability set ${index}`,
      });
    }

    const activeNames = getActiveAssistantEvaluationToolDefinitions(state).map(
      ({ function: definition }) => definition.name,
    );
    expect(activeNames).toEqual(
      expect.arrayContaining([
        "customWidget_getComponents",
        "customWidget_getSharedProps",
        "customWidget_validateTemplate",
      ]),
    );
    expect(activeNames).not.toContain("customWidget_findComponents");
    expect(activeNames).not.toContain("customWidget_getExample");
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_findComponents", {
        query: "one more parallel search",
      }),
    ).toMatchObject({ phaseComplete: true, components: [] });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_validateTemplate"]);
  });

  it("flags wasteful advanced-authoring context and token use without limiting supported components", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();

    for (let index = 0; index < 5; index += 1) {
      executeAssistantEvaluationTool(testCase, state, "customWidget_findComponents", {
        query: `advanced capability ${index}`,
        limit: 16,
      });
    }
    executeAssistantEvaluationTool(testCase, state, "customWidget_getComponentCatalog", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_getExample", { name: "search-and-action" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getExample", { name: "service-dashboard" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getExample", { name: "pokedex" });
    state.modelInputTokens = 600_001;

    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual(
      expect.arrayContaining(["The assistant used 600001 model input tokens; the advanced-case budget is 600000."]),
    );
  });

  it("rejects visible narration attached to tool-call steps", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
    state.toolStepNarrations.push("I will now validate the widget before continuing.");

    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toContain(
      "The assistant included visible narration in 1 tool-call step; tool-call steps must contain no prose.",
    );
  });

  it("keeps optimistic revisions out of the built-in Assistant tool surface", () => {
    const revisionTool = customWidgetAssistantEvaluationToolDefinitions.find(
      ({ function: definition }) => definition.name === "customWidget_previewReviseTemplate",
    );

    expect(revisionTool?.function.parameters.properties).not.toHaveProperty("expectedRevision");
  });

  it("validates JSX independently, fully validates at preview, and persists only after query evidence", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget }),
    ).toMatchObject({
      error: "Validate this exact JSX template before sending the complete definition to preview.",
      recovery: {
        recoverable: true,
        requiredNextTool: "customWidget_validateTemplate",
      },
    });
    expect(validateTemplate(testCase, state, healthWidget)).toMatchObject({
      valid: true,
      templateDigest: expect.stringMatching(/^tpl-[a-f0-9]{16}$/u),
      validationId: expect.stringMatching(/^template:tpl-[a-f0-9]{16}$/u),
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(expect.arrayContaining(["customWidget_validateTemplate", "customWidget_previewCreate"]));
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).not.toContain("customWidget_findComponents");
    expect(
      executeActiveAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "schema" }),
    ).toEqual({
      error: "Tool 'customWidget_getReference' is not active in the current authoring phase.",
      activeTools: [
        "customWidget_validateTemplate",
        "customWidget_previewCreate",
        "customWidget_previewReviseTemplate",
      ],
    });
    expect(
      executeActiveAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget }),
    ).toMatchObject({
      success: true,
      previewSession: { id: "preview-1" },
      queries: [{ requestId: "health" }],
      actions: [],
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(
      expect.arrayContaining([
        "customWidget_previewQuery",
        "customWidget_previewAction",
        "customWidget_createFromPreview",
      ]),
    );
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Test every preview query before creation: health" });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        previewId: "preview-1",
        requestId: "health",
        params: {},
      }),
    ).toMatchObject({
      sessionId: "preview-1",
      requestId: "health",
      ok: true,
      status: 200,
      data: testCase.sampleResponse,
      evidenceComplete: true,
      recommendedNextTool: "customWidget_createFromPreview",
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_createFromPreview"]);
    expect(
      executeActiveAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-fake-service-health-1" });
    expect(state.createdWidgets).toHaveLength(1);
    setSuccessfulFinalHandoff(state);
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
  });

  it("identifies stale preview templates and flags repeated identical invalid input", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    const validated = validateTemplate(testCase, state, healthWidget) as { templateDigest: string };
    const staleDefinition = {
      ...healthWidget,
      templateLines: ["<Stack>", "  <Text>{data.health.status</Text>", "</Stack>"],
    };

    const first = executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
      definition: staleDefinition,
    });
    expect(first).toMatchObject({
      error: "Validate this exact JSX template before sending the complete definition to preview.",
      templateDigest: expect.stringMatching(/^tpl-[a-f0-9]{16}$/u),
      lastValidTemplateDigest: validated.templateDigest,
      diagnostics: [expect.objectContaining({ severity: "error" })],
      repeatedInvalidInput: false,
      invalidAttemptCount: 1,
      recovery: {
        requiredNextTool: "customWidget_validateTemplate",
      },
    });
    expect(first).not.toMatchObject({ templateDigest: validated.templateDigest });

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: staleDefinition,
      }),
    ).toMatchObject({
      failureFingerprint: (first as { failureFingerprint: string }).failureFingerprint,
      repeatedInvalidInput: true,
      invalidAttemptCount: 2,
    });
  });

  it("revises only the tested template and requires fresh evidence without resending the manifest", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    const revisedDefinition = {
      ...healthWidget,
      templateLines: [
        ...healthWidget.templateLines.slice(0, -1),
        '  <Text size="xs" c="dimmed">Verified response shape</Text>',
        "</Stack>",
      ],
    };

    validateTemplate(testCase, state, healthWidget);
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-1",
      requestId: "health",
      params: {},
    });
    validateTemplate(testCase, state, revisedDefinition);
    const revised = executeActiveAssistantEvaluationTool(testCase, state, "customWidget_previewReviseTemplate", {
      previewSessionId: "preview-1",
      expectedRevision: 0,
      templateLines: revisedDefinition.templateLines,
    });

    expect(revised).toMatchObject({
      success: true,
      evidenceReset: true,
      previewSession: { id: "preview-1", revision: 1 },
      queries: [{ requestId: "health" }],
    });
    expect(revised).not.toHaveProperty("definition");
    expect(state.previews.get("preview-1")?.widget).toMatchObject({
      sources: healthWidget.sources,
      requests: healthWidget.requests,
      options: healthWidget.options,
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toEqual({ error: "Test every preview query before creation: health" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-1",
      requestId: "health",
      params: {},
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_createFromPreview"]);
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-fake-service-health-1" });
    const createInputCharacters = state.toolCalls.find(
      (toolCall) => toolCall.name === "customWidget_previewCreate",
    )?.inputCharacters;
    const revisionInputCharacters = state.toolCalls.find(
      (toolCall) => toolCall.name === "customWidget_previewReviseTemplate",
    )?.inputCharacters;
    expect(revisionInputCharacters).toBeLessThan(createInputCharacters ?? 0);
    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
  });

  it("preserves tested preview evidence when a revision is unchanged", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, healthWidget);
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-1",
      requestId: "health",
      params: {},
    });

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewReviseTemplate", {
        sessionId: "preview-1",
        templateLines: healthWidget.templateLines,
      }),
    ).toMatchObject({
      unchanged: true,
      preservesPreviewEvidence: true,
      sessionId: "preview-1",
      recovery: {
        recoverable: true,
        kind: "unchanged-preview-revision",
      },
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(["customWidget_createFromPreview"]);
  });

  it("finishes current preview evidence before a prevalidated next-widget draft", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    const nextWidgetDraft = {
      ...healthWidget,
      templateLines: [...healthWidget.templateLines.slice(0, -1), "  <Text>Next widget draft</Text>", "</Stack>"],
    };

    validateTemplate(testCase, state, healthWidget);
    validateTemplate(testCase, state, nextWidgetDraft);
    executeActiveAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
      definition: healthWidget,
    });

    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual(expect.arrayContaining(["customWidget_previewQuery", "customWidget_previewAction"]));
  });

  it("normalizes invisible model formatting consistently between template validation and preview", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    const templateLines = healthWidget.templateLines.map((line, index) => (index === 1 ? `${line}\u200b` : line));
    const definition = { ...healthWidget, templateLines };

    expect(validateTemplate(testCase, state, definition)).toMatchObject({ valid: true, normalizedCharacters: 1 });
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition })).toMatchObject(
      { success: true, previewSession: { id: "preview-1" } },
    );
  });

  it("normalizes equivalent duplicated Assistant template formats to canonical templateLines", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
        template: healthWidget.templateLines.join("\n"),
        templateLines: healthWidget.templateLines,
      }),
    ).toMatchObject({ valid: true, diagnostics: [] });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget }),
    ).toMatchObject({ success: true, previewSession: { id: "preview-1" } });
  });

  it("only normalizes lossless Assistant preview definition mistakes", () => {
    const definition = {
      ...healthWidget,
      sources: {
        default: { ...healthWidget.sources.default, auth: { type: "none" } },
        bearer: { ...healthWidget.sources.default, auth: { type: "bearer" } },
        basic: { ...healthWidget.sources.default, auth: { type: "basic" } },
        preserved: {
          ...healthWidget.sources.default,
          auth: { type: "bearer", unexpected: true },
        },
      },
      options: {
        limit: { name: "limit", label: "Limit", control: "number", default: 10 },
        environment: { name: "Environment", label: "Environment", control: "text", default: "production" },
      },
      template: healthWidget.templateLines.join("\n"),
    };
    const { template: _template, ...definitionWithoutTemplate } = definition;

    expect(normalizeCustomWidgetLifecycleToolInput("customWidget_previewCreate", { definition })).toEqual({
      definition: {
        ...definitionWithoutTemplate,
        sources: {
          ...definition.sources,
          default: { ...healthWidget.sources.default, auth: "none" },
          bearer: { ...healthWidget.sources.default, auth: "bearer" },
          basic: { ...healthWidget.sources.default, auth: "basic" },
        },
        options: {
          limit: { label: "Limit", control: "number", default: 10 },
          environment: definition.options.environment,
        },
      },
    });
  });

  it("prefers templateLines when the duplicate template is empty", () => {
    expect(
      normalizeCustomWidgetLifecycleToolInput("customWidget_validateTemplate", {
        template: "",
        templateLines: healthWidget.templateLines,
      }),
    ).toEqual({ templateLines: healthWidget.templateLines });
  });

  it("preserves conflicting template formats for schema diagnostics", () => {
    const input = { template: "<Text>Different</Text>", templateLines: ["<Text>Original</Text>"] };

    expect(normalizeCustomWidgetLifecycleToolInput("customWidget_validateTemplate", input)).toBe(input);
    expect(
      normalizeCustomWidgetLifecycleToolInput("customWidget_previewCreate", {
        definition: { ...healthWidget, ...input },
      }),
    ).toEqual({ definition: { ...healthWidget, ...input } });
  });

  it("accepts an otherwise valid preview definition serialized once by the provider", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, healthWidget);

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: JSON.stringify(healthWidget),
      }),
    ).toMatchObject({ success: true, previewSession: { id: "preview-1" } });
  });

  it("explains invalid serialized preview JSON instead of returning a generic object type error", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: '{"name":"broken"}}',
      }),
    ).toMatchObject({
      error: "Definition is invalid",
      issues: [
        expect.objectContaining({
          path: "definition",
          message: expect.stringContaining("Pass definition directly as an object"),
        }),
      ],
    });
  });

  it("returns a bounded source excerpt for focused JSX repair", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();
    const result = executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
      template:
        '<Stack><SubFetch requestId="search" params={{ query: inputs.search }}}>{(result) => <Text>{result.totalResults}</Text>}</SubFetch></Stack>',
    });

    expect(result).toMatchObject({
      valid: false,
      diagnostics: [expect.objectContaining({ sourceExcerpt: expect.stringContaining("}}>") })],
      nextStep: expect.stringContaining("Repair the reported JSX errors"),
    });
    expect(state.retryFeedback).toEqual(
      expect.arrayContaining([expect.stringContaining("customWidget_validateTemplate: Unexpected token")]),
    );
    expect(JSON.stringify(result).length).toBeLessThan(1_000);
  });

  it("treats unknown component props as a repair target before preview", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    const result = executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
      template: '<Text futureMantineProp="yes">Status</Text>',
    });

    expect(result).toMatchObject({
      valid: true,
      nextStep: expect.stringContaining("Repair unknown component props"),
    });
  });

  it("rejects unchanged preview cycles instead of counting them as deliberate refinement", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();
    validateTemplate(testCase, state, healthWidget);
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget });

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget }),
    ).toEqual({
      error:
        "This unchanged definition already has a preview. Make a material improvement before another preview cycle.",
    });
  });

  it("starts fresh component discovery after persisting one widget in a coordinated set", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_findComponents", {
      query: "health status layout",
    });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getComponents", {
      names: ["Stack", "Text", "RefreshButton"],
    });
    validateTemplate(testCase, state, {
      ...healthWidget,
      templateLines: [...healthWidget.templateLines.slice(0, -1), "  <Text>Superseded draft</Text>", "</Stack>"],
    });
    validateTemplate(testCase, state, healthWidget);
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-1",
      requestId: "health",
      params: {},
    });
    executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
      previewSessionId: "preview-1",
    });

    const activeNames = getActiveAssistantEvaluationToolDefinitions(state).map(
      ({ function: definition }) => definition.name,
    );
    expect(activeNames).toEqual(expect.arrayContaining(["customWidget_findComponents", "customWidget_getComponents"]));
  });

  it("completes two advanced Seerr widgets, every query and action, from one research pass", () => {
    const testCase = getCase("seerr-media-workflows");
    const state = createAssistantEvaluationState();

    executeAssistantEvaluationTool(testCase, state, "web_search", { query: testCase.research?.query });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getSkill", {});
    executeAssistantEvaluationTool(testCase, state, "customWidget_findComponents", {
      query: "TextInput SubFetch Image Card Badge ActionButton responsive layout",
      limit: 16,
    });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "schema" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "runtime" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "security" });

    expect(validateTemplate(testCase, state, requestOperationsWidget)).toMatchObject({ valid: true });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: requestOperationsWidget,
      }),
    ).toMatchObject({
      queries: expect.arrayContaining([
        expect.objectContaining({ requestId: "counts" }),
        expect.objectContaining({ requestId: "recent" }),
      ]),
      actions: expect.arrayContaining([
        expect.objectContaining({
          requestId: "approve",
          requiredParams: ["requestId"],
          invalidates: ["counts", "recent"],
        }),
        expect.objectContaining({
          requestId: "decline",
          requiredParams: ["requestId"],
          invalidates: ["counts", "recent"],
        }),
      ]),
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-1",
        requestId: "counts",
        params: {},
      }),
    ).toMatchObject({ ok: false, requiredNextTool: "customWidget_configurationRequestUser" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      previewSessionId: "preview-1",
      sourceId: "default",
    });
    resumeAssistantEvaluationCredentialRequests(state);
    executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      requestId: "configuration-1",
    });
    for (const requestId of ["counts", "recent"]) {
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
          sessionId: "preview-1",
          requestId,
          params: {},
        }),
      ).toMatchObject({ ok: true, status: 200 });
    }
    for (const requestId of ["approve", "decline"]) {
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_previewAction", {
          sessionId: "preview-1",
          requestId,
          params: { requestId: 91 },
        }),
      ).toMatchObject({ ok: true, status: 0, simulated: true });
    }
    executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
      previewSessionId: "preview-1",
    });

    expect(validateTemplate(testCase, state, mediaResearchWidget)).toMatchObject({ valid: true });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", {
        definition: mediaResearchWidget,
      }),
    ).toMatchObject({
      queries: [{ requestId: "search", requiredParams: ["query", "page"] }],
      actions: expect.arrayContaining([
        expect.objectContaining({ requestId: "requestMovie", requiredParams: ["mediaId"], invalidates: ["search"] }),
        expect.objectContaining({ requestId: "requestSeries", requiredParams: ["mediaId"], invalidates: ["search"] }),
      ]),
    });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
        sessionId: "preview-2",
        requestId: "search",
        params: { query: "matrix", page: 1 },
      }),
    ).toMatchObject({ ok: false, requiredNextTool: "customWidget_configurationRequestUser" });
    executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      previewSessionId: "preview-2",
      sourceId: "default",
    });
    resumeAssistantEvaluationCredentialRequests(state);
    executeAssistantEvaluationTool(testCase, state, "customWidget_configurationRequestUser", {
      requestId: "configuration-2",
    });
    executeAssistantEvaluationTool(testCase, state, "customWidget_previewQuery", {
      sessionId: "preview-2",
      requestId: "search",
      params: { query: "matrix", page: 1 },
    });
    for (const requestId of ["requestMovie", "requestSeries"]) {
      expect(
        executeAssistantEvaluationTool(testCase, state, "customWidget_previewAction", {
          sessionId: "preview-2",
          requestId,
          params: { mediaId: 603 },
        }),
      ).toMatchObject({ ok: true, status: 0, simulated: true });
    }
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewJournal", {
        sessionId: "preview-2",
      }),
    ).toMatchObject({ entries: expect.arrayContaining([expect.objectContaining({ kind: "action" })]) });
    executeAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
      previewSessionId: "preview-2",
    });

    expect(state.createdWidgets.map(({ name }) => name)).toEqual(["Seerr request operations", "Seerr media research"]);
    expect(state.calledTools.filter((name) => name === "web_search")).toHaveLength(1);
    setSuccessfulFinalHandoff(state);
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
    expect(getDeterministicEvaluationSuiteIssues(testCase, state.createdWidgets)).toEqual([]);
    expect(getDeterministicEvaluationSuiteIssues(testCase, state.createdWidgets.slice(1))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Create exactly 2 independent widgets; received 1." }),
      ]),
    );
  });

  it("routes path- and method-specific fixtures and requires manual parameters", () => {
    const testCase = getCase("seerr-media-workflows");
    const normalizedWidget = normalizeCustomWidgetAuthoringDefinition(
      customWidgetAuthoringDefinitionSchema.parse(mediaResearchWidget),
    );
    const searchRequest = normalizedWidget.requests.search;
    const actionRequest = normalizedWidget.requests.requestMovie;
    if (!searchRequest || !actionRequest) throw new Error("Seerr fixture requests are missing");

    expect(getAssistantEvaluationPreviewResponse(testCase, searchRequest)).toMatchObject({ totalResults: 2 });
    expect(getAssistantEvaluationPreviewResponse(testCase, actionRequest)).toMatchObject({ id: 93 });
    expect(getRequiredAssistantEvaluationRequestParams(searchRequest)).toEqual(["query", "page"]);
    expect(getRequiredAssistantEvaluationRequestParams(actionRequest)).toEqual(["mediaId"]);
  });
});

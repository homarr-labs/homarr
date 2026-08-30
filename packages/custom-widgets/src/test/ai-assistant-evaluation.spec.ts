import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import {
  assistantEvaluationToolRequestOptions,
  assistantEvaluationReasoningOptions,
  compactAssistantEvaluationMessages,
  composeAssistantEvaluationFeedback,
  createAssistantEvaluationState,
  customWidgetAssistantEvaluationToolDefinitions,
  executeAssistantEvaluationTool,
  executeActiveAssistantEvaluationTool,
  formatAssistantDeterministicFeedback,
  getActiveAssistantEvaluationToolDefinitions,
  getAssistantEvaluationMaxOutputTokens,
  getAssistantEvaluationEfficiencyIssues,
  getAssistantEvaluationLifecycleIssues,
  getAssistantEvaluationPreviewResponse,
  getAssistantJudgeFloor,
  getPortableAssistantLifecycleFeedback,
  getRequiredAssistantEvaluationRequestParams,
  mergeAssistantEvaluationFeedback,
  replaceAssistantEvaluationFeedback,
  selectAssistantEvaluationReviewFeedback,
} from "../../scripts/ai-assistant-evaluation";
import {
  appendActiveCustomWidgetToolInstruction,
  selectSequentialCustomWidgetToolCalls,
} from "../core/assistant-tool-step";
import { getDeterministicEvaluationSuiteIssues } from "../../scripts/ai-evaluation";
import {
  customWidgetAuthoringDefinitionSchema,
  normalizeCustomWidgetAuthoringDefinition,
} from "../core/custom-jsx-schema";

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

describe("Custom Widget assistant live evaluation harness", () => {
  it("keeps the production-sized default while allowing a bounded low-credit live-evaluation override", () => {
    expect(getAssistantEvaluationMaxOutputTokens(undefined)).toBe(32_768);
    expect(getAssistantEvaluationMaxOutputTokens("10000")).toBe(10_000);
    expect(getAssistantEvaluationMaxOutputTokens("2048")).toBe(4_096);
    expect(getAssistantEvaluationMaxOutputTokens("not-a-number")).toBe(32_768);
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
    expect(assistantEvaluationReasoningOptions).toEqual({ effort: "medium", exclude: true });
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

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "schema" }),
    ).toMatchObject({ name: "schema", content: expect.any(String) });
    expect(executeAssistantEvaluationTool(testCase, state, "customWidget_getReference", { name: "schema" })).toEqual({
      contextAlreadyLoaded: true,
      nextStep: "Reuse the earlier result for this exact context request.",
    });
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
    ).toEqual({
      error: "Validate this exact JSX template before sending the complete definition to preview.",
    });
    expect(validateTemplate(testCase, state, healthWidget)).toMatchObject({ valid: true });
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
    });
    expect(
      getActiveAssistantEvaluationToolDefinitions(state).map(({ function: definition }) => definition.name),
    ).toEqual([
      "customWidget_validateTemplate",
      "customWidget_previewReviseTemplate",
      "customWidget_createFromPreview",
    ]);
    expect(
      executeActiveAssistantEvaluationTool(testCase, state, "customWidget_createFromPreview", {
        previewSessionId: "preview-1",
      }),
    ).toMatchObject({ id: "created-fake-service-health-1" });
    expect(state.createdWidgets).toHaveLength(1);
    expect(getAssistantEvaluationLifecycleIssues(testCase, state)).toEqual([]);
    expect(getAssistantEvaluationEfficiencyIssues(testCase, state)).toEqual([]);
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

  it("normalizes duplicated Assistant template formats to canonical templateLines", () => {
    const testCase = getCase("fake-service-health");
    const state = createAssistantEvaluationState();

    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_validateTemplate", {
        template: "<Broken",
        templateLines: healthWidget.templateLines,
      }),
    ).toMatchObject({ valid: true, diagnostics: [] });
    expect(
      executeAssistantEvaluationTool(testCase, state, "customWidget_previewCreate", { definition: healthWidget }),
    ).toMatchObject({ success: true, previewSession: { id: "preview-1" } });
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

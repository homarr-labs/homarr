import assert from "node:assert/strict";

import type {
  AssistantConversationTurnUsage,
  AssistantConversationUsage,
  AssistantRequestStep,
  AssistantRequestTelemetry,
  AssistantUsage,
} from "../../../../apps/nextjs/src/components/assistant/assistant-message-metadata.ts";
import type { BenchmarkCase, BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const contextFile = "apps/nextjs/src/components/assistant/assistant-conversation-context.tsx";
const metadataFile = "apps/nextjs/src/components/assistant/assistant-message-metadata.ts";
const objectFile = "packages/common/src/object.ts";

type Message = { id: string; metadata: unknown };
type ConversationResult = {
  usage: AssistantConversationUsage;
  messageIds: [string, string][];
};
type GenerationQuery = {
  data?: { complete: boolean; generations: Partial<AssistantRequestStep>[] };
};
type TurnResult = { usage: AssistantUsage; telemetry: AssistantRequestTelemetry };
type MetadataCounts = {
  telemetryNormalizations: number;
  normalizedStepArrays: number;
  normalizedStepObjects: number;
  sourceArraysAllocated: number;
};
type StepCounts = { mapArraysAllocated: number; mapVisits: number; someVisits: number; reduceVisits: number };

function at<T>(values: T[], index: number): T {
  const value = values[index];
  assert.ok(value !== undefined, `Missing fixture/result at index ${index}`);
  return value;
}

const makeStep = (
  index: number,
  sourceCount = 0,
): AssistantRequestStep & {
  webSearchSources: NonNullable<AssistantRequestStep["webSearchSources"]>;
} => ({
  index: index + 1,
  durationMs: 1000 + index,
  modelDurationMs: 800 + index,
  toolDurationMs: 200,
  inputTokens: 1000 + index,
  outputTokens: 50 + index,
  cachedInputTokens: index % 3,
  reasoningTokens: index % 5,
  generationTimeMs: 500 + index,
  cost: index / 100_000,
  upstreamCost: index / 200_000,
  cacheDiscount: index / 300_000,
  fallbackCount: index % 2,
  fallbackLatencyMs: index * 2,
  generationId: `generation-${index}`,
  webSearchSources: Array.from({ length: sourceCount }, (_, source) => ({
    url: `https://example.com/source/${source % 4}`,
    title: ` Source ${source} `,
  })),
});

const makeMessages = (count: number, stepCount: number, sourceCount: number): Message[] =>
  Array.from({ length: count }, (_message, index) => {
    let metadata: unknown;
    if (index % 11 !== 0) {
      metadata = {
        usage: index % 3 === 0 ? { inputTokens: index, outputTokens: 0, cachedInputTokens: -1 } : undefined,
        custom: {
          telemetry: {
            requestId: `request-${Math.floor(index / 2)}`,
            provider: "openrouter",
            modelId: "example/model",
            startedAt: "2026-10-11T10:00:00.000Z",
            contextLength: 128_000,
            contextUsed: 1000 + index,
            steps: Array.from({ length: stepCount }, (_step, step) => makeStep(step, sourceCount)),
            webSearchSources: [
              ...makeStep(0, sourceCount).webSearchSources,
              { url: "javascript:alert(1)" },
              { url: "https://user:password@example.com/private" },
              null,
            ],
          },
        },
      };
    }
    return { id: `message-${index}`, metadata };
  });

const duplicateMessages = makeMessages(9, 2, 2);
const duplicateMetadata = at(duplicateMessages, 8).metadata as { custom: { telemetry: { requestId: string } } };
duplicateMetadata.custom.telemetry.requestId = "request-0";
const conversationFixtures: Message[][] = [
  makeMessages(6, 1, 0),
  makeMessages(20, 4, 3),
  makeMessages(120, 8, 12),
  duplicateMessages,
  [
    { id: "null", metadata: null },
    { id: "missing", metadata: undefined },
    { id: "malformed", metadata: { custom: { telemetry: { requestId: 42 } } } },
  ],
];

function metadataBindings(ctx: BenchmarkContext, side: Side, counts?: MetadataCounts) {
  const isRecord = ctx.evaluate<(value: unknown) => boolean>(side, objectFile, "isRecord");
  const getFiniteNonNegativeNumber = ctx.evaluate<(value: unknown) => number | undefined>(
    side,
    metadataFile,
    "getFiniteNonNegativeNumber",
  );
  const rawSources = ctx.evaluate<(value: unknown) => unknown[]>(side, metadataFile, "getWebSearchSources", {
    isRecord,
  });
  let getWebSearchSources = rawSources;
  if (counts) {
    getWebSearchSources = (value) => {
      counts.sourceArraysAllocated++;
      return rawSources(value);
    };
  }
  const rawTelemetry = ctx.evaluate<(metadata: unknown) => AssistantRequestTelemetry | null>(
    side,
    metadataFile,
    "getAssistantTelemetry",
    { isRecord, getFiniteNonNegativeNumber, getWebSearchSources },
  );
  let getAssistantTelemetry = rawTelemetry;
  if (counts) {
    getAssistantTelemetry = (metadata) => {
      counts.telemetryNormalizations++;
      const telemetry = rawTelemetry(metadata);
      if (telemetry) {
        counts.normalizedStepArrays++;
        counts.normalizedStepObjects += telemetry.steps.length;
      }
      return telemetry;
    };
  }
  const getAssistantUsage = ctx.evaluate<(metadata: unknown) => AssistantUsage | null>(
    side,
    metadataFile,
    "getAssistantUsage",
    { isRecord, getFiniteNonNegativeNumber },
  );
  const sumReportedStepMetric = ctx.evaluate(side, metadataFile, "sumReportedStepMetric");
  const getAssistantConversationUsage = ctx.evaluate(side, metadataFile, "getAssistantConversationUsage", {
    getAssistantTelemetry,
    getAssistantUsage,
    sumReportedStepMetric,
  });
  return { getAssistantTelemetry, getAssistantConversationUsage };
}

function conversationOperation(ctx: BenchmarkContext, side: Side, counts?: MetadataCounts) {
  const source = ctx.source(side, contextFile);
  let start = "  const metadata = useMemo(";
  if (source.includes("  const { usage, messageIdByRequestId } = useMemo(")) {
    start = "  const { usage, messageIdByRequestId } = useMemo(";
  }
  return ctx.evaluate<(messages: Message[]) => ConversationResult>(
    side,
    contextFile,
    { kind: "span", start, end: "  const breakdown = useMemo(" },
    { ...metadataBindings(ctx, side, counts), useMemo: (calculate: () => unknown) => calculate() },
    {
      parameters: ["messages"],
      returnExpression: "({ usage, messageIds: [...messageIdByRequestId.entries()] })",
    },
  );
}

function countedSteps(steps: AssistantRequestStep[], counts: StepCounts): AssistantRequestStep[] {
  const track = <T,>(values: T[]): T[] =>
    new Proxy(values, {
      get(target, key, receiver) {
        if (key === "map") {
          return (callback: (value: T, index: number, array: T[]) => unknown) => {
            counts.mapArraysAllocated++;
            return track(
              target.map((value, index) => {
                counts.mapVisits++;
                return callback(value, index, receiver);
              }),
            );
          };
        }
        if (key === "some") {
          return (callback: (value: T, index: number, array: T[]) => unknown) =>
            target.some((value, index) => {
              counts.someVisits++;
              return callback(value, index, receiver);
            });
        }
        if (key === "reduce") {
          return (callback: (total: unknown, value: T, index: number, array: T[]) => unknown, initial: unknown) =>
            target.reduce((total, value, index) => {
              counts.reduceVisits++;
              return callback(total, value, index, receiver);
            }, initial);
        }
        return Reflect.get(target, key, receiver);
      },
    });
  return track(steps);
}

function makeTurn(stepCount: number): AssistantConversationTurnUsage {
  const telemetry: AssistantRequestTelemetry = {
    requestId: "request-1",
    provider: "openrouter",
    modelId: "example/model",
    startedAt: "2026-10-11T10:00:00.000Z",
    cost: 7,
    costType: "estimated",
    contextLength: 128_000,
    steps: Array.from({ length: stepCount }, (_, index) => makeStep(index)),
  };
  return {
    requestId: telemetry.requestId,
    provider: telemetry.provider,
    modelId: telemetry.modelId,
    startedAt: telemetry.startedAt,
    usage: { inputTokens: 999, outputTokens: 111, totalTokens: 1110, reasoningTokens: 777 },
    telemetry,
  };
}

const complete = { data: { complete: true, generations: [] } };
const pending = { data: { complete: false, generations: [] } };
const partial = makeTurn(8);
const partialStep = at(partial.telemetry.steps, 7);
delete partialStep.reasoningTokens;
delete partialStep.cost;
const zero = makeTurn(1);
Object.assign(at(zero.telemetry.steps, 0), {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  reasoningTokens: 0,
  generationTimeMs: 0,
  cost: 0,
  upstreamCost: 0,
  cacheDiscount: 0,
  fallbackCount: 0,
  fallbackLatencyMs: 0,
});
const turnFixtures: { name: string; turn: AssistantConversationTurnUsage; generationQuery: GenerationQuery }[] = [
  { name: "empty-complete", turn: makeTurn(0), generationQuery: complete },
  { name: "one-complete", turn: makeTurn(1), generationQuery: complete },
  { name: "four-complete", turn: makeTurn(4), generationQuery: complete },
  { name: "long-complete", turn: makeTurn(32), generationQuery: complete },
  { name: "partial-complete", turn: partial, generationQuery: complete },
  { name: "zero-complete", turn: zero, generationQuery: complete },
  { name: "pending", turn: makeTurn(8), generationQuery: pending },
  { name: "no-query-data", turn: makeTurn(8), generationQuery: {} },
  {
    name: "collapsed-cached-complete",
    turn: makeTurn(4),
    generationQuery: {
      data: {
        complete: true,
        generations: Array.from({ length: 4 }, (_, index) => ({
          generationId: `generation-${index}`,
          inputTokens: 10,
          outputTokens: 2,
          cachedInputTokens: 0,
          reasoningTokens: 0,
          generationTimeMs: 10,
          cost: 0,
        })),
      },
    },
  },
];

function turnOperation(ctx: BenchmarkContext, side: Side) {
  return ctx.evaluate<(turn: AssistantConversationTurnUsage, generationQuery: GenerationQuery) => TurnResult>(
    side,
    contextFile,
    {
      kind: "span",
      start: "  const generationById = new Map(",
      end: "  const displayedThroughput = telemetry.providerOutputTokensPerSecond",
    },
    {},
    { parameters: ["turn", "generationQuery"], returnExpression: "({ usage, telemetry })" },
  );
}

export const cases: BenchmarkCase[] = [
  benchmarkPair({
    id: "NA-001",
    title: "Normalize conversation metadata once for usage and request IDs",
    files: [contextFile, metadataFile, objectFile],
    iterations: 50,
    fixture:
      "Five message arrays: 6/20/120 messages with 1/4/8 steps and 0/3/12 sources per step, 9 messages with nonconsecutive duplicate request IDs, plus null/missing/malformed metadata. Duplicate IDs preserve first insertion order and last message overwrite; usage includes zero/invalid/absent token fields.",
    description:
      "Times actual extracted ConversationContext memo bodies and metadata declarations with immediate useMemo callbacks. No React commit, network, browser, or perceived-latency claim. Counts run separately from timing.",
    metricUnits: {
      telemetryNormalizations: "calls",
      normalizedStepArrays: "arrays",
      normalizedStepObjects: "objects",
      sourceArraysAllocated: "arrays",
    },
    prepare(ctx) {
      const before = conversationOperation(ctx, "before");
      const after = conversationOperation(ctx, "after");
      return {
        before: () => conversationFixtures.map(before),
        after: () => conversationFixtures.map(after),
        verify(beforeResult, afterResult) {
          assert.deepEqual(afterResult, beforeResult);
          const results = afterResult as ConversationResult[];
          assert.equal(at(results, 0).messageIds.find(([requestId]) => requestId === "request-0")?.[1], "message-1");
          assert.equal(at(results, 1).messageIds.find(([requestId]) => requestId === "request-1")?.[1], "message-3");
          const duplicateResult = at(results, 3);
          assert.deepEqual(at(duplicateResult.messageIds, 0), ["request-0", "message-8"]);
          assert.equal(at(duplicateResult.usage.turns, 0).requestId, "request-0");
        },
        metrics(_result, side) {
          const counts = {
            telemetryNormalizations: 0,
            normalizedStepArrays: 0,
            normalizedStepObjects: 0,
            sourceArraysAllocated: 0,
          };
          const counted = conversationOperation(ctx, side, counts);
          for (const fixture of conversationFixtures) counted(fixture);
          return counts;
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_contexts-01",
    title: "Compute each complete provider metric once per turn",
    files: [contextFile],
    iterations: 300,
    fixture:
      "Nine turn states with 0/1/4/8/32 steps: complete, missing per-step metrics, complete zero totals, pending/no query data, and cached complete provider generations after collapse. Actual step merge and all-step metric reducers are executed.",
    description:
      "Times the actual ConversationTurn span from generationById through usage/telemetry construction. Collapsed cached data remains supplied because it contributes to the summary; no JSX/browser commit is measured. Array traversal/allocation instrumentation runs separately.",
    metricUnits: {
      mapArraysAllocated: "arrays",
      mapVisits: "step visits",
      someVisits: "step visits",
      reduceVisits: "step visits",
    },
    prepare(ctx) {
      const before = turnOperation(ctx, "before");
      const after = turnOperation(ctx, "after");
      const run = (operation: typeof before) =>
        turnFixtures.map(({ turn, generationQuery }) => operation(turn, generationQuery));
      return {
        before: () => run(before),
        after: () => run(after),
        verify(beforeResult, afterResult) {
          assert.deepEqual(afterResult, beforeResult);
          const results = afterResult as TurnResult[];
          const partialResult = at(results, 4);
          const zeroResult = at(results, 5);
          assert.equal(partialResult.usage.reasoningTokens, 777);
          assert.equal(partialResult.telemetry.costType, "estimated");
          assert.equal(zeroResult.usage.totalTokens, 0);
          assert.equal(zeroResult.telemetry.cost, 0);
          assert.equal(zeroResult.telemetry.costType, "reported");
          assert.equal(at(results, 6).usage.totalTokens, 1110);
          assert.equal(at(results, 8).usage.totalTokens, 48);
        },
        metrics(_result, side) {
          const counts = { mapArraysAllocated: 0, mapVisits: 0, someVisits: 0, reduceVisits: 0 };
          const operation = turnOperation(ctx, side);
          for (const { turn, generationQuery } of turnFixtures) {
            operation(
              { ...turn, telemetry: { ...turn.telemetry, steps: countedSteps(turn.telemetry.steps, counts) } },
              generationQuery,
            );
          }
          return counts;
        },
      };
    },
  }),
];

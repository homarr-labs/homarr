import type { RouterClient } from "@orpc/server";

import type { BackendPrincipal } from "../../../../../packages/api/src/nitro/context";
import type { createAssistantProcedures } from "../../../../../packages/api/src/nitro/routers/assistant";
import type {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderIds,
  assistantProviderPresets,
  assistantReasoningModes,
  getAssistantModelOptionLabel,
} from "../../../../../packages/definitions/src/assistant";
import type { AssistantMessage } from "./messages";

export interface AssistantFeatureClient {
  assistant: RouterClient<ReturnType<typeof createAssistantProcedures>>;
}

export type AssistantThread = Awaited<ReturnType<AssistantFeatureClient["assistant"]["getThread"]>>;
export type AssistantConfiguration = Awaited<ReturnType<AssistantFeatureClient["assistant"]["getAdminConfiguration"]>>;
export type AssistantModels = Awaited<ReturnType<AssistantFeatureClient["assistant"]["discoverModels"]>>;
export type AssistantContextEntities = Awaited<ReturnType<AssistantFeatureClient["assistant"]["getContextEntities"]>>;
export type AssistantProvider = AssistantConfiguration["provider"];
export type AssistantReasoning = (typeof assistantReasoningModes)[number];
export type AssistantAppendInput = Parameters<AssistantFeatureClient["assistant"]["appendMessage"]>[0];

export interface AssistantDomain {
  readonly providerIds: typeof assistantProviderIds;
  readonly providerPresets: typeof assistantProviderPresets;
  readonly reasoningModes: typeof assistantReasoningModes;
  readonly canUseServerTools: typeof assistantProviderCanUseOpenRouterServerTools;
  readonly modelLabel: typeof getAssistantModelOptionLabel;
}

export type AssistantAccess =
  | { readonly kind: "held"; readonly reason: string }
  | {
      readonly kind: "authenticated";
      readonly principal: Extract<BackendPrincipal, { kind: "authenticated" }>;
      readonly cacheScope: string;
      readonly signal: AbortSignal;
      readonly readOnly: boolean;
    };

export type AssistantTranslate = (key: string, values?: Record<string, string | number>) => string;

export interface AssistantFeatureCopy {
  readonly unsupportedMessage: string;
  readonly richPartsUnavailable: string;
  readonly settlementUnknown: string;
  readonly unconfirmedMessage: string;
  readonly clearCredentialsTitle: string;
  readonly clearCredentialsDescription: string;
  readonly clearCredentialsAction: string;
}

export interface AssistantGenerationRequest {
  readonly id: string;
  readonly modelId: string;
  readonly reasoning: AssistantReasoning;
  readonly messages: readonly AssistantMessage[];
  readonly clientContext: { readonly pathname: string; readonly timeZone?: string };
}

export type AssistantGenerationOutcome =
  | { readonly kind: "completed" }
  | { readonly kind: "cancelled" }
  | { readonly kind: "failed"; readonly reason: "model" | "provider" | "transport" };

export interface AssistantGenerationRun {
  readonly messages: AsyncIterable<unknown>;
  readonly settled: Promise<AssistantGenerationOutcome>;
  cancel(): void;
}

export type AssistantGenerationBinding =
  | { readonly kind: "held"; readonly reason: string }
  | {
      readonly kind: "available";
      start(request: AssistantGenerationRequest, signal: AbortSignal): AssistantGenerationRun;
    };

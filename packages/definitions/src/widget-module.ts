import type { AtLeastOneOf } from "@homarr/common/types";

import type { IntegrationCategory, IntegrationKind } from "./integration";

export type WidgetModuleIconName = `Icon${string}`;
export type WidgetModuleOperationKind = "query" | "mutation" | "subscription" | "route";

export interface WidgetModuleClientPolicy {
  refetchIntervalSeconds?: number | null;
  staleTimeSeconds?: number;
  persist?: boolean;
}

export interface WidgetModuleServerCachePolicy {
  namespace: string;
  ttlMs: number;
  staleIfErrorTtlMs?: number;
  scope: "integration" | "shared" | "private";
}

export interface WidgetModuleOperation {
  name: string;
  kind?: WidgetModuleOperationKind;
  path: readonly [string, ...string[]];
  client?: WidgetModuleClientPolicy;
  serverCache?: WidgetModuleServerCachePolicy;
}

type WidgetModuleIntegrationSelection =
  | {
      categories: Readonly<AtLeastOneOf<IntegrationCategory>>;
      kinds?: readonly IntegrationKind[];
    }
  | {
      categories?: readonly IntegrationCategory[];
      kinds: Readonly<AtLeastOneOf<IntegrationKind>>;
    };

export type WidgetModuleIntegrationCapability = WidgetModuleIntegrationSelection & {
  excludeKinds?: readonly IntegrationKind[];
  connectionOptional?: true;
  serverMaxIntegrations?: number;
};

export interface WidgetModuleRouterRegistration {
  namespace: string;
  module: string;
  exportName: string;
  additionalWidgetKinds?: readonly string[];
  mcp?: true | string;
}

export interface WidgetModuleDocumentation {
  slug: string;
  sourceDirectory: string;
}

/**
 * Pure authoring contract for a vertical widget module.
 *
 * This descriptor intentionally contains import paths instead of importing
 * client or server implementations. The sync tool turns them into explicit
 * static imports for Next.js and Turbopack without crossing runtime boundaries.
 */
export interface WidgetModuleDefinition {
  kind: string;
  icon: WidgetModuleIconName;
  clientEntry: string;
  documentation: WidgetModuleDocumentation;
  defaultSize?: Readonly<{ width: number; height: number }>;
  displayNameFromIntegration?: true;
  integration?: WidgetModuleIntegrationCapability;
  operations?: readonly WidgetModuleOperation[];
  routers?: readonly WidgetModuleRouterRegistration[];
}

export const defineWidgetModule = <const TDefinition extends WidgetModuleDefinition>(definition: TDefinition) =>
  definition;

export type WidgetServerPermission =
  | "public"
  | "authenticated"
  | "integration-query"
  | "integration-interact"
  | "custom";

export interface WidgetServerInputSchema<TInput> {
  parseAsync: (input: unknown) => Promise<TInput>;
}

export interface WidgetServerContext<TServices = unknown, TAuthorization = unknown> {
  services: TServices;
  authorization: TAuthorization;
  signal: AbortSignal;
}

export interface WidgetServerOperationDefinition<TInput, TOutput, TContext = WidgetServerContext> {
  kind: "query" | "mutation";
  permission: WidgetServerPermission;
  input: WidgetServerInputSchema<TInput>;
  cache?: WidgetModuleServerCachePolicy;
  resolve: (context: TContext, input: TInput) => Promise<TOutput>;
}

export interface WidgetServerSubscriptionDefinition<TInput, TOutput, TContext = WidgetServerContext> {
  kind: "subscription";
  permission: WidgetServerPermission;
  input: WidgetServerInputSchema<TInput>;
  transport: "sse" | "websocket";
  subscribe: (context: TContext, input: TInput) => AsyncIterable<TOutput>;
}

export interface WidgetServerRouteDefinition<TRequest = unknown, TResponse = unknown, TContext = WidgetServerContext> {
  kind: "route";
  permission: WidgetServerPermission;
  handle: (context: TContext, request: TRequest) => Promise<TResponse>;
}

export const defineWidgetServerOperation = <TInput, TOutput, TContext = WidgetServerContext>(
  operation: WidgetServerOperationDefinition<TInput, TOutput, TContext>,
) => operation;

export const defineWidgetServerSubscription = <TInput, TOutput, TContext = WidgetServerContext>(
  subscription: WidgetServerSubscriptionDefinition<TInput, TOutput, TContext>,
) => subscription;

export const defineWidgetServerRoute = <TRequest, TResponse, TContext = WidgetServerContext>(
  route: WidgetServerRouteDefinition<TRequest, TResponse, TContext>,
) => route;

export const defineWidgetServerModule = <
  const TModule extends {
    operations?: Readonly<Record<string, object>>;
    subscriptions?: Readonly<Record<string, object>>;
    routes?: Readonly<Record<string, object>>;
  },
>(
  module: TModule,
) => module;

import type { IntegrationKind } from "@homarr/definitions";

import type { IIntegrationErrorHandler } from "../base/errors/handler";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import type { SessionStoreResources } from "../base/session-store";
import type { TestingResult } from "../base/test-connection/test-connection-service";

export interface IntegrationExecutionContext {
  signal: AbortSignal;
  deadlineAt: number;
  configurationIdentity: string;
  trustIdentity: string;
}

export type IntegrationTransportLease =
  | { ownership: "shared"; input: IntegrationTestingInput }
  | { ownership: "owned"; input: IntegrationTestingInput; releaseAsync: () => Promise<void> };

export interface IntegrationTransportResources {
  runAsync: <T>(context: IntegrationExecutionContext, operation: () => Promise<T>) => Promise<T>;
  acquireTestingAsync: (
    integration: IntegrationInput,
    context: IntegrationExecutionContext,
  ) => Promise<IntegrationTransportLease>;
  testConnectionAsync: (
    integration: IntegrationInput,
    context: IntegrationExecutionContext,
    operation: (input: IntegrationTestingInput) => Promise<TestingResult>,
  ) => Promise<TestingResult>;
}

export interface IntegrationRuntimeLog {
  write: (
    level: "debug" | "warn" | "error",
    event: string,
    metadata: Readonly<Record<string, string | number | boolean | undefined>>,
  ) => void;
}

export interface IntegrationRuntimeResources {
  context: IntegrationExecutionContext;
  transport: IntegrationTransportResources;
  sessions: SessionStoreResources;
  errorHandlers: readonly IIntegrationErrorHandler[];
  log?: IntegrationRuntimeLog;
}

export type IntegrationAuthority = "query" | "interact" | "full";

export interface IntegrationConfiguration {
  id: string;
  kind: IntegrationKind;
  name: string;
  url: string;
  externalUrl: string | null;
  configurationIdentity: string;
  trustIdentity: string;
}

export interface IntegrationRuntimePolicy<TPrincipal> {
  authorizeAsync: (
    principal: TPrincipal,
    integration: IntegrationConfiguration,
    authority: IntegrationAuthority,
    signal: AbortSignal,
  ) => Promise<void>;
  resolveSecretsAsync: (
    integration: IntegrationConfiguration,
    signal: AbortSignal,
  ) => Promise<IntegrationInput["decryptedSecrets"]>;
  isCurrentAsync: (integration: IntegrationConfiguration, signal: AbortSignal) => Promise<boolean>;
}

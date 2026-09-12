export type { WidgetJson, WidgetStorageScope } from "./shared";

export interface WidgetServerContext {
  signal: AbortSignal;
  instanceId: string;
  boardId: string;
  userId?: string;
  sdk: {
    invoke(operation: string, input: unknown): Promise<unknown>;
  };
}

export type WidgetServerHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: WidgetServerContext,
) => TOutput | Promise<TOutput> | AsyncIterable<TOutput>;

/** The runtime invokes only manifest-declared handlers after authorizing the actor. */
export function defineWidgetServer<T extends Record<string, WidgetServerHandler<never>>>(handlers: T): T {
  return handlers;
}

export interface WidgetIntegrationInput {
  connection: string;
  capability: string;
  input?: unknown;
}

export interface WidgetConnectionRequest {
  connection: string;
  path?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  body?: unknown;
  responseType?: "json" | "text" | "base64";
}

export interface WidgetConnectionResponse<T> {
  data: T;
  ok: boolean;
  status: number;
  contentType: string | null;
  durationMs: number;
  updatedAt: string;
}

/** Credentials, local DNS, timeout and TLS policy come from the named owner-bound connection. */
export function fetchWidgetConnection<T = unknown>(context: WidgetServerContext, input: WidgetConnectionRequest) {
  return context.sdk.invoke("connection.fetch", input) as Promise<WidgetConnectionResponse<T>>;
}

export interface WidgetBoundConnection<TSettings = Record<string, unknown>> {
  configuration: {
    kind: "http" | "integration" | "service";
    serviceType?: string;
    settings?: TSettings;
    baseUrl?: string;
    browserUrl?: string;
    timeoutMs: number;
    tls?: { rejectUnauthorized: boolean; ca?: string; cert?: string };
    [key: string]: unknown;
  };
  secrets: Record<string, string>;
}

/** Server handlers only. Use local connection settings and credentials with a Node library or native protocol. */
export async function getWidgetConnection<TSettings = Record<string, unknown>>(
  context: WidgetServerContext,
  input: { connection: string; serviceType?: string },
): Promise<WidgetBoundConnection<TSettings>> {
  const connection = (await context.sdk.invoke("connection.get", {
    connection: input.connection,
  })) as WidgetBoundConnection<TSettings>;
  if (
    input.serviceType &&
    (connection.configuration.kind !== "service" || connection.configuration.serviceType !== input.serviceType)
  )
    throw new Error(`Connection '${input.connection}' requires the '${input.serviceType}' service type`);
  return connection;
}

export function getWidgetServerContext<TOptions extends Record<string, unknown> = Record<string, unknown>>(
  context: WidgetServerContext,
) {
  return context.sdk.invoke("widget.context", {}) as Promise<{
    options: TOptions;
    installationId: string;
    bindingNames: string[];
    isPreview: boolean;
  }>;
}

export function callWidgetIntegration<T = unknown>(context: WidgetServerContext, input: WidgetIntegrationInput) {
  return context.sdk.invoke("integration.call", input) as Promise<T>;
}

/** Bridges native streams across the worker boundary and releases them when the widget stops observing. */
export async function* subscribeWidgetIntegration<T = unknown>(
  context: WidgetServerContext,
  input: WidgetIntegrationInput,
): AsyncGenerator<T> {
  context.signal.throwIfAborted();
  const id = await context.sdk.invoke("integration.subscribe", input);
  if (typeof id !== "string") throw new Error("The integration subscription returned an invalid identifier");
  try {
    while (!context.signal.aborted) {
      const result = (await context.sdk.invoke("integration.next", { id })) as IteratorResult<T>;
      if (result.done) return;
      yield result.value;
    }
  } finally {
    // Cleanup is best effort after a worker cancellation; preserve the original stream result/error.
    await context.sdk.invoke("integration.unsubscribe", { id }).catch(() => undefined);
  }
}

export interface WidgetRunnerInput {
  connection: string;
  handler: string;
  input?: unknown;
}

async function runnerRequest<T>(context: WidgetServerContext, connection: string, path: string, body: unknown) {
  const response = await fetchWidgetConnection<T & { error?: string }>(context, {
    connection,
    path,
    method: "POST",
    body,
  });
  if (!response.ok || response.data.error)
    throw new Error(response.data.error ?? `Widget runner returned HTTP ${response.status}`);
  return response.data;
}

/** Run an owner-installed package handler on a named remote runner connection. */
export async function callWidgetRunner<T = unknown>(context: WidgetServerContext, input: WidgetRunnerInput) {
  const result = await runnerRequest<{ value: T }>(context, input.connection, "/invoke", {
    handler: input.handler,
    input: input.input,
    instanceId: context.instanceId,
    boardId: context.boardId,
    userId: context.userId,
  });
  return result.value;
}

export async function* subscribeWidgetRunner<T = unknown>(
  context: WidgetServerContext,
  input: WidgetRunnerInput,
): AsyncGenerator<T> {
  const { id } = await runnerRequest<{ id: string }>(context, input.connection, "/subscriptions/start", {
    handler: input.handler,
    input: input.input,
    instanceId: context.instanceId,
    boardId: context.boardId,
    userId: context.userId,
  });
  try {
    while (!context.signal.aborted) {
      const result = await runnerRequest<{ done: boolean; values: T[] }>(
        context,
        input.connection,
        "/subscriptions/next",
        { id },
      );
      for (const value of result.values) yield value;
      if (result.done) return;
    }
  } finally {
    await runnerRequest(context, input.connection, "/subscriptions/cancel", { id }).catch(() => undefined);
  }
}

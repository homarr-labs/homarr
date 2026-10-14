import { createHash } from "node:crypto";
import { BlockList, isIP } from "node:net";
import { isDeepStrictEqual } from "node:util";
import { ORPCError } from "@orpc/server";
import SuperJSON from "superjson";
import { z } from "zod/v4";

import { FlattenError } from "@homarr/common/error";
import {
  constructIntegrationPermissions,
  decideBoardAccess,
  hasQueryAccessToIntegrationsAsync,
} from "@homarr/auth/nitro/policy";
import type { PolicyIdentity, ResourceGrants } from "@homarr/auth/nitro/policy";
import { isRecord } from "@homarr/common/object";
import { removeTrailingSlash } from "@homarr/common/url";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import {
  customWidgetDefinitionSchema,
  getCustomWidgetDefaultOptions,
  normalizeCustomWidgetOptions,
  validateCustomWidgetOptions,
  getCustomWidgetSourceAuthType,
} from "@homarr/custom-widgets/core";
import type { CustomJsxRequest, CustomWidgetSource } from "@homarr/custom-widgets/core";
import {
  hashRuntimeParams,
  renderRequestBody,
  renderRequestTarget,
  resolveCustomWidgetRequestValues,
  CustomWidgetDomainError,
} from "@homarr/custom-widgets/server";
import type { RequestLimitInput } from "@homarr/custom-widgets/server";
import type {
  IntegrationKind,
  BoardPermission,
  WidgetKindWithIntegration,
  WidgetIntegrationKind,
  IntegrationPermission,
} from "@homarr/definitions";
import { getWidgetIntegrationConfig, getIntegrationHttpUnavailableReason, integrationKinds } from "@homarr/definitions";
import { DEFAULT_TIMETABLE_BASE_URL, normalizeTimetableBaseUrl } from "@homarr/request-handler/timetable-url";
import type { TimetableResolvedAddress } from "@homarr/request-handler/timetable";

import { authenticatedProcedure, sourceProcedure } from "../../procedure";
import type { SourceProcedureDescriptor } from "../../procedure";
import type { WidgetIntegration, WidgetProcedureResources, WidgetRuntimeContext } from "./resources";

export const PUBLIC_INTEGRATION_ERROR = "INTEGRATION_REQUEST_FAILED";
export const toPublicIntegrationError = (_error: unknown): string => PUBLIC_INTEGRATION_ERROR;

export function widgetProcedure(resources: WidgetProcedureResources, descriptor: SourceProcedureDescriptor) {
  return sourceProcedure(descriptor).use(async ({ context, next }) => {
    const widgetLease = await resources.acquireRequestAsync(context);
    context.onDispose(() => widgetLease.releaseAsync());
    await widgetLease.assertCurrentAsync();
    return next({ context: { widgetLease } });
  });
}

export function authenticatedWidgetProcedure(
  resources: WidgetProcedureResources,
  descriptor: SourceProcedureDescriptor,
) {
  if (descriptor.access.kind !== "protected") throw new Error("An authenticated widget descriptor is required");
  return authenticatedProcedure({ ...descriptor, access: { kind: "protected" } }).use(async ({ context, next }) => {
    const widgetLease = await resources.acquireRequestAsync(context);
    context.onDispose(() => widgetLease.releaseAsync());
    await widgetLease.assertCurrentAsync();
    return next({ context: { widgetLease } });
  });
}

async function integrationAccess<TKind extends IntegrationKind>(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  ids: string[],
  kinds: readonly TKind[],
  cardinality: "one" | "many",
  action: "query" | "interact",
): Promise<WidgetIntegration<TKind>[]> {
  const metadata = {
    action,
    cardinality,
    userId: context.principal.kind === "authenticated" ? context.principal.user.id : undefined,
    requestedIntegrationIds: ids,
    allowedIntegrationKinds: kinds,
  };
  resources.logger.debug("Resolving integration access", metadata);
  const snapshot = await authorizationSnapshot(context, resources, { integrationIds: ids, allowedKinds: kinds });
  const records = await snapshot.repository.findIntegrations(snapshot.identity, ids, kinds);
  if (cardinality === "one" && records.length === 0) {
    resources.logger.warn("Integration access target was not found", metadata);
    throw new ORPCError("NOT_FOUND", {
      message: `Integration with id ${ids[0]} not found or not of kinds ${kinds.join(",")}`,
    });
  }
  const offset = ids.length - records.length;
  if (cardinality === "many" && offset !== 0) {
    resources.logger.warn("Integration access targets were not found", {
      ...metadata,
      missingIntegrationCount: offset,
      resolvedIntegrationIds: records.map(({ id }) => id),
      resolvedIntegrationKinds: records.map(({ kind }) => kind),
    });
    throw new ORPCError("NOT_FOUND", {
      message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}: ([${ids.join(",")}] compared to [${records.map(({ id, kind }) => `${kind}:${id}`).join(",")}])`,
    });
  }
  if (records.length > 0) {
    const allowed =
      action === "interact"
        ? records.every((record) => sourceIntegrationPermissions(snapshot.identity, record).hasInteractAccess)
        : await hasQueryAccessToIntegrationsAsync(snapshot.repository, snapshot.identity, records);
    if (!allowed) {
      resources.logger.warn("Integration access denied", {
        action,
        userId: metadata.userId,
        integrationIds: records.map(({ id }) => id),
        integrationKinds: records.map(({ kind }) => kind),
      });
      throw new ORPCError("FORBIDDEN", {
        message:
          action === "interact"
            ? "User does not have permission to interact with at least one of the specified integrations"
            : "User does not have permission to query at least one of the specified integration",
      });
    }
  }
  resources.logger.debug("Integration access granted", {
    ...metadata,
    resolvedIntegrationKinds: records.map(({ kind }) => kind),
  });
  return records.map(({ secrets, items: _items, groupPermissions: _groups, userPermissions: _users, ...rest }) => {
    const kind = kinds.find((candidate) => candidate === rest.kind);
    if (!kind) {
      resources.logger.error("Database returned an integration outside the requested kinds", {
        integrationKind: rest.kind,
        allowedIntegrationKinds: kinds,
      });
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Integration kind validation failed" });
    }
    return {
      ...rest,
      kind,
      externalUrl: rest.app?.href ?? null,
      decryptedSecrets: secrets.map((secret) => ({ ...secret, value: resources.codec.decryptSecret(secret.value) })),
    };
  });
}

async function authorizationSnapshot(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  selection: Parameters<WidgetProcedureResources["acquireAuthorizationSnapshotAsync"]>[1],
) {
  context.signal.throwIfAborted();
  await context.widgetLease.assertCurrentAsync();
  const snapshot = await resources.acquireAuthorizationSnapshotAsync(context, selection);
  if (context.principal.kind === "anonymous") {
    if (snapshot.identity.type !== "anonymous") throw new ORPCError("UNAUTHORIZED");
  } else if (snapshot.identity.type !== "authenticated" || snapshot.identity.userId !== context.principal.user.id) {
    throw new ORPCError("UNAUTHORIZED");
  }
  await context.widgetLease.assertCurrentAsync();
  context.signal.throwIfAborted();
  return snapshot;
}

export function oneIntegration<TKind extends IntegrationKind>(
  resources: WidgetProcedureResources,
  descriptor: SourceProcedureDescriptor,
  action: "query" | "interact",
  kinds: readonly TKind[],
) {
  return widgetProcedure(resources, descriptor)
    .input(z.object({ integrationId: z.string() }))
    .use(async ({ context, next }, input) => {
      const [integration] = await integrationAccess(context, resources, [input.integrationId], kinds, "one", action);
      if (!integration) throw new ORPCError("NOT_FOUND");
      return next({ context: { integration } });
    });
}

export function manyIntegrations<TKind extends IntegrationKind>(
  resources: WidgetProcedureResources,
  descriptor: SourceProcedureDescriptor,
  action: "query" | "interact",
  kinds: readonly TKind[],
) {
  return widgetProcedure(resources, descriptor)
    .input(z.object({ integrationIds: z.array(z.string()) }))
    .use(async ({ context, next }, input) => {
      const integrations = await integrationAccess(context, resources, input.integrationIds, kinds, "many", action);
      return next({ context: { integrations } });
    });
}

export function oneWidget<TKind extends WidgetKindWithIntegration>(
  resources: WidgetProcedureResources,
  descriptor: SourceProcedureDescriptor,
  action: "query" | "interact",
  kind: TKind,
) {
  return oneIntegration<WidgetIntegrationKind<TKind>>(
    resources,
    descriptor,
    action,
    getWidgetIntegrationConfig(kind).supportedIntegrations,
  );
}

export function manyWidgets<TKind extends WidgetKindWithIntegration>(
  resources: WidgetProcedureResources,
  descriptor: SourceProcedureDescriptor,
  action: "query" | "interact",
  kind: TKind,
) {
  return manyIntegrations<WidgetIntegrationKind<TKind>>(
    resources,
    descriptor,
    action,
    getWidgetIntegrationConfig(kind).supportedIntegrations,
  );
}

export async function settleIntegrationQueries<
  TIntegration extends { id: string; name: string; kind: string },
  TResult,
  TFallback = TResult,
>(
  resources: WidgetProcedureResources,
  integrations: TIntegration[],
  operation: (integration: TIntegration) => Promise<TResult>,
  options?: { fallback?: (integration: TIntegration, error: unknown) => TFallback; throwOnAllFailures?: boolean },
): Promise<(TResult | TFallback)[]> {
  const settled = await Promise.allSettled(integrations.map(async (integration) => operation(integration)));
  const results: (TResult | TFallback)[] = [];
  const errors: unknown[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
      return;
    }
    const integration = integrations[index];
    resources.logger.warn(
      new ErrorWithMetadata(
        "Integration query failed",
        { integrationId: integration?.id, integrationKind: integration?.kind },
        { cause: result.reason },
      ),
    );
    errors.push(result.reason);
    if (options?.fallback && integration) results.push(options.fallback(integration, result.reason));
  });
  if (
    errors.length > 0 &&
    (results.length === 0 || (options?.throwOnAllFailures === true && errors.length === integrations.length))
  ) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "All integration queries failed", cause: errors[0] });
  }
  return results;
}

export function sourceIntegrationPermissions(identity: PolicyIdentity, record: ResourceGrants<IntegrationPermission>) {
  return constructIntegrationPermissions(record, identity);
}

export async function boardAccess(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  boardId: string,
  permission: BoardPermission,
) {
  const snapshot = await authorizationSnapshot(context, resources, {
    integrationIds: [],
    allowedKinds: [],
    boardIds: [boardId],
  });
  const board = await snapshot.repository.findBoard(snapshot.identity, boardId);
  if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
  if (decideBoardAccess(snapshot.identity, board, permission).type === "allow") return;
  throw new ORPCError("NOT_FOUND", { message: "Board not found" });
}

export function normalizeAnchorContent(content: string | undefined) {
  if (content === undefined) return undefined;
  if (!content.trim()) return JSON.stringify({ ops: [{ insert: "\n" }] });
  if (isJsonDeltaString(content)) return content;
  return JSON.stringify({ ops: [{ insert: content.endsWith("\n") ? content : `${content}\n` }] });
}

export function isJsonDeltaString(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) && Array.isArray(parsed.ops);
  } catch {
    return false;
  }
}

export function assertMockNoteExists(resources: WidgetProcedureResources, noteId: string) {
  if (noteId !== resources.mockWidgetData.anchorNote.id)
    throw new ORPCError("NOT_FOUND", { message: "Note not found" });
}

type QueueResult<T> = IteratorResult<T, undefined>;
export class BoundedAsyncQueue<T> implements AsyncIterableIterator<T> {
  private readonly values: T[] = [];
  private pendingRead: { resolve: (result: QueueResult<T>) => void; reject: (reason?: unknown) => void } | undefined;
  private closed = false;
  private failed = false;
  private failure: unknown;
  constructor(private readonly maxSize: number) {
    if (!Number.isInteger(maxSize) || maxSize < 1)
      throw new Error("A bounded async queue requires a positive integer max size");
  }
  push(value: T) {
    if (this.closed) return;
    if (this.pendingRead) {
      const pending = this.pendingRead;
      this.pendingRead = undefined;
      pending.resolve({ value, done: false });
      return;
    }
    if (this.values.length >= this.maxSize) this.values.shift();
    this.values.push(value);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.pendingRead) {
      const pending = this.pendingRead;
      this.pendingRead = undefined;
      pending.resolve({ value: undefined, done: true });
    }
  }
  fail(error: unknown) {
    if (this.closed) return;
    this.closed = true;
    this.failed = true;
    this.failure = error;
    this.values.length = 0;
    if (this.pendingRead) {
      const pending = this.pendingRead;
      this.pendingRead = undefined;
      pending.reject(error);
    }
  }
  next(): Promise<QueueResult<T>> {
    if (this.values.length > 0) {
      for (const value of this.values.splice(0, 1)) return Promise.resolve({ value, done: false });
    }
    if (this.failed) return Promise.reject(this.failure);
    if (this.closed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve, reject) => {
      this.pendingRead = { resolve, reject };
    });
  }
  return(): Promise<QueueResult<T>> {
    this.values.length = 0;
    this.close();
    return Promise.resolve({ value: undefined, done: true });
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}

export async function canAccessAllFeedsAsync(context: WidgetRuntimeContext, resources: WidgetProcedureResources) {
  if (context.principal.kind !== "authenticated") return false;
  const user = context.principal.user;
  if (user.permissions.includes("board-create") || user.permissions.includes("board-modify-all")) return true;
  const record = await context.db.query.users.findFirst({
    where: resources.operators.eq(resources.tables.users.id, user.id),
    with: {
      boards: { columns: { id: true } },
      boardPermissions: true,
      groups: { with: { group: { with: { boardPermissions: true } } } },
    },
  });
  if (!record) return false;
  return (
    record.boards.length >= 1 ||
    record.boardPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
    record.groups.some(({ group }) =>
      group.boardPermissions.some(({ permission }) => permission === "modify" || permission === "full"),
    )
  );
}

export async function restrictUrlsAsync(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  urls: string[],
) {
  const items = await context.db.query.items.findMany({
    where: resources.operators.eq(resources.tables.items.kind, "rssFeed"),
  });
  const configured = items
    .map((item) => SuperJSON.parse<{ feedUrls: string[] }>(item.options))
    .flatMap((options) => options.feedUrls);
  return urls.filter((url) => configured.includes(url));
}

export function safeFeedLogContext(url: string, feedIndex: number) {
  try {
    return { feedIndex, origin: new URL(url).origin };
  } catch {
    return { feedIndex };
  }
}
export const redactFeedFailureMessage = (message: string) => message.replace(/https?:\/\/\S+/gi, "[redacted URL]");

export function assertPlacementChangeAllowed(
  isAdmin: boolean,
  item: { id: string; kind: string },
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
) {
  const normalize = (options: Record<string, unknown>) => ({
    ...options,
    configuration: isRecord(options.configuration) ? options.configuration : {},
    configurationVersion:
      typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
        ? options.configurationVersion
        : 1,
    refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : 30,
  });
  if (item.kind === "customApi" && !isDeepStrictEqual(normalize(previous), normalize(next)) && !isAdmin) {
    throw new ORPCError("FORBIDDEN", { message: "Only administrators can add or configure Custom Widgets" });
  }
}

export const timetableSourceSchema = z.object({
  baseUrl: z.string().url().max(2_048),
  itemId: z.string().max(100).optional(),
  boardId: z.string().max(100).optional(),
});
const timetableOptionsSchema = z.object({ baseUrl: z.string().optional() }).passthrough();
const blockedSubnets = [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["192.88.99.0", 24, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 4, "ipv4"],
  ["240.0.0.0", 4, "ipv4"],
  ["::", 96, "ipv6"],
  ["::ffff:0:0", 96, "ipv6"],
  ["::ffff:0:0:0", 96, "ipv6"],
  ["64:ff9b::", 96, "ipv6"],
  ["64:ff9b:1::", 48, "ipv6"],
  ["100::", 64, "ipv6"],
  ["2001::", 32, "ipv6"],
  ["2001:2::", 48, "ipv6"],
  ["2001:10::", 28, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
  ["2002::", 16, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["fec0::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
] as const;
const blockedIpv4 = new BlockList();
const blockedIpv6 = new BlockList();
for (const [network, prefix, family] of blockedSubnets)
  (family === "ipv4" ? blockedIpv4 : blockedIpv6).addSubnet(network, prefix, family);

function normalizeBaseUrlOrThrowBadRequest(baseUrl: string) {
  try {
    return normalizeTimetableBaseUrl(baseUrl);
  } catch (cause) {
    throw new ORPCError("BAD_REQUEST", {
      message: cause instanceof Error ? cause.message : "Invalid timetable base URL",
      cause,
    });
  }
}
function invalidSavedTimetableConfiguration(cause: unknown): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Timetable widget configuration is invalid", cause });
}
function getSavedTimetableBaseUrl(serializedOptions: string) {
  let options: z.infer<typeof timetableOptionsSchema>;
  try {
    options = timetableOptionsSchema.parse(SuperJSON.parse<unknown>(serializedOptions));
  } catch (cause) {
    return invalidSavedTimetableConfiguration(cause);
  }
  try {
    return normalizeTimetableBaseUrl(options.baseUrl ?? DEFAULT_TIMETABLE_BASE_URL);
  } catch (cause) {
    return invalidSavedTimetableConfiguration(cause);
  }
}
async function resolvePublicTimetableAddressesAsync(
  context: WidgetRuntimeContext,
  baseUrl: string,
): Promise<TimetableResolvedAddress[]> {
  const raw = new URL(baseUrl).hostname;
  const hostname = (raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw).toLowerCase().replace(/\.$/, "");
  const family = isIP(hostname);
  if (
    family === 0 &&
    (!hostname.includes(".") ||
      hostname === "localhost" ||
      [".localhost", ".local", ".internal", ".lan", ".home.arpa"].some((suffix) => hostname.endsWith(suffix)))
  ) {
    throw new ORPCError("BAD_REQUEST", { message: "Timetable base URL must use a public host" });
  }
  let addresses: TimetableResolvedAddress[];
  try {
    const resolved =
      family === 0
        ? await context.widgetLease.lookup(hostname, { all: true, verbatim: true })
        : [{ address: hostname, family }];
    addresses = resolved.filter((entry): entry is TimetableResolvedAddress => entry.family === 4 || entry.family === 6);
  } catch (cause) {
    throw new ORPCError("BAD_REQUEST", { message: "Timetable base URL host could not be resolved", cause });
  }
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family: addressFamily }) =>
      addressFamily === 6 ? blockedIpv6.check(address, "ipv6") : blockedIpv4.check(address, "ipv4"),
    )
  ) {
    throw new ORPCError("BAD_REQUEST", { message: "Timetable base URL must not target a private or internal address" });
  }
  return addresses.toSorted((left, right) => left.family - right.family || left.address.localeCompare(right.address));
}
export async function validateTimetableOptionsChangeAsync(
  context: WidgetRuntimeContext,
  next: Record<string, unknown>,
  previous?: Record<string, unknown>,
) {
  const normalize = (options: Record<string, unknown>) => {
    const parsed = timetableOptionsSchema.safeParse(options);
    if (!parsed.success) throw new ORPCError("BAD_REQUEST", { message: "Invalid timetable widget options" });
    return normalizeBaseUrlOrThrowBadRequest(parsed.data.baseUrl ?? DEFAULT_TIMETABLE_BASE_URL);
  };
  const nextUrl = normalize(next);
  if (nextUrl === DEFAULT_TIMETABLE_BASE_URL) return;
  let previousUrl: string | undefined;
  if (previous) {
    try {
      previousUrl = normalize(previous);
    } catch {}
  }
  if (nextUrl === previousUrl) return;
  await resolvePublicTimetableAddressesAsync(context, nextUrl);
}
export async function resolveTimetableBaseUrlAsync(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  input: z.infer<typeof timetableSourceSchema>,
  allowBoardConfiguration = false,
): Promise<{ baseUrl: string; pinnedAddresses?: TimetableResolvedAddress[] }> {
  const requested = normalizeBaseUrlOrThrowBadRequest(input.baseUrl);
  const { eq, and } = resources.operators;
  const { items } = resources.tables;
  if (allowBoardConfiguration) {
    if (input.boardId) {
      await boardAccess(context, resources, input.boardId, "modify");
      if (input.itemId) {
        const item = await context.db.query.items.findFirst({
          columns: { id: true },
          where: and(eq(items.id, input.itemId), eq(items.kind, "timetable"), eq(items.boardId, input.boardId)),
        });
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Timetable widget not found" });
      }
      return requested === DEFAULT_TIMETABLE_BASE_URL
        ? { baseUrl: requested }
        : { baseUrl: requested, pinnedAddresses: await resolvePublicTimetableAddressesAsync(context, requested) };
    }
    if (requested !== DEFAULT_TIMETABLE_BASE_URL)
      throw new ORPCError("FORBIDDEN", { message: "Board modify access is required for this endpoint" });
    return { baseUrl: DEFAULT_TIMETABLE_BASE_URL };
  }
  if (!input.itemId) {
    if (requested !== DEFAULT_TIMETABLE_BASE_URL)
      throw new ORPCError("FORBIDDEN", { message: "A saved timetable widget is required for this endpoint" });
    return { baseUrl: DEFAULT_TIMETABLE_BASE_URL };
  }
  const item = await context.db.query.items.findFirst({
    where: and(eq(items.id, input.itemId), eq(items.kind, "timetable")),
  });
  if (!item) throw new ORPCError("NOT_FOUND", { message: "Timetable widget not found" });
  await boardAccess(context, resources, item.boardId, "view");
  const saved = getSavedTimetableBaseUrl(item.options);
  if (requested !== saved)
    throw new ORPCError("FORBIDDEN", { message: "Timetable URL does not match the saved widget" });
  return saved === DEFAULT_TIMETABLE_BASE_URL
    ? { baseUrl: saved }
    : { baseUrl: saved, pinnedAddresses: await resolvePublicTimetableAddressesAsync(context, saved) };
}

export function getDashboardUrl(integration: WidgetIntegration): string | null {
  const configured = integration.decryptedSecrets.find((secret) => secret.kind === "wazuhDashboardUrl")?.value;
  const candidate = configured?.trim() ? configured : integration.externalUrl;
  if (!candidate || (!configured && removeTrailingSlash(candidate) === removeTrailingSlash(integration.url)))
    return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? removeTrailingSlash(url.toString()) : null;
  } catch {
    return null;
  }
}
export async function settleWazuh<T>(
  resources: WidgetProcedureResources,
  operation: string,
  integration: WidgetIntegration,
  getData: () => Promise<{ data: T; timestamp: Date }>,
) {
  const dashboardUrl = getDashboardUrl(integration);
  try {
    const { data, timestamp } = await getData();
    return { data, updatedAt: timestamp, error: null, dashboardUrl };
  } catch (error) {
    const publicError = resources.toWazuhPublicError(error);
    resources.logger.warn("Wazuh widget request failed", { operation, integrationId: integration.id, ...publicError });
    return { data: null, updatedAt: null, error: publicError, dashboardUrl };
  }
}
export function mockWazuh<T>(resources: WidgetProcedureResources, data: T) {
  return { data, updatedAt: new Date(resources.mockWidgetData.timestamp), error: null, dashboardUrl: null };
}

export const runtimeParamsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
export const itemInputSchema = z.object({ itemId: z.string().min(1) });
export const namedRequestInputSchema = itemInputSchema.extend({
  requestId: z.string().min(1).max(64),
  params: runtimeParamsSchema.default({}),
});

function parseItemOptions(raw: string) {
  try {
    const options = SuperJSON.parse<Record<string, unknown>>(raw);
    if (typeof options.definitionId !== "string" || options.definitionId.length === 0) throw new Error();
    return {
      definitionId: options.definitionId,
      configuration: isRecord(options.configuration) ? options.configuration : {},
      configurationVersion:
        typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
          ? options.configurationVersion
          : 1,
      refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : undefined,
    };
  } catch {
    throw new ORPCError("NOT_FOUND", { message: "Custom widget item not found" });
  }
}
export async function resolvePlacedDefinitionAsync(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  itemId: string,
) {
  const { eq } = resources.operators;
  const { items, customWidgetDefinitions, legacyCustomWidgetDefinitions } = resources.tables;
  const item = await context.db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { id: true, boardId: true, kind: true, options: true },
  });
  if (!item || item.kind !== "customApi") throw new ORPCError("NOT_FOUND", { message: "Custom widget item not found" });
  await boardAccess(context, resources, item.boardId, "view");
  const itemOptions = parseItemOptions(item.options);
  const stored = await context.db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, itemOptions.definitionId),
    with: { secrets: true },
  });
  if (!stored) {
    const legacy = await context.db.query.legacyCustomWidgetDefinitions.findFirst({
      where: eq(legacyCustomWidgetDefinitions.id, itemOptions.definitionId),
      columns: { id: true },
    });
    if (legacy) throw new ORPCError("PRECONDITION_FAILED", { message: "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED" });
    throw new ORPCError("NOT_FOUND", { message: "Custom widget unavailable" });
  }
  if (!stored.enabled) throw new ORPCError("FORBIDDEN", { message: "Widget is disabled" });
  const definition = customWidgetDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: stored.name,
    description: stored.description ?? undefined,
    iconUrl: stored.iconUrl ?? undefined,
    sources: SuperJSON.parse(stored.sources),
    requests: SuperJSON.parse(stored.requests),
    options: SuperJSON.parse(stored.options),
    template: stored.template,
  });
  const configuration =
    itemOptions.configurationVersion === stored.updatedAt.getTime()
      ? { ...getCustomWidgetDefaultOptions(definition.options), ...itemOptions.configuration }
      : normalizeCustomWidgetOptions(definition.options, itemOptions.configuration);
  const issues = validateCustomWidgetOptions(definition.options, configuration);
  if (issues.length > 0)
    throw new ORPCError("PRECONDITION_FAILED", {
      message: `Custom widget configuration needs repair: ${issues[0]?.path} ${issues[0]?.message}`,
    });
  return { item, stored, definition, itemOptions, configuration };
}
type ResolvedDefinition = Awaited<ReturnType<typeof resolvePlacedDefinitionAsync>>;
export function findRequest(resolved: ResolvedDefinition, requestId: string, kind: "query" | "action") {
  const request = resolved.definition.requests[requestId];
  if (request?.kind !== kind || !request) throw new ORPCError("NOT_FOUND", { message: "Named request not found" });
  return { id: requestId, ...request };
}
export function getCustomWidgetCacheVersion(definition: ResolvedDefinition["stored"]) {
  const secrets = definition.secrets
    .map(({ sourceId, kind, encryptedValue }) => ({ sourceId, kind, encryptedValue }))
    .toSorted((left, right) => `${left.sourceId}:${left.kind}`.localeCompare(`${right.sourceId}:${right.kind}`));
  return createHash("sha256")
    .update(JSON.stringify([definition.sources, definition.requests, secrets]))
    .digest("hex")
    .slice(0, 16);
}
class RequestLimitTransportError extends FlattenError {}
function throwCustomWidgetError(error: unknown): never {
  if (error instanceof CustomWidgetDomainError) {
    const cause = error.retryAfterMs
      ? new RequestLimitTransportError(error.message, { retryAfterMs: error.retryAfterMs })
      : error;
    throw new ORPCError(error.code, {
      message: error.message,
      cause,
      data: { zodError: null, error: cause instanceof FlattenError ? cause.flatten() : null },
    });
  }
  throw error;
}
export async function withRequestLimit<T>(
  context: WidgetRuntimeContext,
  resolved: ResolvedDefinition,
  category: RequestLimitInput["category"],
  operation: () => Promise<T>,
) {
  const release = await context.widgetLease
    .acquireCustomWidgetRequestLimit({
      category,
      userId: context.principal.kind === "authenticated" ? context.principal.user.id : undefined,
      itemId: resolved.item.id,
      definitionId: resolved.stored.id,
    })
    .catch(throwCustomWidgetError);
  try {
    return await operation();
  } finally {
    await release();
  }
}
async function resolveHttpIntegration(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
) {
  if (!source.integrationId)
    throw new ORPCError("PRECONDITION_FAILED", { message: "Select an existing integration for this widget source" });
  const snapshot = await authorizationSnapshot(context, resources, {
    integrationIds: [source.integrationId],
    allowedKinds: integrationKinds,
  });
  const [integration] = await snapshot.repository.findIntegrations(
    snapshot.identity,
    [source.integrationId],
    integrationKinds,
  );
  if (!integration || !sourceIntegrationPermissions(snapshot.identity, integration).hasFullAccess)
    throw new ORPCError("FORBIDDEN", { message: "Arbitrary integration requests require full integration access" });
  const unavailable = getIntegrationHttpUnavailableReason(integration.kind);
  if (unavailable) throw new ORPCError("BAD_REQUEST", { message: unavailable });
  if (integration.kind !== source.integrationKind)
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "The selected integration is unavailable or has a different type",
    });
  return integration;
}
export async function getCustomWidgetIntegrationCacheVersion(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  source: Extract<CustomWidgetSource, { type: "integration" }>,
) {
  const integration = await resolveHttpIntegration(context, resources, source);
  return createHash("sha256")
    .update(JSON.stringify([integration.id, integration.kind, integration.url, integration.secrets]))
    .digest("hex")
    .slice(0, 16);
}
export async function executeRequest(
  context: WidgetRuntimeContext,
  resources: WidgetProcedureResources,
  resolved: ResolvedDefinition,
  request: CustomJsxRequest & { id: string },
  params: Record<string, string | number | boolean>,
) {
  const permission = request.permission;
  await boardAccess(context, resources, resolved.item.boardId, permission);
  const source = resolved.definition.sources[request.source];
  if (!source) throw new ORPCError("NOT_FOUND", { message: "Widget API source not found" });
  const identifiedSource = { id: request.source, ...source };
  let values: ReturnType<typeof resolveCustomWidgetRequestValues>;
  try {
    values = resolveCustomWidgetRequestValues(request, resolved.configuration, params);
  } catch (error) {
    return throwCustomWidgetError(error);
  }
  let category: RequestLimitInput["category"] = "query";
  if (request.kind === "action") category = request.method === "DELETE" ? "delete" : "action";
  return withRequestLimit(context, resolved, category, async () => {
    const connection = await (async () => {
      if (identifiedSource.type === "integration")
        return context.widgetLease.getIntegrationHttpConnection(
          await resolveHttpIntegration(context, resources, identifiedSource),
          request.auth !== "none",
        );
      const authType = getCustomWidgetSourceAuthType(identifiedSource);
      if (request.auth === "none" || authType === "none")
        return { baseUrl: identifiedSource.baseUrl, networkScope: identifiedSource.networkScope, cacheVersion: "" };
      const secrets = resolved.stored.secrets
        .filter((secret) => secret.sourceId === identifiedSource.id)
        .map((secret) => ({ kind: secret.kind, value: resources.codec.decryptSecret(secret.encryptedValue) }));
      const auth = {
        type: authType,
        secrets,
        headerName: typeof identifiedSource.auth === "object" ? identifiedSource.auth.name : undefined,
      };
      return { baseUrl: identifiedSource.baseUrl, networkScope: identifiedSource.networkScope, auth, cacheVersion: "" };
    })();
    let targetUrl: ReturnType<typeof renderRequestTarget>;
    let body: ReturnType<typeof renderRequestBody>;
    try {
      targetUrl = renderRequestTarget(connection.baseUrl, request, values);
      body = renderRequestBody(request, values);
    } catch (error) {
      return throwCustomWidgetError(error);
    }
    const response = await context.widgetLease
      .executeCustomWidgetRequest({
        ...connection,
        targetUrl,
        method: request.method,
        body,
        staticHeaders: request.headers,
        kind: request.kind,
        cacheKey:
          request.kind === "query"
            ? `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:${request.id}:${hashRuntimeParams(values)}:${connection.cacheVersion}`
            : undefined,
        cacheTtlSeconds: request.cacheSeconds,
      })
      .catch(throwCustomWidgetError);
    return { ...response, sourceCacheVersion: connection.cacheVersion };
  });
}

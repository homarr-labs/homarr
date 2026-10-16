import { ApiError } from "../procedure";
import type { ApiContext, ApiMeta } from "../procedure";

import { callFederatedProcedure } from "./client";
import { rewriteFederatedMedia } from "./media";
import {
  federationFailureResult,
  federationManyOperations,
  mergeFederationResults,
  remapIntegrationResult,
} from "./operations";

interface Target {
  id: string;
  name: string;
  kind: string;
  origin: { connectionId: string; remoteIntegrationId: string } | null;
}
interface Options {
  context: ApiContext;
  input: unknown;
  path: string[];
  procedure: { "~orpc": { meta: ApiMeta } };
  signal?: AbortSignal;
  execute: (overrides?: { context?: object; input?: unknown }) => unknown;
}

/** Dispatch occurs after native parsing and ordinary integration authorization. */
export async function executeFederatedOperation(options: Options): Promise<unknown> {
  const context = options.context as ApiContext & {
    federationTargets?: Target[];
    integration?: { id: string };
    integrations?: { id: string }[];
  };
  const targets = context.federationTargets ?? [];
  if (!targets.some((target) => target.origin)) return options.execute();
  if (context.workerAccess?.role === "service" && context.workerAccess.service?.purpose !== "mcp")
    throw new ApiError({ code: "FORBIDDEN", message: "Integration service grants cannot delegate to another worker" });
  const metadata = options.procedure["~orpc"].meta.integration;
  if (!metadata)
    throw new ApiError({ code: "FORBIDDEN", message: "Operation is not available for integration delegation" });
  let procedurePath = options.path;
  const mcpWidgetRoots = new Set([
    "stats",
    "bazarr",
    "beszel",
    "calendar",
    "dnsHole",
    "downloads",
    "healthMonitoring",
    "mediaRequests",
    "mediaServer",
    "mediaOrganizer",
    "patchmon",
    "smartHome",
    "traefik",
    "wud",
  ]);
  if (mcpWidgetRoots.has(options.path[0] ?? "")) procedurePath = ["widget", ...options.path];
  const path = procedurePath.join(".");
  const input = options.input as Record<string, unknown>;
  if (metadata.cardinality === "one") {
    const target = targets[0];
    if (!target?.origin) return options.execute();
    const result = await callFederatedProcedure(
      context,
      target.origin.connectionId,
      procedurePath,
      { ...input, integrationId: target.origin.remoteIntegrationId },
      { signal: options.signal },
    );
    return rewriteFederatedMedia(
      context,
      target.origin.connectionId,
      new Map([[target.origin.remoteIntegrationId, target.id]]),
      result,
    );
  }
  const strategy = federationManyOperations[path];
  if (!strategy)
    throw new ApiError({ code: "METHOD_NOT_SUPPORTED", message: "This operation has no federation result contract" });
  let selected = targets;
  if (strategy === "first") {
    const first = context.integrations?.[0];
    selected = targets.filter((target) => target.id === first?.id);
  }
  const groups = new Map<string, Target[]>();
  for (const target of selected) {
    const key = target.origin?.connectionId ?? "local";
    const group = groups.get(key) ?? [];
    group.push(target);
    groups.set(key, group);
  }
  const entries = [...groups];
  const results: unknown[] = [];
  const failures: unknown[] = [];
  // Bound fanout; writes are attempted once and never automatically retried.
  for (let offset = 0; offset < entries.length; offset += 4) {
    const batch = await Promise.allSettled(
      entries.slice(offset, offset + 4).map(async ([connectionId, group]) => {
        if (connectionId === "local") {
          const ids = new Set(group.map(({ id }) => id));
          return options.execute({
            context: {
              ...context,
              integrations: context.integrations?.filter((integration) => ids.has(integration.id)),
            },
            input: { ...input, integrationIds: [...ids] },
          });
        }
        const identities = new Map(group.map((target) => [target.origin?.remoteIntegrationId ?? "", target.id]));
        const result = await callFederatedProcedure(
          context,
          connectionId,
          procedurePath,
          { ...input, integrationIds: [...identities.keys()] },
          { signal: options.signal },
        );
        return rewriteFederatedMedia(
          context,
          connectionId,
          identities,
          remapIntegrationResult(result, identities, strategy),
        );
      }),
    );
    batch.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
        return;
      }
      failures.push(result.reason);
      const group = entries[offset + index]?.[1] ?? [];
      if (metadata.action === "query" && strategy !== "first")
        results.push(federationFailureResult(path, strategy, group));
    });
  }
  if (failures.length && (metadata.action !== "query" || failures.length === groups.size || strategy === "first"))
    throw failures[0];
  return mergeFederationResults(strategy, results);
}

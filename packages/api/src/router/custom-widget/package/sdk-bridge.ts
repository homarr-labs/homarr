import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { hasQueryAccessToIntegrationsAsync } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { decryptSecret } from "@homarr/common/server";
import { createId } from "@homarr/common";
import { eq, inArray } from "@homarr/db";
import {
  customWidgetConnections,
  groupMembers,
  integrationGroupPermissions,
  integrations,
  integrationUserPermissions,
} from "@homarr/db/schema";
import type { WidgetSdkInvocation } from "@homarr/custom-widgets/package/server";

import { readPackageHistory, widgetHistoryInputSchema } from "./history";
import { getBoundConnection } from "./connections";
import { fetchWidgetConnection, widgetHttpInputSchema } from "./http";
import {
  getNativeWidgetCapability,
  invokeNativeWidgetCapability,
  subscribeNativeWidgetCapability,
} from "./native-capabilities";
import type { ResolvedPackagePlacement } from "./records";
import { readWidgetStorage, writeWidgetStorage, widgetStorageInputSchema } from "./storage";
import type { PackageContext } from "./types";
import { refreshWidgetActor } from "./actor";
import { invokeLegacyWidgetRequest } from "./conversion-request";

const integrationCallSchema = z.object({
  connection: z.string(),
  capability: z.string(),
  input: z.unknown().default({}),
});

export function createWidgetSdkBridge(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  kind: "query" | "action" | "subscription",
  guest: boolean,
  outerSignal?: AbortSignal,
) {
  const subscriptions = new Map<string, AsyncGenerator<unknown>>();
  const controller = new AbortController();
  const signal = controller.signal;
  const observed = new WeakSet<AbortSignal>();
  const dispose = () => {
    controller.abort();
    for (const iterator of subscriptions.values()) void iterator.return(undefined).catch(() => undefined);
    subscriptions.clear();
  };
  outerSignal?.addEventListener("abort", dispose, { once: true });
  if (outerSignal?.aborted) dispose();
  return async ({ operation, input, signal: invocationSignal }: WidgetSdkInvocation) => {
    ctx = await refreshWidgetActor(ctx);
    if (invocationSignal && !observed.has(invocationSignal)) {
      observed.add(invocationSignal);
      invocationSignal.addEventListener("abort", dispose, { once: true });
      if (invocationSignal.aborted) dispose();
    }
    signal?.throwIfAborted();
    if (operation === "legacy.request") return invokeLegacyWidgetRequest(ctx, resolved, kind, input, signal);
    if (operation === "widget.context") {
      const ids = Object.values(resolved.bindings);
      let labels = new Map<string, string>();
      if (ids.length) {
        const rows = await ctx.db.query.customWidgetConnections.findMany({
          where: inArray(customWidgetConnections.id, ids),
          columns: { id: true, name: true },
        });
        labels = new Map(rows.map((row) => [row.id, row.name]));
      }
      return {
        options: resolved.configuration,
        bindingNames: Object.keys(resolved.bindings),
        bindingLabels: Object.fromEntries(
          Object.entries(resolved.bindings).map(([name, id]) => [name, labels.get(id) ?? name]),
        ),
        installationId: resolved.installation.id,
        isPreview: Boolean(resolved.preview),
      };
    }
    if (operation === "integration.next" || operation === "integration.unsubscribe") {
      const { id } = z.object({ id: z.string() }).parse(input);
      const iterator = subscriptions.get(id);
      if (!iterator) return { done: true };
      if (operation === "integration.unsubscribe") {
        subscriptions.delete(id);
        await iterator.return(undefined);
        return { done: true };
      }
      const result = await iterator.next();
      if (result.done) subscriptions.delete(id);
      return result;
    }
    if (operation === "history.get") return readPackageHistory(ctx, resolved, widgetHistoryInputSchema.parse(input));
    if (operation === "storage.get") {
      const parsed = widgetStorageInputSchema.omit({ itemId: true }).parse(input);
      return readWidgetStorage(ctx, resolved, { ...parsed, itemId: resolved.item.id });
    }
    if (operation === "storage.set") {
      if (kind !== "action")
        throw new TRPCError({ code: "FORBIDDEN", message: "Storage writes require an action handler" });
      const parsed = widgetStorageInputSchema.omit({ itemId: true }).extend({ value: z.unknown() }).parse(input);
      return writeWidgetStorage(ctx, resolved, { ...parsed, value: parsed.value, itemId: resolved.item.id }, true);
    }
    if (operation === "connection.fetch")
      return fetchWidgetConnection(ctx, resolved.bindings, widgetHttpInputSchema.parse(input), signal);
    if (operation === "connection.get") {
      const { connection } = z.object({ connection: z.string() }).parse(input);
      const { configuration, secrets } = await getBoundConnection(ctx, resolved.bindings, connection);
      return { configuration, secrets };
    }
    if (operation === "integration.call" || operation === "integration.subscribe") {
      const parsed = integrationCallSchema.parse(input);
      const descriptor = getNativeWidgetCapability(parsed.capability);
      if (descriptor.kind === "action" && kind !== "action")
        throw new TRPCError({ code: "FORBIDDEN", message: "Native actions require an action handler" });
      const { row } = await getBoundConnection(ctx, resolved.bindings, parsed.connection);
      if (!row.integrationId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "An integration connection is required" });
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, row.integrationId),
        with: {
          app: true,
          secrets: true,
          groupPermissions: {
            where: inArray(
              integrationGroupPermissions.groupId,
              ctx.db
                .select({ groupId: groupMembers.groupId })
                .from(groupMembers)
                .where(eq(groupMembers.userId, ctx.session?.user.id ?? "")),
            ),
          },
          userPermissions: {
            where: eq(integrationUserPermissions.userId, ctx.session?.user.id ?? ""),
          },
          items: { with: { item: true } },
        },
      });
      if (!integration) throw new TRPCError({ code: "NOT_FOUND", message: "Integration not found" });
      // A named connection bound by the owner is the custom equivalent of a native integration_item.
      // Include only this already authorized placement when applying the native board-view policy.
      const permissionIntegration = {
        ...integration,
        items: [...integration.items, { item: { boardId: resolved.item.boardId } }],
      };
      if (!guest) {
        if (descriptor.kind === "action") {
          if (!constructIntegrationPermissions(integration, ctx.session).hasInteractAccess)
            throw new TRPCError({ code: "FORBIDDEN" });
        } else if (!(await hasQueryAccessToIntegrationsAsync(ctx.db, [permissionIntegration], ctx.session)))
          throw new TRPCError({ code: "FORBIDDEN" });
      }
      const nativeIntegration = {
        ...integration,
        externalUrl: integration.app?.href ?? null,
        decryptedSecrets: integration.secrets.map((secret) => ({ ...secret, value: decryptSecret(secret.value) })),
      };
      if (operation === "integration.subscribe") {
        if (kind !== "subscription" || descriptor.kind !== "subscription" || !signal)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Live native data requires a subscription handler" });
        if (subscriptions.size >= 16)
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many native subscriptions in one handler" });
        const id = createId();
        subscriptions.set(
          id,
          subscribeNativeWidgetCapability(nativeIntegration, parsed.capability, parsed.input, signal),
        );
        return id;
      }
      return invokeNativeWidgetCapability(nativeIntegration, parsed.capability, parsed.input, signal);
    }
    throw new TRPCError({ code: "NOT_FOUND", message: `Unknown widget SDK operation '${operation}'` });
  };
}

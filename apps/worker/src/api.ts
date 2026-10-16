import { RPCHandler } from "@orpc/server/fetch";
import { ORPCError } from "@orpc/server";

import { appRouter, createApiContext, createCaller } from "@homarr/api";
import type { ApiContext } from "@homarr/api";
import { bindWorkerRequestSession } from "@homarr/auth/request-session";
import type { Session } from "@homarr/auth";
import { getPermissionsWithChildren } from "@homarr/definitions";
import { db, eq } from "@homarr/db";
import {
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  groups,
  users,
  integrationUserPermissions,
} from "@homarr/db/schema";

import type { AccessPrincipal } from "@homarr/worker-access";
import { WorkerAccessError } from "@homarr/worker-access";
import type { WorkerState } from "./state";
import { initializeWorkerServices } from "./services";

const rpc = new RPCHandler(appRouter, { allowMethods: ["POST"] });
const ownerSessions = new WeakMap<WorkerState, Promise<Session>>();

export function getOwnerSession(state: WorkerState) {
  const current = ownerSessions.get(state);
  if (current) return current;
  const ownerSession = (async () => {
    const id = `worker:${state.workerId}`;
    await db.insert(users).values({ id, name: "Worker owner", provider: "oidc" }).onConflictDoNothing();
    const groupId = `worker-owner:${state.workerId}`;
    await db.insert(groups).values({ id: groupId, name: groupId, position: 0 }).onConflictDoNothing();
    const existingPermission = await db.query.groupPermissions.findFirst({
      where: eq(groupPermissions.groupId, groupId),
    });
    if (!existingPermission) await db.insert(groupPermissions).values({ groupId, permission: "admin" });
    const membership = await db.query.groupMembers.findFirst({ where: eq(groupMembers.userId, id) });
    if (!membership) await db.insert(groupMembers).values({ groupId, userId: id });
    return {
      user: { id, name: "Worker owner", colorScheme: "dark", permissions: getPermissionsWithChildren(["admin"]) },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    } satisfies Session;
  })();
  ownerSessions.set(state, ownerSession);
  return ownerSession;
}

/** Reachable only through an authenticated encrypted worker channel and its native identity. */
export async function executeOwnerRequest(
  incoming: Request,
  state: WorkerState,
  principal?: AccessPrincipal,
): Promise<Response> {
  const path = new URL(incoming.url).pathname;
  if (path.startsWith("/api/trpc") || path.startsWith("/api/auth"))
    return Response.json({ error: "Not found" }, { status: 404 });
  const headers = new Headers(incoming.headers);
  // oxlint-disable-next-line unicorn/no-useless-spread -- Headers iteration is live; snapshot before deleting credentials.
  for (const name of [...headers.keys()]) {
    if (/^(?:cookie|authorization|apikey|x-forwarded-|x-homarr-)/i.test(name)) headers.delete(name);
  }
  const publicUrl = new URL(state.publicUrl);
  headers.set("host", publicUrl.host);
  headers.set("x-forwarded-proto", publicUrl.protocol.slice(0, -1));
  headers.set("x-worker-device-source", "encrypted-channel");
  const request = new Request(incoming, { headers });
  let session: Session;
  if (principal) session = await getReadSession(state, principal);
  else session = await getOwnerSession(state);
  bindWorkerRequestSession(request, session);
  await initializeWorkerServices();
  const context = createWorkerApiContext(state, principal, session, headers);
  if (path.startsWith("/api/federation/media/") && request.method === "GET") {
    const { readFederatedMedia } = await import("@homarr/api/federation-media");
    return readFederatedMedia(context, decodeURIComponent(path.slice("/api/federation/media/".length)), request);
  }
  if (path.startsWith("/rpc/")) {
    const result = await rpc.handle(request, { prefix: "/rpc", context });
    if (result.matched) return result.response;
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (path === "/api/mcp") {
    const { handleMcpRequest } = await import("@homarr/api/http/mcp/_handler");
    return handleMcpRequest(request);
  }
  if (path === "/api/assistant/chat") {
    const { POST } = await import("@homarr/api/http/assistant/route");
    return POST(request);
  }
  if (path === "/api/openapi") {
    const { openApiDocument } = await import("@homarr/api/open-api");
    return Response.json(await openApiDocument(state.publicUrl));
  }
  if (
    /^\/api\/(?:about|assistant|backup|custom-widgets|health|image-proxy|onboarding|user-medias)(?:\/|$)/.test(path)
  ) {
    const { resourcesRoutes } = await import("@homarr/backend-handlers/router");
    return resourcesRoutes.fetch(request);
  }
  if (path.startsWith("/api/")) {
    const { createOpenApiHandler } = await import("@homarr/api/open-api");
    const handler = createOpenApiHandler();
    const result = await handler.handle(request, { context });
    if (result.matched) return result.response;
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}

/** Native widget authorization receives view access only, never the owner's identity. */
export async function getReadSession(state: WorkerState, principal: AccessPrincipal): Promise<Session> {
  const grant = state.access.assertActive(principal);
  if (grant.role === "owner") return getOwnerSession(state);
  if (grant.role === "user") {
    const { getNativeUserSession } = await import("./native-user");
    return getNativeUserSession(state, principal);
  }
  if (grant.role === "service") {
    const scope = grant.service;
    if (!scope) throw new Error("Service scope missing");
    const id = `worker-service:${grant.id}`;
    await db.insert(users).values({ id, name: "Worker service", provider: "oidc" }).onConflictDoNothing();
    let permission: "use" | "interact" | "full" = "use";
    if (scope.access === "interact") permission = "interact";
    if (scope.access === "full") permission = "full";
    // Native integration middleware still performs its ordinary user ACL checks.
    // Only create permissions for currently present integrations; deleted IDs stay inaccessible.
    const records = await db.query.integrations.findMany({
      where: (table, { inArray }) => inArray(table.id, scope.integrationIds),
      columns: { id: true },
    });
    if (records.length)
      await db
        .insert(integrationUserPermissions)
        .values(
          records.map(({ id: integrationId }) => ({
            integrationId,
            userId: id,
            permission,
          })),
        )
        .onConflictDoNothing();
    return {
      user: { id, name: "Worker service", colorScheme: "dark", permissions: [] },
      expires: new Date(grant.expiresAt ?? Date.now()).toISOString(),
    };
  }
  const id = `worker-view:${grant.id}`;
  await db.insert(users).values({ id, name: "Shared dashboard", provider: "oidc" }).onConflictDoNothing();
  for (const boardId of grant.boardIds) {
    const board = await db.query.boards.findFirst({
      where: (table) => eq(table.id, boardId),
      columns: { id: true },
    });
    if (board)
      await db.insert(boardUserPermissions).values({ userId: id, boardId, permission: "view" }).onConflictDoNothing();
  }
  return {
    user: { id, name: "Shared dashboard", colorScheme: "dark", permissions: [] },
    expires: new Date(grant.expiresAt ?? Date.now() + 86_400_000).toISOString(),
  };
}

export function createWorkerApiContext(
  state: WorkerState,
  principal: AccessPrincipal | undefined,
  session: Session,
  headers: Headers,
): ApiContext {
  const context = createApiContext({ session, headers });
  if (!principal) return context;
  return {
    ...context,
    workerAccess: {
      role: principal.role,
      workerId: state.workerId,
      grantId: principal.grantId,
      service: principal.service,
      authorizeProcedure: async (procedure) => {
        try {
          if (principal.role === "viewer") {
            const { authorizeNativeViewer } = await import("./native-viewer");
            return await authorizeNativeViewer(state, principal, { ...procedure, input: procedure.input });
          }
          state.access.authorizeProcedure(principal, procedure);
        } catch (error) {
          if (error instanceof WorkerAccessError) throw new ORPCError(error.code, { message: error.message });
          throw error;
        }
      },
      projectResult: async (result) => {
        try {
          state.access.assertActive(principal);
          if (principal.role === "viewer") {
            const { projectNativeViewerResult } = await import("./native-viewer");
            return await projectNativeViewerResult(state, principal, result);
          }
          return result.result;
        } catch (error) {
          if (error instanceof WorkerAccessError) throw new ORPCError(error.code, { message: error.message });
          throw error;
        }
      },
    },
  };
}

/** Bootstrap is read inside the encrypted channel; the hosted frontend never executes these reads. */
export async function getFrontendBootstrap(state: WorkerState, principal: AccessPrincipal, headers: Headers) {
  if (principal.role === "viewer") {
    const { getNativeViewerBootstrap } = await import("./native-viewer");
    return getNativeViewerBootstrap(state, principal, headers);
  }
  if (principal.role !== "user") state.access.requireOwner(principal);
  const session = await getReadSession(state, principal);
  const caller = createCaller(createWorkerApiContext(state, principal, session, headers));
  const availability = caller.assistant
    .getAvailability()
    .then(({ enabled }) => {
      if (enabled) return "enabled" as const;
      return "unconfigured" as const;
    })
    .catch(() => "error" as const);
  const [user, serverSettings, runtime, integrationPermissions, assistantAvailability] = await Promise.all([
    caller.frontend.userSettings({ userId: session.user.id }),
    caller.frontend.settings(),
    caller.frontend.runtime(),
    caller.frontend.integrationPermissions(),
    availability,
  ]);
  state.access.assertActive(principal);
  return { session, user: user ?? null, serverSettings, runtime, integrationPermissions, assistantAvailability };
}

import { RPCHandler } from "@orpc/server/fetch";

import { appRouter, createApiContext } from "@homarr/api";
import { bindWorkerRequestSession } from "@homarr/auth/request-session";
import type { Session } from "@homarr/auth";
import { getPermissionsWithChildren } from "@homarr/definitions";
import { db, eq } from "@homarr/db";
import { boardUserPermissions, groupMembers, groupPermissions, groups, users } from "@homarr/db/schema";

import type { AccessPrincipal } from "@homarr/worker-access";
import type { WorkerState } from "./state";
import { initializeWorkerServices } from "./services";

const rpc = new RPCHandler(appRouter, { allowMethods: ["POST"] });
let ownerSession: Promise<Session> | undefined;

export function getOwnerSession(state: WorkerState) {
  ownerSession ??= (async () => {
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
  return ownerSession;
}

/** This function is reachable only after worker-owned owner-grant authorization. */
export async function executeOwnerRequest(incoming: Request, state: WorkerState): Promise<Response> {
  const path = new URL(incoming.url).pathname;
  if (path.startsWith("/api/trpc") || path.startsWith("/api/auth"))
    return Response.json({ error: "Not found" }, { status: 404 });
  const headers = new Headers(incoming.headers);
  for (const name of [...headers.keys()]) {
    if (/^(?:cookie|authorization|apikey|x-forwarded-|x-homarr-)/i.test(name)) headers.delete(name);
  }
  const publicUrl = new URL(state.publicUrl);
  headers.set("host", publicUrl.host);
  headers.set("x-forwarded-proto", publicUrl.protocol.slice(0, -1));
  headers.set("x-worker-device-source", "encrypted-channel");
  const request = new Request(incoming, { headers });
  const session = await getOwnerSession(state);
  bindWorkerRequestSession(request, session);
  await initializeWorkerServices();
  const context = createApiContext({ session, headers });
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
  if (/^\/api\/(?:about|backup|custom-widgets|health|image-proxy|onboarding|user-medias)(?:\/|$)/.test(path)) {
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
  const id = `worker-view:${grant.id}`;
  await db.insert(users).values({ id, name: "Shared dashboard", provider: "oidc" }).onConflictDoNothing();
  for (const boardId of grant.boardIds) {
    const board = await db.query.boards.findFirst({
      where: (table, { eq }) => eq(table.id, boardId),
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

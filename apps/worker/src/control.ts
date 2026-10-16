import type { WorkerRequestContext } from "@homarr/remote-protocol";
import { WorkerAccessError } from "@homarr/worker-access";
import type { AuthenticatedEnvelope, GrantScope } from "@homarr/worker-access";
import type { EnrollmentChallenge } from "@homarr/remote-protocol";

import type { WorkerChannels } from "./transport";
import type { WorkerState } from "./state";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) return {};
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16_384) throw new WorkerAccessError("INVALID_INPUT", "Control request exceeds 16 KiB");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  const value: unknown = JSON.parse(new TextDecoder().decode(body));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new WorkerAccessError("INVALID_INPUT", "Expected a JSON object");
  return value as Record<string, unknown>;
}

export function createWorkerRequestHandler(state: WorkerState, getChannels: () => WorkerChannels) {
  return async (request: Request, context: WorkerRequestContext): Promise<Response> => {
    try {
      const { principal } = context.authorization as AuthenticatedEnvelope;
      const currentGrant = state.access.assertActive(principal);
      const url = new URL(request.url);
      const path = url.pathname;
      let response: Response | undefined;
      if (path === "/remote/info" && request.method === "GET") {
        response = Response.json({
          workerId: state.workerId,
          name: process.env.WORKER_NAME ?? "Homarr worker",
          claimed: state.access.claimed,
          role: principal.role,
          grantId: principal.grantId,
        });
      } else if (path === "/remote/boards" && request.method === "GET") {
        const { listBoards } = await import("./boards");
        response = Response.json(await listBoards(state, principal));
      } else if (/^\/remote\/boards\/[^/]+\/media\/[^/]+$/.test(path) && request.method === "GET") {
        const parts = path.split("/");
        const { readBoardMedia } = await import("./media");
        response = await readBoardMedia(
          state,
          principal,
          decodeURIComponent(parts[3] ?? ""),
          decodeURIComponent(parts[5] ?? ""),
          request,
        );
      } else if (/^\/remote\/boards\/[^/]+$/.test(path) && request.method === "GET") {
        const id = decodeURIComponent(path.slice("/remote/boards/".length));
        const { readBoard } = await import("./boards");
        const board = await readBoard(state, principal, id, request.signal);
        if (!board) return Response.json({ error: "Board not found" }, { status: 404 });
        response = Response.json(board);
      } else if (path.startsWith("/remote/access/")) {
        state.access.requireOwner(principal);
        const parts = path.slice("/remote/access/".length).split("/");
        const resource = parts[0];
        const id = parts[1];
        if (request.method === "GET" && !id) {
          if (resource === "grants") response = Response.json({ grants: state.access.listGrants(principal) });
          if (resource === "shares") response = Response.json({ shares: state.access.listShares(principal) });
          if (resource === "invitations")
            response = Response.json({ invitations: state.access.listInvitations(principal) });
        } else if (request.method === "POST" && !id) {
          const body = await readBody(request);
          if (resource === "shares") {
            const share = await state.access.issueShare(principal, {
              boardIds: body.boardIds as string[],
              expiresAt: body.expiresAt as number | null | undefined,
              anonymous: body.anonymous as boolean | undefined,
            });
            response = Response.json({ share }, { status: 201 });
          }
          if (resource === "invitations") {
            const invitation = await state.access.createInvitation(principal, body as GrantScope);
            response = Response.json({ invitation }, { status: 201 });
          }
        } else if (request.method === "DELETE" && id && parts.length === 2) {
          if (resource === "invitations") state.access.revokeInvitation(principal, id);
          else if (resource === "shares" || resource === "grants") state.access.revokeGrant(principal, id);
          else return Response.json({ error: "Not found" }, { status: 404 });
          getChannels().revalidate();
          response = Response.json({ revoked: true });
        }
      } else if (path === "/remote/platform-enrollment" && request.method === "POST") {
        state.access.requireOwner(principal);
        const body = await readBody(request);
        response = Response.json(await state.access.signEnrollment(principal, body.challenge as EnrollmentChallenge));
      } else if (path.startsWith("/rpc/") || path.startsWith("/api/")) {
        state.access.requireOwner(principal);
        const { executeOwnerRequest } = await import("./api");
        response = await executeOwnerRequest(request, state);
      }
      if (!response) return Response.json({ error: "Not found" }, { status: 404 });
      state.access.assertActive(principal);
      response.headers.set("Cache-Control", "no-store");
      // Long streams terminate at grant expiry/revocation through WorkerChannels.
      void currentGrant;
      return response;
    } catch (error) {
      if (error instanceof WorkerAccessError) {
        let status: 400 | 401 | 403 | 404 | 429 = 403;
        if (error.code === "UNAUTHORIZED") status = 401;
        if (error.code === "INVALID_INPUT" || error.code === "CLAIMED") status = 400;
        if (error.code === "NOT_FOUND") status = 404;
        if (error.code === "RATE_LIMITED") status = 429;
        return Response.json({ error: error.message, code: error.code }, { status });
      }
      if (error instanceof SyntaxError || error instanceof URIError)
        return Response.json({ error: "Invalid request" }, { status: 400 });
      console.error("Worker request failed", error instanceof Error ? error.name : "unknown");
      return Response.json({ error: "Worker request failed" }, { status: 500 });
    }
  };
}

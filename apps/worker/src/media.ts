import { fromBase64Url, signIdentity, toBase64Url, utf8, verifyIdentity } from "@homarr/remote-protocol";
import type { AccessPrincipal } from "@homarr/worker-access";
import { WorkerAccessError } from "@homarr/worker-access";

import type { WorkerState } from "./state";

interface MediaGrant {
  version: 1;
  workerId: string;
  boardId: string;
  grantId: string;
  assetId: string;
  expiresAt: number;
}
const signingPrefix = "homarr-board-media-v1:";

export async function createBoardMediaPath(
  state: WorkerState,
  principal: AccessPrincipal,
  boardId: string,
  path: string,
) {
  state.access.authorizeProcedure(principal, { path: "remote.board", kind: "query", boardId });
  const match = /^\/api\/image-proxy\/([A-Za-z0-9_-]{1,256})$/.exec(path);
  if (!match?.[1]) throw new WorkerAccessError("INVALID_INPUT", "Invalid board media source");
  const grant = state.access.assertActive(principal);
  const payload: MediaGrant = {
    version: 1,
    workerId: state.workerId,
    boardId,
    grantId: principal.grantId,
    assetId: match[1],
    expiresAt: Math.min(Date.now() + 300_000, grant.expiresAt ?? Infinity),
  };
  const encoded = toBase64Url(utf8(JSON.stringify(payload)));
  const signature = await signIdentity(state.identity, signingPrefix + encoded);
  return `/remote/boards/${encodeURIComponent(boardId)}/media/${encoded}.${signature}`;
}

export async function readBoardMedia(
  state: WorkerState,
  principal: AccessPrincipal,
  boardId: string,
  token: string,
  request: Request,
) {
  state.access.authorizeProcedure(principal, { path: "remote.board", kind: "query", boardId });
  if (token.length > 2048) throw new WorkerAccessError("UNAUTHORIZED", "Invalid media grant");
  const [encoded, signature, extra] = token.split(".");
  if (
    !encoded ||
    !signature ||
    extra ||
    !(await verifyIdentity(state.identity.publicJwk, signingPrefix + encoded, signature))
  )
    throw new WorkerAccessError("UNAUTHORIZED", "Invalid media grant");
  const value = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded, 1024))) as MediaGrant;
  if (
    value.version !== 1 ||
    value.workerId !== state.workerId ||
    value.boardId !== boardId ||
    value.grantId !== principal.grantId ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= Date.now() ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(value.assetId)
  )
    throw new WorkerAccessError("UNAUTHORIZED", "Media grant expired or outside this share");
  const { GET } = await import("@homarr/backend-handlers/image-proxy");
  const response = await GET(request, { params: Promise.resolve({ id: value.assetId }) });
  const contentType = response.headers.get("Content-Type") ?? "";
  if (response.ok && !contentType.startsWith("image/"))
    return Response.json({ error: "Media is not an image" }, { status: 415 });
  state.access.assertActive(principal);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

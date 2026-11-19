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
  kind?: "image" | "glb" | "stl";
  expiresAt: number;
}
const signingPrefix = "homarr-board-media-v1:";

export async function createBoardMediaPath(
  state: WorkerState,
  principal: AccessPrincipal,
  boardId: string,
  path: string,
  kind: "image" | "glb" | "stl" = "image",
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
    kind,
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
    (value.kind !== undefined && value.kind !== "image" && value.kind !== "glb" && value.kind !== "stl") ||
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
  let response = await GET(request, { params: Promise.resolve({ id: value.assetId }) });
  const contentType = response.headers.get("Content-Type") ?? "";
  if (value.kind === "glb" || value.kind === "stl") {
    const meshTypes = new Set([
      "application/octet-stream",
      "model/gltf-binary",
      "model/stl",
      "application/sla",
      "application/vnd.ms-pki.stl",
      "text/plain",
    ]);
    if (response.status >= 300 && response.status < 400)
      return Response.json({ error: "Mesh redirects are unavailable" }, { status: 502 });
    if (response.ok) {
      if (!meshTypes.has(contentType.split(";")[0]?.trim().toLowerCase() ?? ""))
        return Response.json({ error: "Unsupported mesh media type" }, { status: 415 });
      const reader = response.body?.getReader();
      if (!reader) return Response.json({ error: "Empty mesh" }, { status: 415 });
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          length += chunk.byteLength;
          if (length > 32 * 1024 * 1024) {
            await reader.cancel();
            return Response.json({ error: "Mesh exceeds the 32 MiB limit" }, { status: 413 });
          }
          chunks.push(chunk);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const view = new DataView(bytes.buffer);
      let valid = false;
      if (value.kind === "glb" && length >= 12)
        valid =
          view.getUint32(0, true) === 0x46546c67 &&
          view.getUint32(4, true) === 2 &&
          view.getUint32(8, true) === length;
      if (value.kind === "stl") {
        if (length >= 84) valid = 84 + view.getUint32(80, true) * 50 === length;
        if (!valid) {
          const text = new TextDecoder().decode(bytes);
          valid = /^\s*solid(?:\s|$)/.test(text) && /\bendsolid[^\r\n]*\s*$/.test(text);
        }
      }
      if (!valid) return Response.json({ error: "Invalid mesh data" }, { status: 415 });
      response = new Response(bytes, { status: response.status, headers: response.headers });
    }
  } else if (response.ok && !contentType.startsWith("image/"))
    return Response.json({ error: "Media is not an image" }, { status: 415 });
  state.access.assertActive(principal);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

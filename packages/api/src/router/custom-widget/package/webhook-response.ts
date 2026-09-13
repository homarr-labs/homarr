import { TRPCError } from "@trpc/server";

import { createSessionAsync } from "@homarr/auth/server";
import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { users } from "@homarr/db/schema";

import { invokePackageHandler } from "./invocations";
import { acquireCustomWidgetRequestLimit } from "../request-limits";
import { getWebhookAuthorizationDigest, getWebhookRecord, matchesWebhookToken } from "./webhook-records";

export async function widgetWebhookResponse(db: Database, request: Request, params: { itemId: string; id: string }) {
  let release: (() => Promise<void>) | undefined;
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer /iu, "") ?? "";
    const stored = await getWebhookRecord({ db, session: null }, params.itemId, params.id);
    if (!stored || !token || token.length > 256 || !matchesWebhookToken(token, stored.record.tokenHash))
      return Response.json({ error: "Webhook is unavailable" }, { status: 401 });
    const user = await db.query.users.findFirst({ where: eq(users.id, stored.record.userId) });
    if (!user) throw new TRPCError({ code: "FORBIDDEN" });
    const session = await createSessionAsync(db, user);
    if (!session.user.permissions.includes("admin")) throw new TRPCError({ code: "FORBIDDEN" });
    release = await acquireCustomWidgetRequestLimit({
      category: "action",
      itemId: params.itemId,
      definitionId: stored.row.installationId,
    });
    const body = await readWebhookBody(request);
    const result = await invokePackageHandler(
      { db, session },
      { itemId: params.itemId, name: stored.record.handler, input: body },
      "action",
      request.signal,
      async (ctx, resolved) => {
        if (!ctx.session?.user.permissions.includes("admin")) throw new TRPCError({ code: "FORBIDDEN" });
        const current = await getWebhookRecord(ctx, params.itemId, params.id);
        if (
          !current ||
          !matchesWebhookToken(token, current.record.tokenHash) ||
          current.record.authorizationDigest !== (await getWebhookAuthorizationDigest(ctx, resolved))
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The owner must register a new webhook after this widget changed",
          });
      },
    );
    return Response.json({ result: result ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    let status = 500;
    let message = "Widget webhook failed";
    if (error instanceof TRPCError) {
      const statuses = {
        FORBIDDEN: 403,
        UNAUTHORIZED: 401,
        NOT_FOUND: 404,
        BAD_REQUEST: 400,
        PAYLOAD_TOO_LARGE: 413,
        TOO_MANY_REQUESTS: 429,
        PRECONDITION_FAILED: 412,
      };
      status = statuses[error.code as keyof typeof statuses] ?? 500;
      if (status !== 500) message = error.message;
    }
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  } finally {
    await release?.();
  }
}

async function readWebhookBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new TRPCError({ code: "BAD_REQUEST", message: "Send a JSON body with Content-Type application/json" });
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > 1_048_576) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
      chunks.push(result.value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks, length).toString("utf8")) as unknown;
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid JSON body" });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

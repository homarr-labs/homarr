import { cookies } from "next/headers";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { readBoundedJsonResponseAsync } from "@homarr/common/server";
import { db, eq, handleTransactionsAsync } from "@homarr/db";
import { integrations, integrationUserPermissions } from "@homarr/db/schema";
import {
  FrameleafConnection,
  FrameleafConnectionError,
  FrameleafDatabaseStore,
  normalizeFrameleafOrigin,
} from "@homarr/integrations/frameleaf";

import {
  frameleafCallback,
  frameleafCookie,
  frameleafError,
  frameleafResponseHeaders,
  requireFrameleafManagementAsync,
  requireFrameleafOrigin,
} from "./_access";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") ?? undefined;
    await requireFrameleafManagementAsync(id);
    const state = id ? await new FrameleafDatabaseStore(db, id).readAsync() : null;
    let callback: string | null = null;
    try {
      callback = frameleafCallback();
    } catch {
      /* The setup screen explains the required HTTPS BASE_URL. */
    }
    return Response.json({ callback, status: state?.status ?? "disconnected" }, { headers: frameleafResponseHeaders });
  } catch (error) {
    return frameleafError(error);
  }
}

const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("start"),
      id: z.string().min(1).max(128).optional(),
      name: z.string().trim().min(1).max(127),
      origin: z.string().max(2048),
      clientId: z.string().max(512).optional(),
    })
    .strict(),
  z.object({ action: z.literal("disconnect"), id: z.string().min(1).max(128) }).strict(),
]);
export async function POST(request: Request) {
  try {
    requireFrameleafOrigin(request);
    const input = inputSchema.parse(await readBoundedJsonResponseAsync(request, 8192, "Frameleaf connection request"));
    const { session, token } = await requireFrameleafManagementAsync(input.id);
    if (input.action === "disconnect") {
      await new FrameleafConnection(new FrameleafDatabaseStore(db, input.id)).disconnectAsync();
      return Response.json({ status: "disconnected" }, { headers: frameleafResponseHeaders });
    }
    const origin = normalizeFrameleafOrigin(input.origin);
    const id = input.id ?? createId();
    if (input.id) {
      const current = await db.query.integrations.findFirst({ where: eq(integrations.id, id) });
      if (current?.kind !== "frameleaf" || normalizeFrameleafOrigin(current.url) !== origin)
        throw new FrameleafConnectionError("consent");
      if (await new FrameleafDatabaseStore(db, id).readAsync()) throw new FrameleafConnectionError("reconnect");
      await db.update(integrations).set({ name: input.name }).where(eq(integrations.id, id));
    } else {
      await handleTransactionsAsync(db, {
        handleSync(database) {
          database.transaction((transaction) => {
            transaction.insert(integrations).values({ id, kind: "frameleaf", name: input.name, url: origin }).run();
            transaction
              .insert(integrationUserPermissions)
              .values({ integrationId: id, userId: session.user.id, permission: "full" })
              .run();
          });
        },
        async handleAsync(database, schema) {
          await database.transaction(async (transaction) => {
            await transaction
              .insert(schema.integrations)
              .values({ id, kind: "frameleaf", name: input.name, url: origin });
            await transaction
              .insert(schema.integrationUserPermissions)
              .values({ integrationId: id, userId: session.user.id, permission: "full" });
          });
        },
      });
    }
    const store = new FrameleafDatabaseStore(db, id);
    let authorizationUrl: string;
    try {
      authorizationUrl = await new FrameleafConnection(store).startAsync({
        origin,
        clientId: input.clientId,
        callback: frameleafCallback(),
        userId: session.user.id,
        sessionId: token,
      });
    } catch (error) {
      if (!input.id && (await store.readAsync()) === null) await db.delete(integrations).where(eq(integrations.id, id));
      throw error;
    }
    (await cookies()).set(frameleafCookie, id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/integrations/frameleaf",
      maxAge: 300,
    });
    return Response.json({ authorizationUrl }, { headers: frameleafResponseHeaders });
  } catch (error) {
    return frameleafError(error);
  }
}

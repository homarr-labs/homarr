import { cookies } from "next/headers";

import { db } from "@homarr/db";
import { FrameleafConnection, FrameleafConnectionError, FrameleafDatabaseStore } from "@homarr/integrations/frameleaf";

import {
  frameleafCallback,
  frameleafCookie,
  frameleafResponseHeaders,
  requireFrameleafManagementAsync,
} from "../_access";

export async function GET(request: Request) {
  let id: string | undefined;
  let connected = false;
  let consumed = false;
  try {
    const matching = (await cookies()).getAll(frameleafCookie);
    id = matching.length === 1 ? matching[0]?.value : undefined;
    if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new FrameleafConnectionError("consent");
    const { session, token } = await requireFrameleafManagementAsync(id);
    const query = new URL(request.url).searchParams;
    const denied = query.has("error");
    if (
      query.getAll("state").length !== 1 ||
      (denied
        ? query.getAll("error").length !== 1 || !query.get("error") || query.has("code")
        : query.getAll("code").length !== 1)
    )
      throw new FrameleafConnectionError("consent");
    const input = {
      state: query.get("state") ?? "",
      callback: frameleafCallback(),
      userId: session.user.id,
      sessionId: token,
    };
    connected = await new FrameleafConnection(new FrameleafDatabaseStore(db, id)).completeAsync(
      denied ? { ...input, denied: true } : { ...input, code: query.get("code") ?? "" },
    );
    consumed = true;
  } catch {
    /* Never expose callback codes, state, credentials or provider responses. */
  }
  if (consumed)
    (await cookies()).set(frameleafCookie, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/integrations/frameleaf",
      maxAge: 0,
    });
  const path = id && /^[A-Za-z0-9_-]{1,128}$/.test(id) ? `/manage/integrations/edit/${id}` : "/manage/integrations";
  return new Response(null, {
    status: 303,
    headers: { ...frameleafResponseHeaders, Location: `${path}?frameleaf=${connected ? "connected" : "consent"}` },
  });
}

import { cookies } from "next/headers";

import { db } from "@homarr/db";
import { FrameleafConnection, FrameleafConnectionError, FrameleafDatabaseStore } from "@homarr/integrations/frameleaf";

import { frameleafCookie, frameleafResponseHeaders, requireFrameleafManagementAsync } from "../_access";

export async function GET(request: Request) {
  let id: string | undefined;
  let connected = false;
  try {
    const matching = (await cookies()).getAll(frameleafCookie);
    id = matching.length === 1 ? matching[0]?.value : undefined;
    if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new FrameleafConnectionError("consent");
    const { session, token } = await requireFrameleafManagementAsync(id);
    const query = new URL(request.url).searchParams;
    if (query.getAll("state").length !== 1 || query.getAll("code").length !== 1 || query.has("error"))
      throw new FrameleafConnectionError("consent");
    await new FrameleafConnection(new FrameleafDatabaseStore(db, id)).completeAsync({
      state: query.get("state") ?? "",
      code: query.get("code") ?? "",
      userId: session.user.id,
      sessionId: token,
    });
    connected = true;
  } catch {
    /* Never expose callback codes, state, credentials or provider responses. */
  }
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

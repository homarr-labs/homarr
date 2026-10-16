import type { Session } from "./types";

const trustedRequests = new WeakMap<Request, Session | null>();

/** Only an authenticated server transport may bind a session to this exact Request object. */
export function bindWorkerRequestSession(request: Request, session: Session | null) {
  trustedRequests.set(request, session);
}
export function getTrustedWorkerRequestSession(request: Request) {
  return trustedRequests.get(request);
}
export async function getSessionFromRequestAsync(request: Request): Promise<Session | null> {
  if (trustedRequests.has(request)) return trustedRequests.get(request) ?? null;
  const [{ parseCookies }, { db }, { getSessionFromTokenAsync, sessionTokenCookieName }] = await Promise.all([
    import("@homarr/common"),
    import("@homarr/db"),
    import("./session"),
  ]);
  const cookies = parseCookies(request.headers.get("cookie") ?? "");
  return getSessionFromTokenAsync(db, cookies[sessionTokenCookieName]);
}

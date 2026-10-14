import { Auth } from "@auth/core";
import type { AuthConfig } from "@auth/core";
import type { AdapterUser } from "@auth/core/adapters";
import { AuthError } from "@auth/core/errors";
import Credentials from "@auth/core/providers/credentials";

import type { MemoryStore } from "./adapter.ts";
import { fixture, verifyLocal } from "./fixtures.ts";
import type { FixtureIdentity } from "./fixtures.ts";

export type ProbeMode =
  | { kind: "credentials"; strategy: "database" | "jwt"; providers: ("credentials" | "ldap")[] }
  | { kind: "database-reader" };

export type ProbeFault =
  | "none"
  | "sign-in-event"
  | "jwt-encode"
  | "session-event"
  | "session-callback"
  | "signout-event";

export type ProbeError = { type: string; message: string; cause?: string };
export type RequestTrace = { requestId: string; steps: string[]; errors: ProbeError[]; stagedCookies: string[] };
export type LdapVerifier = (input: Partial<Record<string, unknown>>, request: Request) => Promise<AdapterUser | null>;

export function createAuthFetch(input: {
  store: MemoryStore;
  identities: FixtureIdentity[];
  mode: ProbeMode;
  fault: ProbeFault;
  ldapVerifier: LdapVerifier;
  traces: RequestTrace[];
  trustHost: boolean;
  beforeAuthorize?: () => Promise<void>;
}) {
  return async (request: Request, requestId: string): Promise<Response> => {
    const trace: RequestTrace = { requestId, steps: [], errors: [], stagedCookies: [] };
    input.traces.push(trace);
    const adapter = input.store.forRequest(requestId);
    const cookieOptions = { httpOnly: true, sameSite: "lax", path: "/", secure: true } as const;
    const config: AuthConfig = {
      basePath: fixture.basePath,
      secret: fixture.secret,
      trustHost: input.trustHost,
      useSecureCookies: true,
      adapter,
      session: {
        strategy: input.mode.kind === "database-reader" ? "database" : input.mode.strategy,
        maxAge: fixture.maxAge,
        updateAge: fixture.updateAge,
        generateSessionToken: () => crypto.randomUUID(),
      },
      cookies: {
        sessionToken: { name: fixture.sessionCookie, options: cookieOptions },
        csrfToken: { name: fixture.csrfCookie, options: cookieOptions },
        callbackUrl: { name: fixture.callbackCookie, options: cookieOptions },
      },
      providers:
        input.mode.kind === "database-reader"
          ? []
          : input.mode.providers.map((provider) =>
              Credentials({
                id: provider,
                name: provider,
                credentials: { name: {}, password: {} },
                async authorize(credentials, authorizeRequest) {
                  trace.steps.push(`authorize:${provider}`);
                  await input.beforeAuthorize?.();
                  return provider === "credentials"
                    ? verifyLocal(input.identities, credentials)
                    : input.ldapVerifier(credentials, authorizeRequest);
                },
              }),
            ),
      callbacks: {
        signIn({ user }) {
          trace.steps.push(`signIn:${user.id}`);
          return Boolean(user.id && input.store.users.has(user.id));
        },
        jwt({ token, user }) {
          trace.steps.push(`jwt:${user?.id ?? token.sub}`);
          return token;
        },
        session({ session, user, token }) {
          trace.steps.push("session");
          if (input.fault === "session-callback") throw new Error("Injected session callback failure");
          return {
            user: { id: user?.id ?? token?.sub, name: user?.name ?? token?.name, email: user?.email ?? token?.email },
            expires: session.expires,
          };
        },
      },
      events: {
        signIn({ user }) {
          trace.steps.push(`event:signIn:${user.id}`);
          trace.stagedCookies.push(`${fixture.themeCookie}=${user.id}; Path=/; HttpOnly; Secure; SameSite=Lax`);
          if (input.fault === "sign-in-event") throw new Error("Injected late sign-in event failure");
        },
        session() {
          trace.steps.push("event:session");
          if (input.fault === "session-event") throw new Error("Injected late session event failure");
        },
        signOut() {
          trace.steps.push("event:signOut");
          if (input.fault === "signout-event") throw new Error("Injected late sign-out event failure");
        },
      },
      logger: {
        error(error) {
          trace.errors.push({
            type: error instanceof AuthError ? error.type : error.name,
            message: error.message,
            cause: error instanceof AuthError ? error.cause?.err?.message : undefined,
          });
        },
        warn() {},
        debug() {},
      },
      pages: { signIn: "/auth/login", error: "/auth/login" },
    };
    if (input.fault === "jwt-encode")
      config.jwt = {
        encode() {
          throw new Error("Injected JWT encode failure");
        },
      };
    const response = await Auth(request, config);
    if (trace.errors.length === 0) {
      for (const cookie of trace.stagedCookies) response.headers.append("Set-Cookie", cookie);
    }
    return response;
  };
}

export type AuthFetch = ReturnType<typeof createAuthFetch>;

export function createCookieJar() {
  const values = new Map<string, string>();
  return {
    absorb(response: Response) {
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";", 1)[0];
        if (!pair) throw new Error("Empty Set-Cookie");
        const separator = pair.indexOf("=");
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        if (/Max-Age=0(?:;|$)/i.test(cookie)) values.delete(name);
        else values.set(name, value);
      }
    },
    header() {
      return [...values].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    get(name: string) {
      const value = values.get(name);
      return value === undefined ? undefined : decodeURIComponent(value);
    },
    set(name: string, value: string) {
      values.set(name, encodeURIComponent(value));
    },
  };
}

export type CookieJar = ReturnType<typeof createCookieJar>;

export async function getCsrf(authFetch: AuthFetch, jar: CookieJar, requestId: string) {
  const response = await authFetch(
    new Request(`${fixture.origin}${fixture.basePath}/csrf`, { headers: { cookie: jar.header() } }),
    requestId,
  );
  jar.absorb(response);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("csrfToken" in body) || typeof body.csrfToken !== "string")
    throw new Error("CSRF fixture unavailable");
  return body.csrfToken;
}

export function postRequest(action: string, jar: CookieJar, fields: Record<string, string>) {
  return new Request(`${fixture.origin}${fixture.basePath}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header(), origin: fixture.origin },
    body: new URLSearchParams(fields),
  });
}

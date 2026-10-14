import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { createCookies } from "../session-primitives";
import type { AuthCookieConfiguration } from "../session-primitives";

export interface IssuerOriginConfiguration {
  readonly externalBaseUrl: string;
  readonly cookies: AuthCookieConfiguration;
  readonly csrfSecret: string;
  readonly csrfLifetimeSeconds: number;
  readonly now: () => number;
}

export class IssuerRequestRejectedError extends Error {
  readonly code = "ISSUER_REQUEST_REJECTED";

  constructor() {
    super("Authentication request rejected");
    this.name = "IssuerRequestRejectedError";
  }
}

export function readSingleCookie(request: Request, name: string): string | null {
  const matches = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (matches.length > 1) throw new IssuerRequestRejectedError();
  const cookie = matches.at(0);
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    throw new IssuerRequestRejectedError();
  }
}

function equal(left: string, right: string): boolean {
  const first = Buffer.from(left);
  const second = Buffer.from(right);
  return first.length === second.length && timingSafeEqual(first, second);
}

export function createIssuerOriginGuard(input: IssuerOriginConfiguration) {
  const configuration = Object.freeze({ ...input, cookies: Object.freeze({ ...input.cookies }) });
  const base = new URL(configuration.externalBaseUrl);
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    configuration.cookies.useSecureCookies !== (base.protocol === "https:") ||
    configuration.csrfSecret.length < 32 ||
    !Number.isSafeInteger(configuration.csrfLifetimeSeconds) ||
    configuration.csrfLifetimeSeconds <= 0 ||
    !/^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/.test(configuration.cookies.prefix)
  ) {
    throw new IssuerRequestRejectedError();
  }
  const cookies = createCookies(configuration.cookies);
  const csrfCookieName = cookies.csrfToken.name.replace(/\.csrf-token$/, ".issuer-csrf-token");
  const sign = (value: string) =>
    createHmac("sha256", configuration.csrfSecret).update(`${base.origin}\n${csrfCookieName}\n${value}`).digest("hex");
  const assertCanonicalRequest = (request: Request) => {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    if (url.origin !== base.origin || url.username || url.password || (host !== null && host !== base.host)) {
      throw new IssuerRequestRejectedError();
    }
  };
  const assertSameOrigin = (request: Request) => {
    assertCanonicalRequest(request);
    if (request.headers.get("origin") !== base.origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new IssuerRequestRejectedError();
    }
  };
  return Object.freeze({
    origin: base.origin,
    csrfCookieName,
    assertCanonicalRequest,
    assertSameOrigin,
    assertMutation(request: Request) {
      if (request.method !== "POST") throw new IssuerRequestRejectedError();
      assertSameOrigin(request);
      const token = request.headers.get("x-homarr-csrf-token");
      const cookie = readSingleCookie(request, csrfCookieName);
      if (!token || !cookie || token.length > 160 || cookie.length > 240) throw new IssuerRequestRejectedError();
      const [cookieToken, signature, extra] = cookie.split("|");
      if (
        !cookieToken ||
        !signature ||
        extra !== undefined ||
        !equal(token, cookieToken) ||
        !equal(sign(token), signature)
      ) {
        throw new IssuerRequestRejectedError();
      }
      const [nonce, expires, tail] = token.split(".");
      const expiresAt = Number(expires);
      const now = configuration.now();
      if (
        !nonce ||
        !/^[a-f0-9]{64}$/.test(nonce) ||
        tail !== undefined ||
        !Number.isSafeInteger(expiresAt) ||
        !Number.isFinite(now) ||
        expiresAt <= now ||
        expiresAt > now + configuration.csrfLifetimeSeconds * 1000
      ) {
        throw new IssuerRequestRejectedError();
      }
    },
    prepareCsrfCookie(request: Request) {
      assertCanonicalRequest(request);
      if (request.method !== "GET" || request.headers.get("sec-fetch-site") === "cross-site") {
        throw new IssuerRequestRejectedError();
      }
      const expiresAt = configuration.now() + configuration.csrfLifetimeSeconds * 1000;
      if (!Number.isSafeInteger(expiresAt)) throw new IssuerRequestRejectedError();
      const token = `${randomBytes(32).toString("hex")}.${expiresAt}`;
      const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${configuration.csrfLifetimeSeconds}`];
      if (configuration.cookies.useSecureCookies) attributes.push("Secure");
      return Object.freeze({
        token,
        setCookie: `${csrfCookieName}=${encodeURIComponent(`${token}|${sign(token)}`)}; ${attributes.join("; ")}`,
      });
    },
    redirect(url: string): string {
      try {
        const target = new URL(url, base.origin);
        if (target.origin === base.origin && !target.username && !target.password) return target.href;
      } catch {
        return base.origin;
      }
      return base.origin;
    },
    coreRequest(request: Request): Request {
      assertCanonicalRequest(request);
      const headers = new Headers(request.headers);
      for (const name of ["forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port"])
        headers.delete(name);
      headers.set("host", base.host);
      return new Request(request, { headers });
    },
  });
}

export type IssuerOriginGuard = ReturnType<typeof createIssuerOriginGuard>;

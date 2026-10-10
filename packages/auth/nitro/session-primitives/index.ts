import { randomBytes } from "node:crypto";

export interface AuthCookieConfiguration {
  prefix: string;
  useSecureCookies: boolean;
}

export interface SessionTokenCookieOptions {
  path: "/";
  expires: Date;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
}

export interface SessionCookieEffects {
  set(name: string, value: string, options: SessionTokenCookieOptions): void;
}

export const sessionTokenCookieName = (prefix: string) => `${prefix}.session-token`;

export const expireDateAfter = (seconds: number, now: () => number) => new Date(now() + seconds * 1000);

export const generateSessionToken = () => randomBytes(48).toString("hex");

export const createCookies = ({ prefix, useSecureCookies }: AuthCookieConfiguration) => {
  const securePrefix = useSecureCookies ? "__Secure-" : "";
  const hostPrefix = useSecureCookies ? "__Host-" : "";
  return {
    sessionToken: { name: sessionTokenCookieName(prefix) },
    csrfToken: { name: `${hostPrefix}${prefix}.csrf-token` },
    callbackUrl: { name: `${securePrefix}${prefix}.callback-url` },
    pkceCodeVerifier: { name: `${securePrefix}${prefix}.pkce.cooldown` },
    state: { name: `${securePrefix}${prefix}.state` },
    nonce: { name: `${securePrefix}${prefix}.nonce` },
  };
};

export const writeSessionTokenCookie = (
  effects: SessionCookieEffects,
  configuration: AuthCookieConfiguration,
  session: { sessionToken: string; expires: Date },
) => {
  effects.set(sessionTokenCookieName(configuration.prefix), session.sessionToken, {
    path: "/",
    expires: session.expires,
    httpOnly: true,
    sameSite: "lax",
    secure: configuration.useSecureCookies,
  });
};

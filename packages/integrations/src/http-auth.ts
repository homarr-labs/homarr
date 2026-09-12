import { Buffer } from "node:buffer";

import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationInput } from "./base/integration";

export interface IntegrationHttpAuthentication {
  headers?: Record<string, string>;
  redactValues?: string[];
  query?: Record<string, string>;
  baseUrl?: string;
  transformUrl?(url: URL): void;
  transformBody?(body: string | undefined): string;
  isExpired?(response: { status: number; data: unknown }): boolean;
  refreshAsync?(): Promise<IntegrationHttpAuthentication>;
}

export function secret(input: IntegrationInput, kind: IntegrationSecretKind) {
  const value = input.decryptedSecrets.find((entry) => entry.kind === kind)?.value;
  if (!value) throw new Error(`Integration credential ${kind} is missing`);
  return value;
}

export const headerAuth =
  (name: string, prefix = "", kind: IntegrationSecretKind = "apiKey") =>
  (input: IntegrationInput): IntegrationHttpAuthentication => ({
    headers: { [name]: `${prefix}${secret(input, kind)}` },
  });
export const bearerAuth = headerAuth("Authorization", "Bearer ");
export const apiKeyAuth = headerAuth("X-API-Key");
export const basicAuth =
  (
    username: IntegrationSecretKind = "username",
    password: IntegrationSecretKind = "password",
    headers: Record<string, string> = {},
  ) =>
  (input: IntegrationInput): IntegrationHttpAuthentication => {
    const credentials = Buffer.from(`${secret(input, username)}:${secret(input, password)}`).toString("base64");
    return { headers: { ...headers, Authorization: `Basic ${credentials}` }, redactValues: [credentials] };
  };
export const queryAuth =
  (name: string, kind: IntegrationSecretKind = "apiKey") =>
  (input: IntegrationInput): IntegrationHttpAuthentication => ({ query: { [name]: secret(input, kind) } });
export const noAuth = (): IntegrationHttpAuthentication => ({});
export const optionalAuth =
  (
    resolve: (input: IntegrationInput) => IntegrationHttpAuthentication,
    required: IntegrationSecretKind[] = ["apiKey"],
  ) =>
  (input: IntegrationInput) => {
    if (
      !required.every((requiredKind) =>
        input.decryptedSecrets.some(({ kind, value }) => kind === requiredKind && value),
      )
    )
      return noAuth();
    return resolve(input);
  };
export const alternativeAuth =
  (
    apiKey: (input: IntegrationInput) => IntegrationHttpAuthentication,
    fallback = optionalAuth(basicAuth(), ["username", "password"]),
  ) =>
  (input: IntegrationInput) => {
    if (input.decryptedSecrets.some(({ kind, value }) => kind === "apiKey" && value)) return apiKey(input);
    return fallback(input);
  };
export const rpcAuth = (input: IntegrationInput): IntegrationHttpAuthentication => ({
  transformBody(body) {
    const authenticate = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(authenticate);
      if (!value || typeof value !== "object") throw new Error("Expected a JSON-RPC request body");
      const request = value as { method?: string; methodName?: string; params?: unknown[] };
      const method = request.method ?? request.methodName;
      const params = request.params ?? [];
      if (!Array.isArray(params)) throw new Error("JSON-RPC params must be an array");
      if (method === "system.multicall") return { ...request, params: [authenticate(params[0])] };
      if (method === "system.listMethods" || method === "system.listNotifications") return request;
      if (typeof params[0] === "string" && params[0].startsWith("token:")) params.shift();
      return { ...request, params: [`token:${secret(input, "apiKey")}`, ...params] };
    };
    return JSON.stringify(authenticate(JSON.parse(body ?? "null")));
  },
});

export function withHttpAuthentication<T>(
  create: (input: IntegrationInput) => Promise<T>,
  authenticate: (
    input: IntegrationInput,
    create: () => Promise<T>,
  ) => IntegrationHttpAuthentication | Promise<IntegrationHttpAuthentication>,
) {
  return Object.assign(create, {
    authenticate: (input: IntegrationInput) => withAuthTimeout(() => authenticate(input, () => create(input))),
  });
}
export const clientAuthentication = async <
  T extends { getHttpAuthenticationAsync(refresh?: boolean): Promise<IntegrationHttpAuthentication> },
>(
  _input: IntegrationInput,
  create: () => Promise<T>,
) => {
  const client = await create();
  const resolve = async (refresh = false): Promise<IntegrationHttpAuthentication> => {
    const auth = await client.getHttpAuthenticationAsync(refresh);
    const values = [...Object.values(auth.headers ?? {}), ...Object.values(auth.query ?? {})];
    for (const [name, value] of Object.entries(auth.headers ?? {})) {
      if (name.toLowerCase() === "cookie") {
        for (const cookie of value.split(";")) values.push(cookie.slice(cookie.indexOf("=") + 1).trim());
      }
      if (name.toLowerCase() === "authorization") values.push(value.slice(value.indexOf(" ") + 1));
    }
    return {
      ...auth,
      redactValues: auth.redactValues ?? values,
      refreshAsync: () => withAuthTimeout(() => resolve(true)),
    };
  };
  return resolve();
};

async function withAuthTimeout<T>(resolve: () => T | Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(resolve),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Integration authentication timed out")), 10_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export const feedAuth = (input: IntegrationInput): IntegrationHttpAuthentication => {
  const baseUrl = secret(input, "url");
  const base = new URL(baseUrl);
  return {
    baseUrl,
    redactValues: [...base.searchParams.values()],
    transformUrl(url) {
      // The stored feed URL is a complete endpoint, so the root request uses it exactly.
      if (url.pathname === `${base.pathname}/`) url.pathname = base.pathname;
      for (const [name, value] of base.searchParams) url.searchParams.set(name, value);
    },
  };
};

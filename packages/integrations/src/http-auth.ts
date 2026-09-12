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

function secret(input: IntegrationInput, kind: IntegrationSecretKind) {
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
export const clientAuthentication = async (
  create: () => Promise<{ getHttpAuthenticationAsync(refresh?: boolean): Promise<IntegrationHttpAuthentication> }>,
) =>
  withAuthTimeout(async () => {
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
  });

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

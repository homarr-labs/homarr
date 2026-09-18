import { Buffer } from "node:buffer";

import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationInput } from "./base/integration";

/** Server-only credentials supplied by the integration's native adapter. */
export interface IntegrationHttpAuthentication {
  headers: Record<string, string>;
  redactValues?: string[];
}

function secret(input: IntegrationInput, kind: IntegrationSecretKind) {
  const value = input.decryptedSecrets.find((entry) => entry.kind === kind)?.value;
  if (!value) throw new Error(`Integration credential ${kind} is missing`);
  return value;
}

export function apiKeyAuth(input: IntegrationInput): IntegrationHttpAuthentication {
  return { headers: { "X-API-Key": secret(input, "apiKey") } };
}

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

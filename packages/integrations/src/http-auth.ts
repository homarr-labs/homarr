import { Buffer } from "node:buffer";

import type {
  IntegrationHttpAuthDefinition,
  IntegrationHttpBodyAuth,
  IntegrationSecretKind,
} from "@homarr/definitions";

import type { IntegrationInput } from "./base/integration";

/** Server-only credentials supplied by the integration's native adapter. */
export interface IntegrationHttpAuthentication {
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: IntegrationHttpBodyAuth;
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

export function resolveDeclaredHttpAuthentication(
  input: IntegrationInput,
  definition: IntegrationHttpAuthDefinition,
): IntegrationHttpAuthentication {
  if (definition.type === "modes") {
    const savedKinds = new Set(input.decryptedSecrets.map(({ kind }) => kind));
    const mode = definition.modes.find(
      ({ when }) => when.length === savedKinds.size && when.every((kind) => savedKinds.has(kind)),
    );
    if (!mode) throw new Error("Saved credentials do not support generic HTTP requests");
    return resolveDeclaredHttpAuthentication(input, mode.auth);
  }
  switch (definition.type) {
    case "none":
      return { headers: {} };
    case "bearer":
      return { headers: { Authorization: `Bearer ${secret(input, definition.secretKind ?? "apiKey")}` } };
    case "apiKeyHeader":
      return {
        headers: { [definition.name]: `${definition.prefix ?? ""}${secret(input, definition.secretKind ?? "apiKey")}` },
      };
    case "apiKeyQuery":
      return { headers: {}, query: { [definition.name]: secret(input, definition.secretKind ?? "apiKey") } };
    case "basic":
      if (definition.username !== undefined) {
        const credentials = Buffer.from(
          `${definition.username}:${secret(input, definition.passwordKind ?? "password")}`,
        ).toString("base64");
        return { headers: { Authorization: `Basic ${credentials}` }, redactValues: [credentials] };
      }
      return basicAuth(definition.usernameKind, definition.passwordKind)(input);
    case "adapter":
      throw new Error("This integration requires adapter-owned HTTP authentication");
  }
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

import type { z } from "zod/v4";

type DefinitionPath = Array<string | number>;

const harmlessCredentialSettings = new Set([
  "anonymous",
  "authentication",
  "basic",
  "bearer",
  "configured",
  "default",
  "disabled",
  "enabled",
  "example",
  "false",
  "inherit",
  "missing",
  "none",
  "optional",
  "placeholder",
  "public",
  "redacted",
  "required",
  "separate",
  "separately",
  "source",
  "true",
  "unset",
]);

const commonCredentialLiteralPattern =
  /\b(?:sk|pk|rk)-(?:[A-Za-z0-9][A-Za-z0-9._-]{7,})\b|\b(?:sk_(?:live|test)|github_pat|glpat|gh[pousr]|hf_|xox[baprs])-?[A-Za-z0-9._-]{8,}\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bAIza[0-9A-Za-z_-]{20,}\b|\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/giu;
const authorizationSchemePattern = /\b(bearer|basic)([\s:_-]+)(["']?)([A-Za-z0-9._~+/%=-]{8,})/giu;
const credentialAssignmentPattern =
  /\b(authorization|auth(?:entication)?(?:[ _-]?(?:tokens?|keys?|credentials?))?|credentials?|api[ _-]?keys?|passwords?|passwds?|secrets?|tokens?|access[ _-]?(?:tokens?|keys?)|refresh[ _-]?tokens?|client[ _-]?secrets?|private[ _-]?keys?|signing[ _-]?keys?)((?:["']?\s*[:=]\s*["']?))([^\s,;"'}<>]+)/giu;

export function validateCredentialFreeExport(definition: Record<string, unknown>, ctx: z.RefinementCtx) {
  const { secrets: _secrets, ...exportedDefinition } = definition;
  inspect(exportedDefinition, [], ctx);
  inspectRequestPathQueries(definition.requests, ctx);
  inspectUrlQuery(definition.iconUrl, ["iconUrl"], "Widget icon URLs", ctx);
}

function inspect(value: unknown, path: DefinitionPath, ctx: z.RefinementCtx): void {
  if (Array.isArray(value)) return value.forEach((entry, index) => inspect(entry, [...path, index], ctx));
  if (typeof value === "string") {
    if (containsCustomWidgetCredentialLiteral(value)) {
      ctx.addIssue({ code: "custom", path, message: "Credentials must use source authentication" });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    const keyRisk = getCustomWidgetCredentialKeyRisk(key);
    if (
      keyRisk === "strong" &&
      !isSchemaAuthenticationControl(childPath) &&
      hasCredentialFieldValue(child) &&
      !isHarmlessCustomWidgetCredentialSetting(child)
    ) {
      ctx.addIssue({ code: "custom", path: childPath, message: "Credentials must use source authentication" });
      continue;
    }
    if (keyRisk === "ambiguous" && typeof child === "string" && containsCustomWidgetCredentialLiteral(child)) {
      ctx.addIssue({ code: "custom", path: childPath, message: "Credentials must use source authentication" });
      continue;
    }
    inspect(child, childPath, ctx);
  }
}

function inspectRequestPathQueries(value: unknown, ctx: z.RefinementCtx): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [requestId, candidate] of Object.entries(value)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const path = (candidate as Record<string, unknown>).path;
    if (typeof path !== "string") continue;
    const queryStart = path.indexOf("?");
    if (queryStart < 0) continue;
    const query = path.slice(queryStart + 1);
    for (const [key, queryValue] of parseQueryEntries(query)) {
      const keyRisk = getCustomWidgetCredentialKeyRisk(key);
      if (
        (keyRisk === "strong" && queryValue.length > 0 && !isHarmlessCustomWidgetCredentialSetting(queryValue)) ||
        containsCustomWidgetCredentialLiteral(queryValue)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", requestId, "path"],
          message: "Request query credentials must use source authentication",
        });
        break;
      }
    }
  }
}

function inspectUrlQuery(value: unknown, path: DefinitionPath, label: string, ctx: z.RefinementCtx): void {
  if (typeof value !== "string" || !URL.canParse(value)) return;
  const url = new URL(value);
  if (
    parseQueryEntries(url.search).some(
      ([key, queryValue]) =>
        (getCustomWidgetCredentialKeyRisk(key) === "strong" && queryValue.length > 0) ||
        containsCustomWidgetCredentialLiteral(queryValue),
    )
  ) {
    ctx.addIssue({ code: "custom", path, message: `${label} cannot contain credentials` });
  }
}

function parseQueryEntries(search: string): Array<[string, string]> {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return [];
  return query.split("&").map((entry) => {
    const separatorIndex = entry.indexOf("=");
    const key = separatorIndex < 0 ? entry : entry.slice(0, separatorIndex);
    const value = separatorIndex < 0 ? "" : entry.slice(separatorIndex + 1);
    return [decodeQueryPart(key), decodeQueryPart(value)];
  });
}

function decodeQueryPart(value: string): string {
  try {
    return decodeURIComponent(value.replaceAll("+", " "));
  } catch {
    return value;
  }
}

export function getCustomWidgetCredentialKeyRisk(key: string): "strong" | "ambiguous" | null {
  const normalized = key
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[^A-Za-z0-9]+/gu, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  const phrases = [
    "authorization",
    "authentication",
    "auth",
    "credential",
    "credentials",
    "api key",
    "api keys",
    "password",
    "passwords",
    "passwd",
    "passwds",
    "secret",
    "secrets",
    "token",
    "tokens",
    "access token",
    "access tokens",
    "access key",
    "access keys",
    "refresh token",
    "refresh tokens",
    "client secret",
    "client secrets",
    "private key",
    "private keys",
    "signing key",
    "signing keys",
  ];
  if (phrases.some((phrase) => normalized === phrase || normalized.endsWith(` ${phrase}`))) return "strong";
  return normalized === "key" || normalized.endsWith(" key") || normalized === "keys" || normalized.endsWith(" keys")
    ? "ambiguous"
    : null;
}

export function isHarmlessCustomWidgetCredentialSetting(value: unknown): boolean {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return true;
  return typeof value === "string" && harmlessCredentialSettings.has(value.trim().toLowerCase());
}

export function containsCustomWidgetCredentialLiteral(value: string): boolean {
  return redactCustomWidgetCredentialLiterals(value) !== value;
}

export function redactCustomWidgetCredentialLiterals(value: string): string {
  return value
    .replace(commonCredentialLiteralPattern, "[REDACTED]")
    .replace(authorizationSchemePattern, (match, scheme: string, separator: string, quote: string, candidate: string) =>
      isHarmlessCustomWidgetCredentialSetting(candidate) ? match : `${scheme}${separator}${quote}[REDACTED]`,
    )
    .replace(credentialAssignmentPattern, (match, key: string, separator: string, candidate: string) =>
      isHarmlessCustomWidgetCredentialSetting(candidate) ? match : `${key}${separator}[REDACTED]`,
    );
}

export function redactCustomWidgetAiContext(value: unknown, path: DefinitionPath = []): unknown {
  if (Array.isArray(value)) return value.map((entry, index) => redactCustomWidgetAiContext(entry, [...path, index]));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const entryPath = [...path, key];
        const risk = getCustomWidgetCredentialKeyRisk(key);
        if (risk === "strong" && !isSchemaAuthenticationControl(entryPath)) {
          if (!isHarmlessCustomWidgetCredentialSetting(entry)) return [key, "[REDACTED]"];
        }
        if (risk === "ambiguous" && typeof entry === "string") {
          if (redactCustomWidgetCredentialLiterals(entry) !== entry) return [key, "[REDACTED]"];
        }
        return [key, redactCustomWidgetAiContext(entry, entryPath)];
      }),
    );
  }
  if (typeof value !== "string") return value;

  const lastPathPart = path.at(-1);
  let key = "";
  if (typeof lastPathPart === "string") key = lastPathPart;
  if (["sources", "requests", "options"].includes(key)) {
    try {
      const parsed: unknown = JSON.parse(value);
      return redactCustomWidgetAiContext(parsed, path);
    } catch {
      /* Invalid editor JSON is still useful prompt context. */
    }
  }
  if (key === "baseUrl" || key === "iconUrl") {
    return redactCustomWidgetCredentialLiterals(redactCustomWidgetAiUrl(value));
  }
  return redactCustomWidgetAiText(value);
}

export function redactCustomWidgetAiResponse(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(redactCustomWidgetAiContext(parsed), null, 2);
  } catch {
    return redactCustomWidgetAiText(value);
  }
}

export function redactCustomWidgetAiUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[REDACTED_URL]";
  }
}

export function redactCustomWidgetAiText(value: string): string {
  return redactCustomWidgetCredentialLiterals(
    value.replace(/\bhttps?:\/\/[^\s"'<>]+/giu, (candidate) => redactCustomWidgetAiUrl(candidate)),
  );
}

function isSchemaAuthenticationControl(path: DefinitionPath): boolean {
  return (
    path.length === 3 &&
    path[2] === "auth" &&
    (path[0] === "sources" || path[0] === "requests") &&
    typeof path[1] === "string"
  );
}

function hasCredentialFieldValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  return true;
}

export function validatePrototypeKeys(value: unknown, ctx: z.RefinementCtx) {
  walk(value, [], ctx);
}

function walk(value: unknown, path: Array<string | number>, ctx: z.RefinementCtx): void {
  if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, [...path, index], ctx));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key))
      ctx.addIssue({ code: "custom", path: [...path, key], message: "Unsafe object key" });
    walk(child, [...path, key], ctx);
  }
}

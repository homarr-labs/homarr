import type { RefinementCtx } from "zod/v4";

import type { CustomJsxRequest } from "./request-schema";

const credentialKeyPattern =
  /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu;
const credentialTextPattern =
  /(?:\bauthorization\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._~+/%-]{8,}|\b(?:api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|token|password|passwd|secret)\s*[:=]\s*["'][^"']{4,}["'])/iu;
const bearerHeaderValuePattern = /^\s*bearer\s+\S{8,}\s*$/iu;
const blockedObjectKeys = new Set(["__proto__", "prototype", "constructor"]);

interface SecurityDefinition {
  defaultOptions: Record<string, unknown>;
  defaultState?: Record<string, unknown>;
  requests: CustomJsxRequest[];
  template: string;
  iconUrl?: string;
  optionsSchema: unknown;
}

export function isCredentialKeyName(value: string) {
  return credentialKeyPattern.test(value);
}

export function validateCredentialFreeExport(definition: SecurityDefinition, ctx: RefinementCtx) {
  if (containsCredentialLikeValue(definition.defaultOptions)) {
    ctx.addIssue({ code: "custom", path: ["defaultOptions"], message: "Default options cannot contain credentials" });
  }
  if (containsCredentialLikeValue(definition.defaultState)) {
    ctx.addIssue({ code: "custom", path: ["defaultState"], message: "Default state cannot contain credentials" });
  }
  definition.requests.forEach((request, index) => {
    if (
      containsCredentialLikeValue(request.queryTemplate) ||
      containsCredentialLikeValue(request.bodyTemplate) ||
      Object.entries(request.staticHeaders ?? {}).some(
        ([name, value]) => containsCredentialLikeValue(value, name) || bearerHeaderValuePattern.test(value),
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["requests", index],
        message: "Static request templates cannot contain credentials",
      });
    }
  });
  if (credentialTextPattern.test(definition.template)) {
    ctx.addIssue({ code: "custom", path: ["template"], message: "Templates cannot contain literal credentials" });
  }
  if (definition.iconUrl) {
    const icon = new URL(definition.iconUrl);
    if ([...icon.searchParams].some(([key, value]) => isCredentialKeyName(key) && value.trim().length > 0)) {
      ctx.addIssue({ code: "custom", path: ["iconUrl"], message: "Widget icon URLs cannot contain credentials" });
    }
  }
}

function containsCredentialLikeValue(value: unknown, key = ""): boolean {
  if (isCredentialKeyName(key) && typeof value === "string" && value.trim().length > 0) return true;
  if (Array.isArray(value)) return value.some((entry) => containsCredentialLikeValue(entry));
  if (value === null || typeof value !== "object") return false;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") return false;
  return entries.some(([childKey, child]) => containsCredentialLikeValue(child, childKey));
}

export function validatePrototypeKeys(definition: SecurityDefinition, ctx: RefinementCtx) {
  const values: Array<[Array<string | number>, unknown]> = [
    [["optionsSchema"], definition.optionsSchema],
    [["defaultOptions"], definition.defaultOptions],
    [["defaultState"], definition.defaultState],
  ];
  definition.requests.forEach((request, index) => {
    values.push([["requests", index, "queryTemplate"], request.queryTemplate]);
    values.push([["requests", index, "bodyTemplate"], request.bodyTemplate]);
  });
  for (const [path, value] of values) {
    const blockedPath = findBlockedObjectKey(value);
    if (blockedPath) {
      ctx.addIssue({
        code: "custom",
        path: [...path, ...blockedPath],
        message: "Prototype-pollution keys are not allowed",
      });
    }
  }
}

function findBlockedObjectKey(value: unknown, path: string[] = []): string[] | null {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const found = findBlockedObjectKey(entry, [...path, String(index)]);
      if (found) return found;
    }
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (blockedObjectKeys.has(key.toLowerCase())) return [...path, key];
    const found = findBlockedObjectKey(child, [...path, key]);
    if (found) return found;
  }
  return null;
}

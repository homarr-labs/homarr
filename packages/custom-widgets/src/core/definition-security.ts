import type { z } from "zod/v4";

const credentialKey =
  /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu;

export function validateCredentialFreeExport(definition: Record<string, unknown>, ctx: z.RefinementCtx) {
  inspect(definition.options, ["options"], ctx);
  inspect(definition.requests, ["requests"], ctx);
  if (typeof definition.iconUrl === "string" && URL.canParse(definition.iconUrl)) {
    const url = new URL(definition.iconUrl);
    if ([...url.searchParams.keys()].some((key) => credentialKey.test(key))) {
      ctx.addIssue({ code: "custom", path: ["iconUrl"], message: "Credentials must not be embedded in the icon URL" });
    }
  }
  if (
    typeof definition.template === "string" &&
    /(?:authorization\s*:\s*bearer|api[-_ ]?key\s*[:=]|password\s*[:=]|secret\s*[:=]|token\s*[:=])\s*["']?[A-Za-z0-9._~+/%=-]{8,}/iu.test(
      definition.template,
    )
  ) {
    ctx.addIssue({ code: "custom", path: ["template"], message: "Credentials must not be embedded in JSX" });
  }
}

function inspect(value: unknown, path: Array<string | number>, ctx: z.RefinementCtx): void {
  if (Array.isArray(value)) return value.forEach((entry, index) => inspect(entry, [...path, index], ctx));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (credentialKey.test(key) && typeof child === "string" && child.trim()) {
      ctx.addIssue({ code: "custom", path: [...path, key], message: "Credentials must use source authentication" });
    }
    inspect(child, [...path, key], ctx);
  }
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

import { createHash } from "node:crypto";

import type { CustomJsxRequest } from "../core";
import { collectCustomWidgetRequestReferences } from "../core";
import { CustomWidgetDomainError } from "./errors";
import { resolveSameOriginTarget } from "./request-executor";

export type CustomJsxRuntimeParams = Record<string, string | number | boolean>;
type CustomJsxResolvedValues = Record<string, unknown>;

export function resolveCustomWidgetRequestValues(
  request: CustomJsxRequest,
  options: Record<string, unknown>,
  suppliedParams: CustomJsxRuntimeParams = {},
): CustomJsxResolvedValues {
  const references = collectCustomWidgetRequestReferences(request);
  const suppliedNames = Object.keys(suppliedParams).toSorted();
  const expectedNames = [...references.params].toSorted();
  if (
    suppliedNames.length !== expectedNames.length ||
    suppliedNames.some((name, index) => name !== expectedNames[index])
  ) {
    throw new CustomWidgetDomainError({
      code: "BAD_REQUEST",
      message: "Request parameters do not match the request references",
    });
  }
  const values: CustomJsxResolvedValues = { ...suppliedParams };
  for (const name of references.options) {
    const value = options[name];
    if (value === undefined) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: `Widget option '${name}' is missing`,
      });
    }
    values[`option:${name}`] = value;
  }
  return values;
}

export const renderBoundValue = (template: unknown, values: CustomJsxResolvedValues): unknown => {
  const substitute = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(substitute);
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value);
      if (
        entries.length === 1 &&
        ["$param", "$option"].includes(entries[0]?.[0] ?? "") &&
        typeof entries[0]?.[1] === "string"
      ) {
        const prefix = entries[0][0] === "$option" ? "option:" : "";
        const resolved = values[`${prefix}${entries[0][1]}`];
        if (resolved === undefined)
          throw new CustomWidgetDomainError({
            code: "BAD_REQUEST",
            message: `Unknown request value '${entries[0][1]}'`,
          });
        return resolved;
      }
      return Object.fromEntries(entries.map(([key, child]) => [key, substitute(child)]));
    }
    return value;
  };
  return substitute(template);
};

export const renderRequestBody = (request: CustomJsxRequest, values: CustomJsxResolvedValues): string | undefined =>
  request.body === undefined ? undefined : JSON.stringify(renderBoundValue(request.body, values));

export const renderRequestTarget = (baseUrl: string, request: CustomJsxRequest, values: CustomJsxResolvedValues) => {
  const path = request.path.replaceAll(
    /\{(option|param):([A-Za-z][A-Za-z0-9_-]*)\}/gu,
    (_match, kind: string, name: string) => {
      const value = values[kind === "option" ? `option:${name}` : name];
      if (value === undefined)
        throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: `Unknown path value '${name}'` });
      if (!["string", "number", "boolean"].includes(typeof value))
        throw new CustomWidgetDomainError({
          code: "BAD_REQUEST",
          message: `Path value '${name}' must resolve to text, number, or boolean`,
        });
      return encodeURIComponent(String(value));
    },
  );
  if (/[{}]/u.test(path))
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Request path contains an invalid placeholder" });
  const base = new URL(baseUrl);
  base.pathname = `${base.pathname.replace(/\/$/u, "")}${path}` || "/";
  const target = resolveSameOriginTarget(baseUrl, base);
  for (const [name, template] of Object.entries(request.query ?? {})) {
    const value = renderBoundValue(template, values);
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: `Query value '${name}' must resolve to text, number, or boolean`,
      });
    }
    target.searchParams.set(name, String(value));
  }
  return target;
};

export function hashRuntimeParams(params: CustomJsxResolvedValues) {
  const stable = Object.fromEntries(Object.entries(params).toSorted(([left], [right]) => left.localeCompare(right)));
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

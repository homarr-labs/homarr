import type { AnyProcedure } from "@trpc/server";
import type { OpenApiMeta } from "trpc-to-openapi";
import { z } from "zod/v4";

import { normalizeInputSchema } from "../input-schema";
import type { createTRPCContext } from "../trpc";
import { createTRPCRouter, internalProcedure } from "../trpc";

export interface RestRoute extends Omit<NonNullable<OpenApiMeta["openapi"]>, "path"> {
  path: `/api/${string}`;
  tags: string[];
  summary: string;
  description?: string;
  inputKey?: string;
  public?: boolean;
  operationId?: string;
}

export const restInputDefinitions: Record<string, unknown> = {};
export const restRequestBodies: Record<string, Record<string, unknown>> = {};

function documentInput(schema: Record<string, unknown>, namespace: string): Record<string, unknown> {
  const definitions = (schema.$defs ?? {}) as Record<string, unknown>;
  const names = Object.fromEntries(
    Object.keys(definitions).map((name) => [name, `RestInput_${namespace.replaceAll(".", "_")}_${name}`]),
  );
  function project(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(project);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "$defs" && key !== "$schema")
        .map(([key, entry]) => {
          if (key === "$ref" && typeof entry === "string" && entry.startsWith("#/$defs/")) {
            const [token, ...suffix] = entry.slice("#/$defs/".length).split("/");
            const name = token?.replaceAll("~1", "/").replaceAll("~0", "~");
            const component = name && names[name];
            if (!component) throw new Error(`Missing REST input definition ${entry} for ${namespace}`);
            let pointer = `#/components/schemas/${component}`;
            if (suffix.length > 0) pointer += `/${suffix.join("/")}`;
            return [key, pointer];
          }
          return [key, project(entry)];
        }),
    );
  }
  for (const [name, component] of Object.entries(names)) restInputDefinitions[component] = project(definitions[name]);
  return project(schema) as Record<string, unknown>;
}

// The native caller remains the owner of transformations, business rules, and permissions.
// Only JSON transport normalization belongs here. Cloned schemas also isolate the OpenAPI
// adapter's coercion from validators shared with UI and MCP callers.
function objectShape(schema: z.ZodType): Record<string, z.ZodType> | undefined {
  if (schema instanceof z.ZodObject) return schema.shape as Record<string, z.ZodType>;
  if (schema instanceof z.ZodIntersection) {
    const left = objectShape(schema.def.left as z.ZodType);
    const right = objectShape(schema.def.right as z.ZodType);
    if (left && right) return { ...left, ...right };
  }
  if (schema instanceof z.ZodUnion) {
    const shapes: Record<string, z.ZodType>[] = [];
    for (const option of schema.options) {
      const shape = objectShape(option as z.ZodType);
      if (!shape) return undefined;
      shapes.push(shape);
    }
    const merged: Record<string, z.ZodType> = {};
    for (const key of new Set(shapes.flatMap((shape) => Object.keys(shape)))) {
      const fields = shapes.flatMap((shape) => (shape[key] ? [shape[key]] : []));
      let field = fields[0];
      if (!field) continue;
      if (fields.length > 1) field = z.union(fields);
      if (fields.length < shapes.length) field = field.optional();
      merged[key] = field;
    }
    return merged;
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault || schema instanceof z.ZodPrefault) {
    return objectShape(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodPipe) return objectShape(schema.def.in as z.ZodType);
  return undefined;
}

function jsonInput(schema: z.ZodType): z.ZodType {
  let cloned: z.ZodType = z.fromJSONSchema(
    z.toJSONSchema(schema, {
      io: "input",
      unrepresentable: "any",
      override: normalizeInputSchema,
    }),
  );
  // Undefined is not expressible in a field's JSON Schema. Preserve optional/defaulted
  // fields explicitly; the native procedure remains responsible for their defaults.
  if (schema.safeParse(undefined).success) cloned = cloned.optional();
  return cloned;
}

function queryValue(value: unknown, schema: z.ZodType): unknown {
  if (value === undefined) return value;
  if (schema instanceof z.ZodNullable && value === "null") return null;
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault ||
    schema instanceof z.ZodNullable
  ) {
    return queryValue(value, schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodUnion) {
    if (value === "null" && schema.options.some((option) => option instanceof z.ZodNull)) return null;
    for (const candidate of schema.options) {
      const result = queryValue(value, candidate as z.ZodType);
      if ((candidate as z.ZodType).safeParse(result).success) return result;
    }
    return value;
  }
  if (schema instanceof z.ZodArray) {
    const entries = Array.isArray(value) ? value : [value];
    return entries.map((entry) => queryValue(entry, schema.element as z.ZodType));
  }
  if (typeof value !== "string") return value;
  if (schema instanceof z.ZodBoolean) {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }
  if (schema instanceof z.ZodNumber && value.trim() !== "") return Number(value);
  if (schema instanceof z.ZodNull && value === "null") return null;
  if (schema instanceof z.ZodLiteral) {
    const candidates: unknown[] = [value];
    if (value.trim() !== "") candidates.push(Number(value));
    if (value === "true") candidates.push(true);
    if (value === "false") candidates.push(false);
    for (const candidate of candidates) {
      if (schema.safeParse(candidate).success) return candidate;
    }
  }
  return value;
}

function isQueryValue(schema: z.ZodType): boolean {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault ||
    schema instanceof z.ZodNullable
  ) {
    return isQueryValue(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodArray) return isQueryValue(schema.element as z.ZodType);
  if (schema instanceof z.ZodUnion) return schema.options.every((option) => isQueryValue(option as z.ZodType));
  return (
    schema instanceof z.ZodString ||
    schema instanceof z.ZodNumber ||
    schema instanceof z.ZodBoolean ||
    schema instanceof z.ZodEnum ||
    schema instanceof z.ZodLiteral ||
    schema instanceof z.ZodNull
  );
}

export function jsonResponse(value: unknown): unknown {
  // JSON's own serialization preserves custom toJSON implementations and omitted fields.
  if (value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_key, entry: unknown) => {
      if (typeof entry === "bigint") return entry.toString();
      if (entry instanceof Map) return Object.fromEntries(entry);
      if (entry instanceof Set) return [...entry];
      return entry;
    }),
  ) as unknown;
}

export function createRestProcedure(name: string, source: AnyProcedure, route: RestRoute, output: z.ZodType) {
  const inputs = source["_def"].inputs as z.ZodType[];
  let shape: Record<string, z.ZodType> = {};
  if (route.inputKey) {
    const schema = inputs[0];
    if (!schema || inputs.length !== 1) throw new Error(`Invalid scalar REST input for ${name}`);
    shape = { [route.inputKey]: jsonInput(schema) };
  } else {
    for (const schema of inputs) {
      if (schema instanceof z.ZodVoid || schema instanceof z.ZodUndefined) continue;
      const nativeShape = objectShape(schema);
      if (!nativeShape) throw new Error(`REST input needs an object or named wrapper: ${name}`);
      for (const [key, field] of Object.entries(nativeShape)) shape[key] = jsonInput(field as z.ZodType);
    }
  }
  const hasComplexInput = Object.values(shape).some((field) => !isQueryValue(field as z.ZodType));
  let method = route.method;
  let path = route.path;
  if ((method === "GET" || method === "DELETE") && hasComplexInput) {
    method = "POST";
    if (source["_def"].type === "query") path = `${path}/query`;
    else path = `${path}/remove`;
  }
  const queryKeys = method === "GET" || method === "DELETE";
  const pathKeys = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  for (const [key, field] of Object.entries(shape)) {
    const schema = documentInput(z.toJSONSchema(field, { io: "input", unrepresentable: "any" }), `${name}_${key}`);
    let transport: z.ZodType = z.unknown().meta({ override: ({ jsonSchema }) => Object.assign(jsonSchema, schema) });
    if (field.safeParse(undefined).success) transport = transport.optional();
    if (queryKeys || pathKeys.includes(key))
      transport = z.preprocess((value) => queryValue(value, field as z.ZodType), transport);
    shape[key] = transport;
  }
  // Relay JSON without preempting the native middleware's authorization or transformations.
  // The published schema stays complete, and the native caller performs the full validation.
  const takesNoInput = inputs.every((schema) => schema instanceof z.ZodVoid || schema instanceof z.ZodUndefined);
  const input = takesNoInput ? z.void() : z.object(shape).passthrough();
  // The generator rebuilds body objects and drops root metadata. Retain the native
  // body document separately, including strict keys and cross-field constraints.
  if (
    inputs.length === 1 &&
    (inputs[0] instanceof z.ZodObject || inputs[0] instanceof z.ZodUnion) &&
    pathKeys.length === 0 &&
    !queryKeys
  ) {
    restRequestBodies[route.operationId ?? name.replaceAll(".", "-")] = documentInput(
      z.toJSONSchema(inputs[0], {
        io: "input",
        unrepresentable: "any",
        override: normalizeInputSchema,
      }),
      `${name}_body`,
    );
  }
  const caller = createTRPCRouter({ action: source });
  const execute = async ({
    ctx,
    input: rawValues,
  }: {
    ctx: ReturnType<typeof createTRPCContext>;
    input: Record<string, unknown> | void;
  }) => {
    const values = typeof rawValues === "object" && rawValues !== null ? rawValues : {};
    let nativeInput: unknown = values;
    if (route.inputKey) nativeInput = values[route.inputKey];
    else if (
      inputs.length === 0 ||
      (inputs.every((schema) => schema.safeParse(undefined).success) && Object.keys(values).length === 0)
    )
      nativeInput = undefined;
    return jsonResponse(await caller.createCaller(ctx).action(nativeInput));
  };
  const { inputKey: _inputKey, public: anonymous, ...metadata } = route;
  // Native middleware also owns demo mode exceptions, including writable conversations.
  const procedure = internalProcedure
    .meta({
      openapi: {
        ...metadata,
        method,
        path,
        operationId: route.operationId ?? name.replaceAll(".", "-"),
        protect: !anonymous,
      },
    })
    .input(input)
    .output(output);
  if (source["_def"].type === "query") return procedure.query(execute);
  return procedure.mutation(execute);
}

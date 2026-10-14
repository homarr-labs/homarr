import { Ajv2020 } from "ajv/dist/2020.js";
import { addFormats } from "@modelcontextprotocol/server/validators/ajv";
import type { AnySchema, Context, ErrorMap, InferSchemaInput, InferSchemaOutput, Procedure } from "@orpc/server";
import { z } from "zod/v4";

import type { BackendContext, BackendRequestResources } from "../context";
import type { ProtocolAdmissionRequirements, ProtocolResourceBindings } from "./admission";
import { unavailableProjection } from "./selection";
import type { NativeProtocolSelection } from "./selection";
import type { SelectedMcpAlias } from "./source-selection";

export interface SelectedMcpToolDescriptor {
  readonly name: SelectedMcpAlias;
  readonly description: string;
  readonly type: "query" | "mutation";
  readonly inputMode: "none" | "object";
  readonly inputSchema: z.core.JSONSchema.JSONSchema;
}

export interface SelectedMcpListing {
  readonly descriptor: SelectedMcpToolDescriptor;
  listFor(resources: BackendRequestResources): Promise<SelectedMcpToolDescriptor | undefined>;
}

export interface SelectedMcpBindings<
  TContext extends BackendContext,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
> extends ProtocolResourceBindings<TContext> {
  decodeArguments(input: unknown, schema: TInputSchema | undefined): Promise<InferSchemaInput<TInputSchema>>;
  serializeOutput(output: InferSchemaOutput<TOutputSchema>): string;
  formatError(error: unknown, toolName: SelectedMcpAlias): string;
}

const emptyArguments = z.strictObject({});
const schemaEngine = new Ajv2020({
  strict: false,
  validateSchema: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
addFormats(schemaEngine);

function getMcpObjectInput(input: unknown): z.ZodObject | undefined {
  if (input instanceof z.ZodObject) return input;
  if (input instanceof z.ZodOptional) return getMcpObjectInput(input.unwrap());
  return undefined;
}

function freezeGeneratedSchema(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  for (const nested of Object.values(value)) freezeGeneratedSchema(nested, seen);
  Object.freeze(value);
}

export function describeSelectedMcpInput(input: unknown) {
  const noInput = input === undefined || input instanceof z.ZodVoid || input instanceof z.ZodUndefined;
  const object = noInput ? emptyArguments : getMcpObjectInput(input);
  if (!object) return unavailableProjection("unsupported_input");
  try {
    const inputSchema = z.toJSONSchema(object, {
      io: "input",
      override: ({ zodSchema, jsonSchema }) => {
        if (zodSchema["_zod"].def.type !== "string") return;
        if (zodSchema["_zod"].def.checks?.some((check) => check["_zod"].def.check === "overwrite")) {
          delete jsonSchema.minLength;
          delete jsonSchema.maxLength;
          delete jsonSchema.pattern;
          delete jsonSchema.allOf;
          delete jsonSchema.format;
        }
        if (jsonSchema.format === "date-time" && typeof jsonSchema.pattern === "string") delete jsonSchema.format;
      },
    });
    if (inputSchema.type !== undefined && inputSchema.type !== "object") return unavailableProjection("invalid_schema");
    inputSchema.type = "object";
    if (!schemaEngine.validateSchema(inputSchema)) return unavailableProjection("invalid_schema");
    schemaEngine.compile(inputSchema);
    freezeGeneratedSchema(inputSchema);
    return Object.freeze({
      kind: "available",
      projection: Object.freeze({ inputMode: noInput ? "none" : "object", inputSchema }),
    } as const);
  } catch {
    return unavailableProjection("invalid_schema");
  }
}

export async function listSelectedMcpTools(
  _projections: readonly SelectedMcpListing[],
  _resources: BackendRequestResources,
) {
  return unavailableProjection("security_unverified");
}

export function projectSelectedMcp<
  TContext extends BackendContext,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
>(_options: {
  readonly selection: NativeProtocolSelection<
    Procedure<TContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap>
  >;
  readonly requirements: ProtocolAdmissionRequirements;
  readonly bindings: SelectedMcpBindings<TContext, TInputSchema, TOutputSchema> | undefined;
}) {
  return unavailableProjection("security_unverified");
}

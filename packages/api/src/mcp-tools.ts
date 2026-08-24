import type { AnyProcedure, AnyRootTypes, Router, RouterRecord } from "@trpc/server/unstable-core-do-not-import";
import { z } from "zod/v4";

export interface McpMeta {
  mcp?: {
    enabled: boolean;
    name?: string;
    description?: string;
  };
}

export interface McpTool {
  name: string;
  description: string;
  type: "query" | "mutation";
  pathInRouter: string[];
  inputSchema: z.core.JSONSchema.JSONSchema;
  inputValidator: z.ZodObject;
}

const emptyInput = z.object({});

const isProcedure = (value: AnyProcedure | RouterRecord): value is AnyProcedure => typeof value === "function";

const mergeInputs = (inputs: z.ZodObject[]) => inputs.reduce((merged, input) => merged.extend(input.shape), emptyInput);

const getMcpMetadata = (meta: unknown): McpMeta["mcp"] => {
  if (!meta || typeof meta !== "object" || !("mcp" in meta)) return undefined;

  const metadata = meta.mcp;
  if (!metadata || typeof metadata !== "object" || !("enabled" in metadata)) return undefined;
  if (typeof metadata.enabled !== "boolean") return undefined;

  const result: NonNullable<McpMeta["mcp"]> = { enabled: metadata.enabled };
  if ("name" in metadata && typeof metadata.name === "string") result.name = metadata.name;
  if ("description" in metadata && typeof metadata.description === "string") {
    result.description = metadata.description;
  }
  return result;
};

const getProcedureInput = (inputs: z.ZodType[]) => {
  if (inputs.length === 0) return emptyInput;
  if (inputs.length === 1) return inputs[0] ?? emptyInput;
  if (inputs.every((input): input is z.ZodObject => input instanceof z.ZodObject)) return mergeInputs(inputs);
  return null;
};

const normalizeJsonSchema = (schema: z.core.JSONSchema.JSONSchema): z.core.JSONSchema.JSONSchema => {
  const properties = schema.properties ?? {};
  const required = (schema.required ?? []).filter((key) => {
    const property = properties[key];
    return !property || typeof property !== "object" || !("default" in property);
  });

  return {
    ...schema,
    type: "object",
    properties,
    required,
  };
};

export function extractMcpToolsFromProcedures<TRoot extends AnyRootTypes, TRecord extends RouterRecord>(
  router: Router<TRoot, TRecord>,
): McpTool[] {
  const tools: McpTool[] = [];

  for (const [path, procedure] of Object.entries(router["_def"].procedures)) {
    if (!isProcedure(procedure)) continue;
    const definition = procedure["_def"];
    if (definition.type === "subscription") continue;

    const metadata = getMcpMetadata(definition.meta);
    if (!metadata?.enabled) continue;

    const inputs = definition.inputs.filter((input): input is z.ZodType => input instanceof z.ZodType);
    const procedureInput = getProcedureInput(inputs);

    if (
      procedureInput === null ||
      (!(procedureInput instanceof z.ZodObject) && !procedureInput.safeParse(undefined).success)
    ) {
      console.warn(`[MCP] Procedure ${path} does not use an object input schema; using an empty schema`);
    }
    const inputValidator = procedureInput instanceof z.ZodObject ? procedureInput : emptyInput;

    tools.push({
      name: metadata.name ?? path.replaceAll(".", "_"),
      description: metadata.description ?? "",
      type: definition.type,
      pathInRouter: path.split("."),
      inputValidator,
      inputSchema: normalizeJsonSchema(
        z.toJSONSchema(inputValidator, {
          unrepresentable: "any",
        }),
      ),
    });
  }

  return tools.toSorted((left, right) => left.name.localeCompare(right.name));
}

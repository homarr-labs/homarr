import type { AnyRootTypes, Router, RouterRecord } from "@trpc/server/unstable-core-do-not-import";
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
  pathInRouter: string[];
  inputSchema: z.core.JSONSchema.JSONSchema;
  inputValidator: z.ZodObject;
}

const emptyInput = z.object({});

const mergeInputs = (inputs: z.ZodObject[]) => inputs.reduce((merged, input) => merged.extend(input.shape), emptyInput);

const normalizeJsonSchema = (schema: z.core.JSONSchema.JSONSchema): z.core.JSONSchema.JSONSchema => {
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = ((schema.required as string[] | undefined) ?? []).filter(
    (key) => !("default" in (properties[key] ?? {})),
  );

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
    const definition = procedure["_def"] as unknown as {
      inputs?: z.ZodType[];
      meta?: McpMeta;
    };
    const metadata = definition.meta?.mcp;
    if (!metadata?.enabled) continue;

    const inputs = (definition.inputs ?? []).filter((input): input is z.ZodType => input !== undefined);
    const procedureInput =
      inputs.length === 0
        ? emptyInput
        : inputs.length === 1
          ? (inputs[0] ?? emptyInput)
          : inputs.every((input): input is z.ZodObject => input instanceof z.ZodObject)
            ? mergeInputs(inputs)
            : null;

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

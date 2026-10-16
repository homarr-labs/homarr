import { Ajv2020 } from "ajv/dist/2020.js";
import type { ToolAnnotations } from "@modelcontextprotocol/server";
import { addFormats, AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import { Procedure, walkProcedureContractsSync } from "@orpc/server";
import type { AnyRouter, AnyProcedure } from "@orpc/server";
import { z } from "zod/v4";

export interface McpMeta {
  mcp?: {
    enabled: boolean;
    name?: string;
    description?: string;
    effect?: "additive" | "destructive";
  };
}

export interface McpTool {
  name: string;
  description: string;
  type: "query" | "mutation";
  pathInRouter: string[];
  inputSchema: z.core.JSONSchema.JSONSchema;
  inputMode: "none" | "object";
  annotations?: Pick<ToolAnnotations, "readOnlyHint" | "destructiveHint">;
}

export interface McpToolDiagnostic {
  name: string;
  path: string;
  reason: "unsupported_input" | "invalid_schema" | "duplicate_name" | "invalid_name";
}

export interface McpToolCatalog {
  tools: McpTool[];
  diagnostics: McpToolDiagnostic[];
}

const emptyInput = z.strictObject({});
const schemaEngine = new Ajv2020({
  strict: false,
  validateSchema: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
addFormats(schemaEngine);
const schemaValidator = new AjvJsonSchemaValidator(schemaEngine);

const getObjectInput = (input: unknown): z.ZodObject | null => {
  if (input instanceof z.ZodObject) return input;
  if (input instanceof z.ZodOptional) return getObjectInput(input.unwrap());
  return null;
};

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
  if ("effect" in metadata && (metadata.effect === "additive" || metadata.effect === "destructive")) {
    result.effect = metadata.effect;
  }
  return result;
};

export function extractMcpToolsFromProcedures(router: AnyRouter): McpToolCatalog {
  const tools: McpTool[] = [];
  const diagnostics: McpToolDiagnostic[] = [];
  const names = new Map<string, string[]>();

  const procedures: [string, AnyProcedure][] = [];
  const lazyRouters = walkProcedureContractsSync(router, (procedure, path) => {
    if (procedure instanceof Procedure) procedures.push([path.join("."), procedure]);
  });
  if (lazyRouters.length) throw new Error("MCP catalogs require an explicitly eager router");
  for (const [path, procedure] of procedures) {
    const definition = procedure["~orpc"];
    const operationType = definition.meta.operationType;
    if (operationType !== "query" && operationType !== "mutation") continue;
    const metadata = getMcpMetadata(definition.meta);
    if (!metadata?.enabled) continue;

    const name = metadata.name ?? path.replaceAll(".", "_");
    const paths = names.get(name) ?? [];
    paths.push(path);
    names.set(name, paths);
    if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(name)) {
      diagnostics.push({ name, path, reason: "invalid_name" });
      continue;
    }

    const inputs = definition.inputSchemas ?? [];
    let inputMode: McpTool["inputMode"] = "object";
    if (inputs.every((input) => input instanceof z.ZodUndefined || input instanceof z.ZodVoid)) inputMode = "none";
    const objectInputs = inputs.map(getObjectInput);
    if (inputMode === "object" && !objectInputs.every((input) => input !== null)) {
      diagnostics.push({ name, path, reason: "unsupported_input" });
      continue;
    }

    try {
      let input: z.ZodType = emptyInput;
      if (inputMode === "object") {
        const objects = objectInputs.filter((schema): schema is z.ZodObject => schema !== null);
        input = objects[0] ?? emptyInput;
        for (const object of objects.slice(1)) input = z.intersection(input, object);
      }
      const inputSchema = z.toJSONSchema(input, {
        io: "input",
        override: ({ zodSchema, jsonSchema }) => {
          if (zodSchema["_zod"].def.type !== "string") return;
          if (zodSchema["_zod"].def.checks?.some((check) => check["_zod"].def.check === "overwrite")) {
            // trim/case normalization runs before these checks in oRPC. They cannot constrain raw JSON.
            delete jsonSchema.minLength;
            delete jsonSchema.maxLength;
            delete jsonSchema.pattern;
            delete jsonSchema.allOf;
            delete jsonSchema.format;
          }
          // Zod's ISO regex permits minute precision; JSON Schema date-time requires seconds.
          if (jsonSchema.format === "date-time" && typeof jsonSchema.pattern === "string") {
            delete jsonSchema.format;
          }
        },
      });
      // Chained object inputs produce allOf; MCP requires an explicit object root.
      if (inputSchema.type !== undefined && inputSchema.type !== "object") throw new Error("Invalid root");
      inputSchema.type = "object";
      // Zod and the SDK disagree on JSON Schema vocabulary types; compilation checks the actual schema.
      schemaValidator.getValidator(inputSchema as Parameters<typeof schemaValidator.getValidator>[0]);
      tools.push({
        name,
        description: metadata.description ?? "",
        type: operationType,
        annotations: {
          readOnlyHint: operationType === "query",
          destructiveHint: operationType === "mutation" && metadata.effect !== "additive",
        },
        pathInRouter: path.split("."),
        inputMode,
        inputSchema,
      });
    } catch {
      // Conversion errors can contain schema metadata. Only expose a stable, safe reason.
      diagnostics.push({ name, path, reason: "invalid_schema" });
    }
  }

  const duplicates = new Set<string>();
  for (const [name, paths] of names) {
    if (paths.length < 2) continue;
    duplicates.add(name);
    for (const path of paths) diagnostics.push({ name, path, reason: "duplicate_name" });
  }
  return {
    tools: tools
      .filter((tool) => !duplicates.has(tool.name))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
    diagnostics: diagnostics.toSorted(
      (left, right) => left.path.localeCompare(right.path) || left.reason.localeCompare(right.reason),
    ),
  };
}

/** Dispatch raw JSON through the caller so oRPC owns parsing, transforms, and authorization. */
export async function callMcpTool(caller: unknown, tool: McpTool, input: unknown) {
  let procedure = caller;
  for (const segment of tool.pathInRouter) {
    if ((typeof procedure !== "object" && typeof procedure !== "function") || procedure === null) {
      throw new Error("Tool is not callable");
    }
    procedure = (procedure as Record<string, unknown>)[segment];
  }
  if (typeof procedure !== "function") throw new Error("Tool is not callable");
  let procedureInput = input;
  if (tool.inputMode === "none") procedureInput = undefined;
  else if (input === undefined) procedureInput = {};
  return await (procedure as (value: unknown) => Promise<unknown>)(procedureInput);
}

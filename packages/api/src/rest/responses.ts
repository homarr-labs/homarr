import { Ajv2020 } from "ajv/dist/2020.js";
import { addFormats } from "@modelcontextprotocol/server/validators/ajv";
import { z } from "zod/v4";

import contracts from "./response-contracts.json";

const responses = Object.fromEntries(Object.entries(contracts.responses).filter(([, schema]) => schema !== null));
const engine = new Ajv2020({ strict: false, coerceTypes: false, removeAdditional: false, useDefaults: false });
addFormats(engine);
const schemaId = "urn:homarr:rest-responses";
engine.addSchema({ $id: schemaId, type: "object", properties: responses, $defs: contracts.$defs });

function documentReferences(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(documentReferences);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (key === "$ref" && typeof entry === "string")
        return [key, entry.replace("#/$defs/", "#/components/schemas/Rest_")];
      return [key, documentReferences(entry)];
    }),
  );
}

export const restResponseDefinitions = Object.fromEntries(
  Object.entries(contracts.$defs).map(([name, schema]) => [`Rest_${name}`, documentReferences(schema)]),
);

export function restResponseSchema(name: string): z.ZodType {
  if (!(name in contracts.responses))
    throw new Error(`Missing response contract for ${name}; regenerate the OpenAPI specification`);
  const schema = responses[name];
  if (!schema) return z.void();
  const pointer = `${schemaId}#/properties/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`;
  return z
    .custom((value) => {
      const validate = engine.getSchema(pointer);
      if (!validate) throw new Error(`Missing response validator for ${name}`);
      return validate(value);
    })
    .meta({
      id: `Rest_${name.replaceAll(".", "_")}`,
      override: ({ jsonSchema }) => {
        Object.assign(jsonSchema, documentReferences(schema));
      },
    });
}

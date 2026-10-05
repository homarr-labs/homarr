import { loader } from "fumadocs-core/source";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { Document } from "fumadocs-openapi";

import schema from "../../public/api/open-api-schema.json";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as RecordValue;
}

function hasExactKeys(value: RecordValue, keys: string[]) {
  const actual = Object.keys(value).toSorted();
  const expected = keys.toSorted();
  if (actual.length !== expected.length) return false;
  return actual.every((key, index) => key === expected[index]);
}

function isUnconstrainedRecursiveJsonSchema(name: string, value: unknown) {
  const root = asRecord(value);
  if (!root || !hasExactKeys(root, ["anyOf"]) || !Array.isArray(root.anyOf)) return false;
  if (root.anyOf.length !== 6) return false;

  const simpleTypes = new Set<string>();
  let hasArray = false;
  let hasObject = false;
  const self = `#/components/schemas/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`;

  for (const member of root.anyOf) {
    const variant = asRecord(member);
    if (!variant) return false;
    if (typeof variant.type === "string" && hasExactKeys(variant, ["type"])) {
      simpleTypes.add(variant.type);
      continue;
    }
    if (variant.type === "array" && hasExactKeys(variant, ["type", "items"])) {
      const items = asRecord(variant.items);
      if (!items || !hasExactKeys(items, ["$ref"]) || items.$ref !== self) return false;
      hasArray = true;
      continue;
    }
    if (variant.type === "object" && hasExactKeys(variant, ["type", "propertyNames", "additionalProperties"])) {
      const propertyNames = asRecord(variant.propertyNames);
      const additionalProperties = asRecord(variant.additionalProperties);
      if (!propertyNames || !hasExactKeys(propertyNames, ["type"]) || propertyNames.type !== "string") return false;
      if (!additionalProperties || !hasExactKeys(additionalProperties, ["$ref"]) || additionalProperties.$ref !== self)
        return false;
      hasObject = true;
      continue;
    }
    return false;
  }

  return (
    simpleTypes.size === 4 &&
    simpleTypes.has("string") &&
    simpleTypes.has("number") &&
    simpleTypes.has("boolean") &&
    simpleTypes.has("null") &&
    hasArray &&
    hasObject
  );
}

/** Replace only the generator's exact unconstrained recursive JSON schema with its equivalent finite union for Scalar. */
export function normalizeRecursiveJsonSchemas(document: Document): Document {
  const components = asRecord(document.components);
  const schemas = asRecord(components?.schemas);
  if (!components || !schemas) return document;

  const normalizedSchemas = { ...schemas };
  let changed = false;
  for (const [name, value] of Object.entries(schemas)) {
    if (!isUnconstrainedRecursiveJsonSchema(name, value)) continue;
    normalizedSchemas[name] = {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array" },
        { type: "object" },
      ],
    };
    changed = true;
  }
  if (!changed) return document;
  return {
    ...document,
    components: {
      ...components,
      schemas: normalizedSchemas,
    },
  } as unknown as Document;
}

export const openapi = createOpenAPI({
  input: {
    homarr: () => ({
      ...normalizeRecursiveJsonSchemas(schema as unknown as Document),
      servers: [
        {
          url: "{instanceUrl}",
          description: "Enter the full URL of your Homarr instance, including its scheme and reverse-proxy path.",
          variables: {
            instanceUrl: {
              default: "https://homarr.example.com",
              description: "The full URL where your Homarr instance is reachable, including any reverse-proxy path.",
            },
          },
        },
      ],
    }),
  },
});

export const apiSource = loader({
  baseUrl: "/api-reference",
  source: await openapi.staticSource({
    per: "operation",
    groupBy: "tag",
    meta: true,
  }),
});

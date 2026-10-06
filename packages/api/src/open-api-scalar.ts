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

/** Scalar cannot render the generator's unconstrained, self-recursive JSON union. */
export function normalizeRecursiveJsonSchemasForScalar<T extends object>(document: T): T {
  const root = asRecord(document);
  const components = asRecord(root?.components);
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
  } as T;
}

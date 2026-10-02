import { describe, expect, it } from "vitest";

import { normalizeRecursiveJsonSchemas } from "./openapi";

function recursiveJsonSchema(name: string): { anyOf: Record<string, unknown>[] } {
  const self = `#/components/schemas/${name}`;
  return {
    anyOf: [
      { type: "string" },
      { type: "number" },
      { type: "boolean" },
      { type: "null" },
      { type: "array", items: { $ref: self } },
      { type: "object", propertyNames: { type: "string" }, additionalProperties: { $ref: self } },
    ],
  };
}

describe("normalizeRecursiveJsonSchemas", () => {
  it("replaces only the unconstrained recursive JSON shape without mutating the generated document", () => {
    const recursive = recursiveJsonSchema("JsonValue");
    const constrained = recursiveJsonSchema("ConstrainedJsonValue");
    constrained.anyOf[4].maxItems = 4;
    const document = {
      openapi: "3.1.0",
      components: { schemas: { JsonValue: recursive, ConstrainedJsonValue: constrained } },
    };

    const normalized = normalizeRecursiveJsonSchemas(document as never);

    expect(normalized).not.toBe(document);
    expect(normalized.components?.schemas?.JsonValue).toEqual({
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array" },
        { type: "object" },
      ],
    });
    expect(normalized.components?.schemas?.ConstrainedJsonValue).toBe(constrained);
    expect(document.components.schemas.JsonValue).toBe(recursive);
    expect(recursive).toEqual(recursiveJsonSchema("JsonValue"));
  });

  it("leaves documents without the exact recursive shape unchanged", () => {
    const document = { openapi: "3.1.0", components: { schemas: { JsonValue: { type: "object" } } } };

    expect(normalizeRecursiveJsonSchemas(document as never)).toBe(document);
  });
});

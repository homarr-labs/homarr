import { describe, expect, test } from "vitest";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { renderSafeJsx, sanitizeCustomJsxProps } from "../jsx/interpreter";
import { CUSTOM_JSX_BLOCKED_PROPERTIES, CUSTOM_JSX_BLOCKED_PROPS, CUSTOM_JSX_LIMITS } from "../jsx/policy";

const components = { Text: () => null };
const bindings = { data: Object.create(null) as Record<string, unknown> };

describe("shared Custom JSX policy", () => {
  test.each([...CUSTOM_JSX_BLOCKED_PROPERTIES])(
    "blocks reflective property %s in diagnostics and runtime",
    (property) => {
      const template = `<Text>{data[${JSON.stringify(property)}]}</Text>`;

      expect(validateCustomJsxTemplate(template).some(({ severity }) => severity === "error")).toBe(true);
      expect(() => renderSafeJsx({ template, components, bindings })).toThrow(/reflective property/u);
    },
  );

  test.each([...CUSTOM_JSX_BLOCKED_PROPS])("removes blocked prop %s at the renderer boundary", (property) => {
    const safe = sanitizeCustomJsxProps({ [property]: "unsafe", title: "safe" }, "Text");
    expect(safe).not.toHaveProperty(property);
    expect(safe).toHaveProperty("title", "safe");
  });

  test("uses the same depth and operation budgets for analysis and runtime", () => {
    const template = `<Text>{${"!".repeat(CUSTOM_JSX_LIMITS.astDepth + 1)}data}</Text>`;
    expect(validateCustomJsxTemplate(template).some(({ message }) => message.includes("depth limit"))).toBe(true);
  });
});

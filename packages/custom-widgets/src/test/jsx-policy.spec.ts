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

  test("passes unknown ordinary props through as advisories and blocks capabilities explicitly", () => {
    const diagnostics = validateCustomJsxTemplate('<Text futureMantineProp="yes">Safe</Text>');
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warning", message: expect.stringContaining("UNKNOWN_MANTINE_PROP") }),
      ]),
    );
    expect(sanitizeCustomJsxProps({ futureMantineProp: "yes" }, "Text")).toHaveProperty("futureMantineProp", "yes");
    expect(validateCustomJsxTemplate("<Text onClick={() => null}>Unsafe</Text>")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("BLOCKED_CAPABILITY") }),
      ]),
    );
    expect(validateCustomJsxTemplate("<Text valueFormatter={(value) => value}>Unsafe</Text>")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("Callback prop") }),
      ]),
    );
    expect(validateCustomJsxTemplate('<Anchor href="javascript:alert(1)">Unsafe</Anchor>')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("INVALID_PROP_VALUE") }),
      ]),
    );
    expect(validateCustomJsxTemplate('<Box pos="fixed" top={0}>Unsafe</Box>')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("BLOCKED_CAPABILITY") }),
      ]),
    );
    expect(sanitizeCustomJsxProps({ pos: "fixed", top: 0, unstyled: true })).toEqual({ unstyled: true });
  });

  test("blocks refs, native popovers, and editable DOM capabilities without blocking declarative bind", () => {
    const diagnostics = validateCustomJsxTemplate(
      '<TextInput bind="search" rootRef={data.ref} popoverTarget="outside" contentEditable />',
    );
    expect(diagnostics.filter(({ severity }) => severity === "error")).toHaveLength(3);
    expect(diagnostics.some(({ message }) => message.includes("Prop 'bind'"))).toBe(false);
  });

  test("provides closest component and binding diagnostics", () => {
    expect(validateCustomJsxTemplate("<Stak />")[0]?.message).toMatch(/UNKNOWN_COMPONENT.*Stack/u);
    expect(validateCustomJsxTemplate('<Text bind="search" />')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warning", message: expect.stringContaining("BINDING_UNAVAILABLE") }),
      ]),
    );
    expect(() => renderSafeJsx({ template: '<Text bind="search" />', components, bindings })).not.toThrow();
  });

  test("reports denied component families as blocked capabilities", () => {
    expect(validateCustomJsxTemplate("<ModalRoot opened />")[0]?.message).toMatch(/BLOCKED_CAPABILITY/u);
  });

  test("reports blocked capabilities introduced through spreads at runtime", () => {
    const rendered = renderSafeJsx({
      template: "<Text {...data.props}>Safe</Text>",
      components,
      bindings: { data: { props: { onClick: "unsafe", href: "javascript:alert(1)" } } },
    });
    expect(rendered.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("BLOCKED_CAPABILITY"),
        expect.stringContaining("INVALID_PROP_VALUE"),
      ]),
    );
  });

  test("sanitizes and diagnoses blocked capabilities inside nested Mantine props", () => {
    const props = sanitizeCustomJsxProps({
      tooltipProps: { label: "Safe", onClick: "unsafe", href: "javascript:alert(1)" },
      data: [{ image: "metric-name", onClick: "api-field" }],
    });
    expect(props).toEqual({
      tooltipProps: { label: "Safe" },
      data: [{ image: "metric-name", onClick: "api-field" }],
    });
    expect(validateCustomJsxTemplate("<Text tooltipProps={{ onClick: () => null }}>Unsafe</Text>")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("Callback prop") }),
      ]),
    );
    expect(
      validateCustomJsxTemplate("<BarChart data={data.items.map((item) => item)} />").some(({ message }) =>
        message.includes("Callback prop"),
      ),
    ).toBe(false);
    expect(validateCustomJsxTemplate("<Select data={data.items.map((item) => () => item.label)} />")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("BLOCKED_CAPABILITY") }),
      ]),
    );
  });
});

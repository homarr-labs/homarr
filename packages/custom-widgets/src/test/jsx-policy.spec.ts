import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { createCustomJsxBindings } from "../jsx/bindings";
import { renderSafeJsx, sanitizeCustomJsxProps } from "../jsx/interpreter";
import { CUSTOM_JSX_BLOCKED_PROPERTIES, CUSTOM_JSX_BLOCKED_PROPS, CUSTOM_JSX_LIMITS } from "../jsx/policy";

const components = { Text: () => null };
const bindings = { data: Object.create(null) as Record<string, unknown> };

describe("shared Custom JSX policy", () => {
  test("accepts canonical Mantine compound component names", () => {
    const diagnostics = validateCustomJsxTemplate(
      '<Radio.Group value="one"><Radio.Card value="one"><Radio.Indicator /></Radio.Card></Radio.Group>',
    );
    expect(diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
  });

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
    expect(sanitizeCustomJsxProps({ position: "top", unstyled: true }, "Tooltip")).toEqual({
      position: "top",
      unstyled: true,
    });
  });

  test("rejects unsupported date-time multiple mode in analysis and at the renderer boundary", () => {
    expect(validateCustomJsxTemplate('<DateTimePicker type="multiple" />')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("INVALID_PROP_VALUE") }),
      ]),
    );
    expect(sanitizeCustomJsxProps({ type: "multiple", label: "Date" }, "DateTimePicker")).toEqual({
      label: "Date",
    });
    const rendered = renderSafeJsx({
      template: "<DateTimePicker {...data.props} />",
      components: { ...components, DateTimePicker: (() => null) as never },
      bindings: { data: { props: { type: "multiple", label: "Date" } } },
    });
    expect(rendered.warnings).toEqual([expect.stringContaining("INVALID_PROP_VALUE")]);
  });

  test("reports and removes component-specific blocked props from explicit and spread JSX", () => {
    expect(validateCustomJsxTemplate('<Tooltip target="#outside">Unsafe</Tooltip>')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("BLOCKED_CAPABILITY") }),
      ]),
    );
    expect(sanitizeCustomJsxProps({ target: "#outside", label: "Safe" }, "Tooltip")).toEqual({ label: "Safe" });

    const rendered = renderSafeJsx({
      template: "<Tooltip {...data.props}>Safe</Tooltip>",
      components: { ...components, Tooltip: (() => null) as never },
      bindings: { data: { props: { target: "#outside", label: "Safe" } } },
    });
    expect(rendered.warnings).toEqual([
      expect.stringContaining("BLOCKED_CAPABILITY: Prop 'Tooltip.target' is not allowed"),
    ]);
  });

  test("preserves interpreted React elements in safe ReactNode props", () => {
    const rendered = renderSafeJsx({
      template: '<Button leftSection={<TablerIcon name="plus" />}>Add</Button>',
      components: {
        Button: ((props: { children?: unknown; leftSection?: unknown }) =>
          createElement("button", null, props.leftSection as never, props.children as never)) as never,
        TablerIcon: ((props: { name?: string }) => createElement("span", null, props.name)) as never,
      },
      bindings,
    });
    expect(rendered.warnings).toEqual([]);
    expect(renderToStaticMarkup(rendered.node)).toContain("<span>plus</span>Add");
  });

  test.each(["|", "&", "^", "in", "instanceof"])(
    "rejects unsupported binary operator %s in analysis and runtime",
    (operator) => {
      const right = operator === "in" ? "data" : operator === "instanceof" ? "data.Type" : "1";
      const template = `<Text>{1 ${operator} ${right}}</Text>`;
      expect(validateCustomJsxTemplate(template)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ severity: "error", message: expect.stringContaining("Binary operator") }),
        ]),
      );
      expect(() => renderSafeJsx({ template, components, bindings: { data: { Type: Object } } })).toThrow(
        "Unsupported binary operator",
      );
    },
  );

  test.each([
    ["data.fn()", "CALL_TARGET_NOT_ALLOWED"],
    ["data.value.unknownMethod()", "CALL_TARGET_NOT_ALLOWED"],
    ["data.items.map()", "CALLBACK_VALUE_NOT_ALLOWED"],
    ["data.items.map(data.fn)", "CALLBACK_VALUE_NOT_ALLOWED"],
    ["data.items.sort(Number)", "CALLBACK_VALUE_NOT_ALLOWED"],
    ["data.items.reduce(Number, 0)", "CALLBACK_VALUE_NOT_ALLOWED"],
  ])("rejects analyzer/runtime call mismatch %s", (expression, diagnostic) => {
    const template = `<Text>{${expression}}</Text>`;
    expect(validateCustomJsxTemplate(template)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining(diagnostic) }),
      ]),
    );
    expect(() =>
      renderSafeJsx({
        template,
        components,
        bindings: { data: { fn: () => 1, items: [1, 2], value: {}, Type: Object } },
      }),
    ).toThrow();
  });

  test.each([
    "data.items.map(Number).join(',')",
    "data.items.filter(Boolean).join(',')",
    "String(data.value)",
    "data.label.toUpperCase()",
  ])("accepts documented safe call %s", (expression) => {
    const template = `<Text>{${expression}}</Text>`;
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    expect(() =>
      renderSafeJsx({
        template,
        components,
        bindings: createCustomJsxBindings({ items: [0, 2], label: "safe", value: 2 }),
      }),
    ).not.toThrow();
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
    expect(sanitizeCustomJsxProps({ values: ["safe", () => "unsafe", { nested: () => "unsafe" }] })).toEqual({
      values: ["safe", undefined, { nested: undefined }],
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

  test("supports sequential immutable local bindings in collection callbacks", () => {
    const template = `<Text>{data.items.map((item) => {
      const segments = item.url.split("/").filter((part) => part);
      const identifier = segments.at(-1);
      const label = item.name.toUpperCase();
      return <Text key={identifier}>#{identifier} {label}</Text>;
    })}</Text>`;

    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: { data: { items: [{ name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" }] } },
    });
    expect(renderToStaticMarkup(rendered.node)).toContain("#1 BULBASAUR");
  });

  test("supports controlled zero-argument IIFEs for page-level derived values", () => {
    const template = `{(() => {
      const visible = data.items.filter((item) => item.visible);
      return <Text>{visible.map((item) => item.name).join(", ")}</Text>;
    })()}`;

    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: {
        data: {
          items: [
            { name: "Bulbasaur", visible: true },
            { name: "Mew", visible: false },
          ],
        },
      },
    });
    expect(renderToStaticMarkup(rendered.node)).toContain("Bulbasaur");
    expect(renderToStaticMarkup(rendered.node)).not.toContain("Mew");
  });

  test.each([
    [
      "let mutation",
      `{data.items.map((item) => { let value = item; return <Text>{value}</Text>; })}`,
      "INVALID_LOCAL_DECLARATION",
    ],
    [
      "destructuring",
      `{data.items.map((item) => { const { name } = item; return <Text>{name}</Text>; })}`,
      "INVALID_LOCAL_DECLARATION",
    ],
    [
      "reserved binding",
      `{data.items.map((item) => { const data = item; return <Text>{data}</Text>; })}`,
      "RESERVED_LOCAL_BINDING",
    ],
    [
      "stored callback",
      `{data.items.map((item) => { const callback = () => item; return <Text>{item}</Text>; })}`,
      "CALLBACK_VALUE_NOT_ALLOWED",
    ],
    [
      "unsupported if",
      `{data.items.map((item) => { if (item) return <Text />; return <Text />; })}`,
      "UNSUPPORTED_BLOCK_STATEMENT",
    ],
    ["missing final return", `{data.items.map((item) => { const value = item; })}`, "BLOCK_REQUIRES_FINAL_RETURN"],
    ["return-only block", `{data.items.map((item) => { return <Text>{item}</Text>; })}`, "INVALID_LOCAL_DECLARATION"],
    [
      "parameterized IIFE",
      `{((value) => { const label = value; return <Text>{label}</Text>; })()}`,
      "CALLBACK_VALUE_NOT_ALLOWED",
    ],
    ["IIFE arguments", `{((value) => { return <Text>{value}</Text>; })(data.value)}`, "CALLBACK_VALUE_NOT_ALLOWED"],
  ])("rejects unsafe block grammar: %s", (_name, template, code) => {
    expect(validateCustomJsxTemplate(template).some(({ message }) => message.includes(code))).toBe(true);
    expect(() =>
      renderSafeJsx({ template, components, bindings: { data: { items: [{ name: "Bulbasaur" }], value: "value" } } }),
    ).toThrow(code);
  });

  test("rejects callback values outside controlled call sites", () => {
    const template = "<Text>{(item) => item}</Text>";
    expect(validateCustomJsxTemplate(template)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("CALLBACK_VALUE_NOT_ALLOWED") }),
      ]),
    );
    expect(() => renderSafeJsx({ template, components, bindings })).toThrow("CALLBACK_VALUE_NOT_ALLOWED");
  });

  test.each(["constructor", "call", "bind"])(
    "keeps blocked lexical binding %s aligned between diagnostics and runtime",
    (name) => {
      const parameterTemplate = `{data.items.map((${name}) => <Text>{${name}}</Text>)}`;
      const localTemplate = `{data.items.map((item) => { const ${name} = item; return <Text>{${name}}</Text>; })}`;

      for (const template of [parameterTemplate, localTemplate]) {
        expect(validateCustomJsxTemplate(template)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining("INVALID_LOCAL_DECLARATION") }),
          ]),
        );
        expect(() => renderSafeJsx({ template, components, bindings: { data: { items: [1] } } })).toThrow(
          "INVALID_LOCAL_DECLARATION",
        );
      }
    },
  );

  test("rejects host and interpreter functions stored in local const bindings", () => {
    const template = `{data.items.map((item) => {
      const round = Math.round;
      return <Text>{item}</Text>;
    })}`;
    expect(validateCustomJsxTemplate(template)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("CALLBACK_VALUE_NOT_ALLOWED") }),
      ]),
    );
    expect(() =>
      renderSafeJsx({
        template,
        components,
        bindings: { data: { items: [1] }, Math },
      }),
    ).toThrow("CALLBACK_VALUE_NOT_ALLOWED");
  });

  test("maps parse failures to missing and duplicate local binding diagnostics", () => {
    expect(
      validateCustomJsxTemplate(`{data.items.map((item) => { const value; return <Text>{item}</Text>; })}`),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("LOCAL_BINDING_REQUIRES_INITIALIZER") }),
      ]),
    );
    expect(
      validateCustomJsxTemplate(
        `{data.items.map((item) => { const value = item; const value = item; return <Text>{value}</Text>; })}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("DUPLICATE_LOCAL_BINDING") }),
      ]),
    );
    expect(validateCustomJsxTemplate('<Text>{"const fake;" + }</Text>')[0]?.message).not.toContain(
      "LOCAL_BINDING_REQUIRES_INITIALIZER",
    );
  });

  test.each(['{data.items["ma" + "p"]((item) => item).join(",")}', '{data.items[`map`]((item) => item).join(",")}'])(
    "keeps analyzer and runtime aligned for static computed collection callbacks",
    (template) => {
      expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
      expect(() =>
        renderSafeJsx({ template, components, bindings: { data: { items: ["one", "two"] } } }),
      ).not.toThrow();
    },
  );

  test.each([
    ["assignment", `{data.items.map((item) => { const value = (item = 2); return <Text>{value}</Text>; })}`],
    ["update", `{data.items.map((item) => { const value = item++; return <Text>{value}</Text>; })}`],
    ["new", `{data.items.map((item) => { const value = new Date(item); return <Text>{value}</Text>; })}`],
  ])("uses precise safe-block diagnostics for %s expressions", (_name, template) => {
    expect(validateCustomJsxTemplate(template)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("UNSUPPORTED_BLOCK_STATEMENT") }),
      ]),
    );
    expect(() => renderSafeJsx({ template, components, bindings: { data: { items: [1] }, Date } })).toThrow(
      "UNSUPPORTED_BLOCK_STATEMENT",
    );
  });
});

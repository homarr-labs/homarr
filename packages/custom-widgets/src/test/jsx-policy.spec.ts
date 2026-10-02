import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { createCustomJsxBindings, CUSTOM_JSX_DATA_LIMITS } from "../jsx/bindings";
import { renderSafeJsx, sanitizeCustomJsxProps } from "../jsx/interpreter";
import { CUSTOM_JSX_BLOCKED_PROPERTIES, CUSTOM_JSX_BLOCKED_PROPS, CUSTOM_JSX_LIMITS } from "../jsx/policy";

const components = { Text: () => null };
const bindings = { data: Object.create(null) as Record<string, unknown> };
const renderText = (template: string, apiData: unknown) => {
  const rendered = renderSafeJsx({
    template,
    components: {
      Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
    },
    bindings: createCustomJsxBindings(apiData),
  });
  return renderToStaticMarkup(rendered.node);
};

describe("shared Custom JSX policy", () => {
  test.each(['status.list === "loading"', '"success" === status.list', 'status.list !== "error"'])(
    "rejects string request-status comparisons in %s",
    (expression) => {
      expect(validateCustomJsxTemplate(`<Text>{${expression}}</Text>`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: "error",
            message: expect.stringContaining("INVALID_STATUS_COMPARISON: status.list is an object"),
          }),
        ]),
      );
    },
  );

  test("accepts request-status object fields", () => {
    const diagnostics = validateCustomJsxTemplate(
      "<Text>{status.list?.loading ? 'Loading' : status.list?.ok === false ? status.list.error : 'Ready'}</Text>",
    );
    expect(diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
  });

  test.each([
    ["status.list.isLoading", "status.list.isLoading"],
    ["status.list?.isError", "status.list.isError"],
    ['status["list"]["isFetching"]', "status.list.isFetching"],
    ["status.series.fetching", "status.series.fetching"],
  ])("rejects unsupported request-status field %s", (expression, fieldPath) => {
    const diagnostics = validateCustomJsxTemplate(`<Text>{${expression} ? "Busy" : "Ready"}</Text>`);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining(`INVALID_STATUS_FIELD: ${fieldPath}`),
        }),
      ]),
    );
  });

  test("preserves valid status fields and dynamic status access", () => {
    const diagnostics = validateCustomJsxTemplate(
      '<Text>{status.list?.loading ? "Loading" : status.list?.ok === false ? status.list.error : status.list[inputs.field]} {data.status.isLoading}</Text>',
    );
    expect(diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
  });

  test("handles nullish comparisons without coercing sanitized objects", () => {
    const healthTemplate = '<Text>{data.health == null ? "No status" : "Degraded"}</Text>';
    expect(renderText(healthTemplate, {})).toContain("No status");
    expect(renderText(healthTemplate, { health: { status: "ok" } })).toContain("Degraded");
    const reverseHealthTemplate =
      '<Text>{null == data.health ? "No status" : "Degraded"} {data.health != null ? "Present" : "Missing"} {null != data.health ? "Present" : "Missing"}</Text>';
    expect(renderText(reverseHealthTemplate, { health: { status: "ok" } })).toContain("Degraded Present Present");

    const nullishTemplate =
      '<Text>{undefined == null ? "equal" : "different"} {null == undefined ? "equal" : "different"} {undefined != null ? "wrong" : "not equal"} {null != undefined ? "wrong" : "not equal"}</Text>';
    expect(renderText(nullishTemplate, {})).toContain("equal equal not equal not equal");

    const strictTemplate =
      '<Text>{data.health === null ? "same" : "different"} {data.health !== null ? "different" : "same"}</Text>';
    expect(renderText(strictTemplate, { health: {} })).toContain("different different");
  });

  test("accepts canonical Mantine compound component names", () => {
    const diagnostics = validateCustomJsxTemplate(
      '<Radio.Group value="one"><Radio.Card value="one"><Radio.Indicator /></Radio.Card></Radio.Group>',
    );
    expect(diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
  });

  test("accepts the concise Icon alias used by the AI prompt", () => {
    expect(validateCustomJsxTemplate('<ThemeIcon><Icon name="brand-docker" /></ThemeIcon>')).toEqual([]);
  });

  test.each(["IconCloudUpload", "cloud-rain", "not-a-real-icon"])(
    "rejects invisible unsupported icon names: %s",
    (name) => {
      expect(validateCustomJsxTemplate(`<Icon name="${name}" />`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: "error",
            message: expect.stringContaining("registered kebab-case icon name"),
          }),
        ]),
      );
    },
  );

  test.each(["Anchor", "Button", "TextInput"])("rejects %s inside a manual SubFetch trigger", (component) => {
    const template = `<SubFetch requestId="search" trigger="manual" triggerContent={<Card><${component} /></Card>} />`;
    expect(validateCustomJsxTemplate(template)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("SubFetch triggerContent cannot contain interactive descendants"),
        }),
      ]),
    );
  });

  test("allows non-interactive and automatic SubFetch content", () => {
    expect(
      validateCustomJsxTemplate(
        '<SubFetch requestId="search" trigger="manual" triggerContent={<Card><Text>Search</Text></Card>} />',
      ).filter(({ message }) => message.includes("SubFetch triggerContent cannot contain interactive descendants")),
    ).toEqual([]);
    expect(
      validateCustomJsxTemplate(
        '<SubFetch requestId="search" trigger="auto" triggerContent={<Button>Search</Button>} />',
      ).filter(({ message }) => message.includes("SubFetch triggerContent cannot contain interactive descendants")),
    ).toEqual([]);
  });

  test("rejects TablerIcon without its required name prop", () => {
    expect(validateCustomJsxTemplate('<TablerIcon icon="IconHeartbeat" />')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("MISSING_REQUIRED_PROP: 'name' on TablerIcon"),
        }),
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("UNKNOWN_COMPONENT_PROP: 'icon' on TablerIcon"),
        }),
      ]),
    );
  });

  test("accepts common bounded formatting and collection operations", () => {
    expect(
      validateCustomJsxTemplate(
        '<Text>{[1, 2].concat([3]).flatMap(value => [value]).map(value => value.toLocaleString()).join(", ")}</Text>',
      ),
    ).toEqual([]);
    expect(validateCustomJsxTemplate('<Text>{"b".localeCompare("a")}</Text>')).toEqual([]);
  });

  test("formats an absolute date and time in an explicit safe timezone", () => {
    const template = '<Text>{Date.toLocaleString(data.createdAt, "en-US", "UTC")} UTC</Text>';

    expect(validateCustomJsxTemplate(template)).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: createCustomJsxBindings({ createdAt: "2026-08-28T19:22:00.000Z" }),
    });
    const html = renderToStaticMarkup(rendered.node);
    expect(html).toContain("Aug 28, 2026");
    expect(html).toContain("7:22 PM UTC");
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

  test("validates explicit bind attributes through the JSX AST", () => {
    expect(
      validateCustomJsxTemplate('<TextInput bind="search" />').filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(validateCustomJsxTemplate("<TextInput bind={data.name} />")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("literal input name") }),
      ]),
    );
    expect(validateCustomJsxTemplate('<TextInput bind="not valid" />')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("Invalid bind input name") }),
      ]),
    );
    expect(
      validateCustomJsxTemplate('<Text>{"<TextInput bind={data.name} />"}</Text>').some(({ message }) =>
        message.includes("literal input name"),
      ),
    ).toBe(false);
  });

  test.each(["RefreshButton", "SubFetch", "ActionButton", "ToggleSwitch"])(
    "rejects a non-string or empty requestId on %s during independent JSX validation",
    (component) => {
      expect(validateCustomJsxTemplate(`<${component} requestId="known" />`)).toEqual([]);
      expect(validateCustomJsxTemplate(`<${component} requestId={'known'} />`)).toEqual([]);
      for (const template of [
        `<${component} requestId={8} />`,
        `<${component} requestId={data.requestId} />`,
        `<${component} requestId="" />`,
        `<${component} requestId="   " />`,
      ]) {
        expect(validateCustomJsxTemplate(template)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              severity: "error",
              message: `${component} must use a literal requestId`,
            }),
          ]),
        );
      }
    },
  );

  test.each(["SubFetch", "ActionButton", "ToggleSwitch"])(
    "requires requestId on %s during independent JSX validation",
    (component) => {
      expect(validateCustomJsxTemplate(`<${component} />`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: "error",
            message: `${component} must use a literal requestId`,
          }),
        ]),
      );
    },
  );

  test("keeps requestId optional on RefreshButton", () => {
    expect(validateCustomJsxTemplate("<RefreshButton />")).toEqual([]);
  });

  test("accepts only scalar reset dependencies for bindable controls", () => {
    expect(
      validateCustomJsxTemplate(
        '<Pagination bind="page" resetKey={inputs.search} defaultValue={1} total={5} />',
      ).filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(
      validateCustomJsxTemplate('<Pagination bind="page" resetKey={{ search: inputs.search }} total={5} />'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", message: expect.stringContaining("resetKey must resolve") }),
      ]),
    );
    expect(sanitizeCustomJsxProps({ resetKey: { search: "unsafe" }, total: 5 }, "Pagination")).toEqual({
      total: 5,
    });
  });

  test("rejects bind values introduced by JSX spreads at the emitter boundary", () => {
    expect(() =>
      renderSafeJsx({
        template: "<TextInput {...data.props} />",
        components: { TextInput: (() => null) as never },
        bindings: { data: { props: { bind: "remote-name", label: "Unsafe" } } },
      }),
    ).toThrow("BIND_SPREAD_NOT_ALLOWED");
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

  test("supports expression callbacks", () => {
    const template =
      '<Text>{data.items.filter((item) => item.visible).map((item) => item.name.toUpperCase()).join(", ")}</Text>';
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: { data: { items: [{ name: "Bulbasaur", visible: true }] } },
    });
    expect(renderToStaticMarkup(rendered.node)).toContain("BULBASAUR");
  });

  test("supports compact indexed literal labels for numeric API enums", () => {
    const template =
      '<Text>{["Unknown", "Pending", "Processing", "Partially Available", "Available", "Blocklisted", "Deleted"][(data.item?.status ?? 1) - 1] ?? "Unknown"}</Text>';
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: { data: { item: { status: 4 } } },
    });
    expect(renderToStaticMarkup(rendered.node)).toContain("Partially Available");
  });

  test("supports bounded regex string operations", () => {
    const template = '<Text>{data.name.replace(/[^a-z]/gi, "-")}</Text>';
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: { data: { name: "Bulba saur!" } },
    });
    expect(renderToStaticMarkup(rendered.node)).toContain("Bulba-saur-");
  });

  test.each(["/(a+)+$/", "/(?<=a)b/", "/(a)\\1/", "/^(a|aa)+$/", "/^(a|a?)+$/", "/^a+a+$/", "/^(\\w+\\s?)*$/"])(
    "rejects unsafe regex %s in analysis and at runtime",
    (pattern) => {
      const template = `<Text>{${pattern}.test(data.name)}</Text>`;
      expect(validateCustomJsxTemplate(template)).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("UNSAFE_REGEX") })]),
      );
      expect(() =>
        renderSafeJsx({ template, components, bindings: { data: { name: "a".repeat(10_000) + "!" } } }),
      ).toThrow("UNSAFE_REGEX");
    },
  );

  test("allows a single unambiguous variable regex quantifier", () => {
    const template = '<Text>{/^(ab)+$/.test(data.name) ? "yes" : "no"}</Text>';
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    expect(() => renderSafeJsx({ template, components, bindings: { data: { name: "abab" } } })).not.toThrow();
  });

  test("bounds response data depth, node count, and string length without recursive traversal", () => {
    let deeplyNested: unknown = null;
    for (let depth = 0; depth <= CUSTOM_JSX_DATA_LIMITS.depth; depth += 1) deeplyNested = { child: deeplyNested };
    expect(() => createCustomJsxBindings(deeplyNested)).toThrow(/depth limit/u);
    expect(() => createCustomJsxBindings(Array.from({ length: CUSTOM_JSX_DATA_LIMITS.nodes }).fill(null))).toThrow(
      /node limit/u,
    );
    expect(() => createCustomJsxBindings("x".repeat(CUSTOM_JSX_DATA_LIMITS.stringLength + 1))).toThrow(
      /string length limit/u,
    );
  });

  test("keeps direct documented safe helper callbacks available", () => {
    const template = '<Text>{data.items.map(Number).join(",")}</Text>';
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    expect(() =>
      renderSafeJsx({ template, components, bindings: createCustomJsxBindings({ items: ["1", "2"] }) }),
    ).not.toThrow();
  });

  test("rejects IIFEs and callback statement blocks", () => {
    for (const template of [
      "{(() => <Text>value</Text>)()}",
      "{data.items.map((item) => { const value = item; return value; })}",
    ]) {
      expect(
        validateCustomJsxTemplate(template).some(
          ({ message }) => message.includes("IIFE") || message.includes("UNSUPPORTED_BLOCK_STATEMENT"),
        ),
      ).toBe(true);
      expect(() =>
        renderSafeJsx({ template, components, bindings: createCustomJsxBindings({ items: [1] }) }),
      ).toThrow();
    }
  });

  test("normalizes duplicate callback parameter parse diagnostics", () => {
    const template = "{data.items.map((item, item) => item)}";
    expect(validateCustomJsxTemplate(template)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("DUPLICATE_LOCAL_BINDING") }),
      ]),
    );
    expect(() => renderSafeJsx({ template, components, bindings: { data: { items: [1] } } })).toThrow(
      "DUPLICATE_LOCAL_BINDING",
    );
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

      expect(validateCustomJsxTemplate(parameterTemplate)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining("INVALID_LOCAL_DECLARATION") }),
        ]),
      );
      expect(() =>
        renderSafeJsx({ template: parameterTemplate, components, bindings: { data: { items: [1] } } }),
      ).toThrow("INVALID_LOCAL_DECLARATION");
    },
  );

  test.each(['{data.items["ma" + "p"]((item) => item).join(",")}', '{data.items[`map`]((item) => item).join(",")}'])(
    "keeps analyzer and runtime aligned for static computed collection callbacks",
    (template) => {
      expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
      expect(() =>
        renderSafeJsx({ template, components, bindings: { data: { items: ["one", "two"] } } }),
      ).not.toThrow();
    },
  );
});

import { describe, expect, it } from "vitest";

import {
  analyzeJsxTemplate,
  analyzeCustomWidgetAccessibility,
  analyzeRequestManifest,
  appendDataPath,
  createResponseTreeNode,
  CUSTOM_JSX_TEMPLATE_LIMIT,
  DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
  customWidgetFormSchema,
  renameCustomWidgetRequest,
} from "../workbench";
import { CUSTOM_WIDGET_STARTER } from "../core/examples";
import {
  CUSTOM_WIDGET_OPTIONS_EXAMPLES,
  CUSTOM_WIDGET_REQUEST_EXAMPLES,
  getCustomWidgetDefaultOptionsJsonSchema,
  getCustomWidgetOptionsJsonSchema,
  getCustomWidgetRequestsJsonSchema,
} from "../core/schema-references";
import { getCustomJsxComponentPropCompletions, getCustomJsxLocalConstCompletions } from "../workbench/code-language";

describe("Custom Widget workbench contracts", () => {
  it("always provides a valid starter template", () => {
    expect(DEFAULT_CUSTOM_WIDGET_FORM_VALUES.template.trim()).not.toBe("");
    expect(
      customWidgetFormSchema.safeParse({
        ...DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
        name: "Example",
        url: "https://example.com/api",
      }).success,
    ).toBe(true);
  });

  it("accepts 50,000 template characters and rejects 50,001", () => {
    expect(analyzeJsxTemplate("x".repeat(CUSTOM_JSX_TEMPLATE_LIMIT))).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "templateTooLong" })]),
    );
    expect(analyzeJsxTemplate("x".repeat(CUSTOM_JSX_TEMPLATE_LIMIT + 1))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "templateTooLong", severity: "error" })]),
    );
  });

  it("validates full request manifests rather than accepting any JSON array", () => {
    expect(analyzeRequestManifest("[]")).toEqual([]);
    expect(analyzeRequestManifest('[{"id":"broken"}]')).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "invalidRequestManifest", severity: "error" })]),
    );
  });

  it("generates schema references and examples from canonical validators", () => {
    expect(getCustomWidgetRequestsJsonSchema()).toMatchObject({ type: "array" });
    expect(getCustomWidgetOptionsJsonSchema()).toMatchObject({ type: "object" });
    expect(getCustomWidgetDefaultOptionsJsonSchema()).toMatchObject({ type: "object" });
    expect(analyzeRequestManifest(JSON.stringify(CUSTOM_WIDGET_REQUEST_EXAMPLES.full))).toEqual([]);
    expect(CUSTOM_WIDGET_OPTIONS_EXAMPLES.full.defaults).toMatchObject({ limit: 20 });
  });

  it("validates named request references and rejects inline network capabilities", () => {
    expect(analyzeJsxTemplate('<SubFetch requestId="known" />', { requestIds: ["known"] })).toEqual([]);
    expect(analyzeJsxTemplate('<SubFetch requestId="missing" url="/api" />', { requestIds: ["known"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "inlineRequestProps" }),
        expect.objectContaining({ code: "unknownRequest", value: "missing" }),
      ]),
    );
  });

  it("accepts named temporary inputs and diagnoses dynamic bindings", () => {
    expect(analyzeJsxTemplate('<DatePicker bind="selectedDate" />')).toEqual([]);
    expect(analyzeJsxTemplate("<DatePicker bind={inputs.selectedDate} />")).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "dynamicInputBinding" })]),
    );
    expect(analyzeJsxTemplate('<Calendar bind="selectedDate" />')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ast", value: expect.stringContaining("BINDING_UNAVAILABLE") }),
      ]),
    );
    expect(analyzeJsxTemplate('<TextInput bind="filter"/><Switch bind="filter"/>')).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "bindingTypeConflict", value: "filter" })]),
    );
  });

  it("completes only earlier immutable locals from the active block, even with unrelated syntax errors", () => {
    const source = `{data.first.map((item) => { const sibling = ; return sibling; })}
      {data.second.map((item) => {
        const current = item;
        return <Text>{current}</Text>;
        const future = item;
      })}`;
    const cursor = source.indexOf("return <Text>");
    const labels = getCustomJsxLocalConstCompletions(source, cursor).map(({ label }) => label);
    expect(labels).toContain("current");
    expect(labels).not.toContain("sibling");
    expect(labels).not.toContain("future");
  });

  it("does not complete the active or future declarator", () => {
    const source = `{data.items.map((item) => {
      const first = item, current = fir, future = current;
      return future;
    })}`;
    const cursor = source.indexOf("= fir") + "= fir".length;
    const labels = getCustomJsxLocalConstCompletions(source, cursor).map(({ label }) => label);
    expect(labels).toContain("first");
    expect(labels).not.toContain("current");
    expect(labels).not.toContain("future");
  });

  it("uses canonical component prop types for contextual JSX completions", () => {
    const textInput = getCustomJsxComponentPropCompletions("TextInput");
    expect(textInput).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "label=", detail: expect.stringContaining("ReactNode") }),
        expect.objectContaining({ label: "bind=", detail: "string" }),
      ]),
    );
    expect(getCustomJsxComponentPropCompletions("Portal")).toEqual([]);
  });

  it("uses the AST security policy for computed reflective access while accepting benign fetch text", () => {
    expect(analyzeJsxTemplate("<Text>{data['con' + 'structor']}</Text>")).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ast", severity: "error" })]),
    );
    expect(analyzeJsxTemplate("<Text>fetch the latest status</Text>")).toEqual([]);
  });

  it("builds safe response-tree paths for identifiers, arrays, and arbitrary object keys", () => {
    expect(appendDataPath("data", "items", false)).toBe("data.items");
    expect(appendDataPath("data.items", "0", true)).toBe("data.items[0]");
    expect(appendDataPath("data", "first-name", false)).toBe('data["first-name"]');
    const tree = createResponseTreeNode({ items: [{ name: "one" }] }, "data", "data");
    expect(tree.children?.[0]?.children?.[0]?.children?.[0]?.value).toBe("data.items[0].name");
  });

  it("renames a request and every canonical reference atomically", () => {
    const renamed = renameCustomWidgetRequest(
      {
        ...CUSTOM_WIDGET_STARTER,
        requests: [
          {
            id: "items",
            sourceId: "default",
            kind: "query",
            method: "GET",
            pathTemplate: "/items",
            parameters: {},
            auth: "none",
            minimumBoardPermission: "view",
            trigger: "manual",
          },
          {
            id: "refresh",
            sourceId: "default",
            kind: "action",
            method: "POST",
            pathTemplate: "/refresh",
            parameters: {},
            auth: "none",
            minimumBoardPermission: "modify",
            trigger: "manual",
            invalidates: ["items"],
          },
        ],
        optionsSchema: {
          type: "object",
          properties: {
            item: {
              type: "string",
              "x-homarr": {
                control: "select",
                optionsSource: { requestId: "items", valuePath: "$.id", labelPath: "$.name" },
              },
            },
          },
          additionalProperties: false,
        },
        template: '<Stack><SubFetch requestId="items" />{data["items"]}{status.items.ok}</Stack>',
      },
      "items",
      "inventory",
    );

    expect(renamed.requests[0]?.id).toBe("inventory");
    expect(renamed.requests[1]?.invalidates).toEqual(["inventory"]);
    expect(JSON.stringify(renamed.optionsSchema)).toContain('"requestId":"inventory"');
    expect(renamed.template).toBe(
      '<Stack><SubFetch requestId="inventory" />{data["inventory"]}{status.inventory.ok}</Stack>',
    );
  });

  it("reports common accessibility omissions in preview", () => {
    expect(
      analyzeCustomWidgetAccessibility('<Stack><Image src="/image.png"/><ActionIcon/><TextInput /></Stack>'),
    ).toEqual(["imageAlt", "actionIconLabel", "inputLabel"]);
    expect(
      analyzeCustomWidgetAccessibility(
        '<Stack><Image src="/image.png" alt="Preview"/><ActionIcon aria-label="Refresh"/><TextInput label="Search" /></Stack>',
      ),
    ).toEqual([]);
  });
});

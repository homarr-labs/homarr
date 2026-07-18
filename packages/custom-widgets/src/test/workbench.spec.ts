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

  it("validates named request references and rejects inline network capabilities", () => {
    expect(analyzeJsxTemplate('<SubFetch requestId="known" />', { requestIds: ["known"] })).toEqual([]);
    expect(analyzeJsxTemplate('<SubFetch requestId="missing" url="/api" />', { requestIds: ["known"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "inlineRequestProps" }),
        expect.objectContaining({ code: "unknownRequest", value: "missing" }),
      ]),
    );
  });

  it("diagnoses dynamic and unknown local-state bindings", () => {
    expect(analyzeJsxTemplate('<Calendar bind="selectedDate" />', { stateKeys: ["selectedDate"] })).toEqual([]);
    expect(analyzeJsxTemplate('<Calendar bind="missing" />', { stateKeys: ["selectedDate"] })).toEqual([
      expect.objectContaining({ code: "unknownStateBinding", value: "missing" }),
    ]);
    expect(analyzeJsxTemplate("<Calendar bind={state.selectedDate} />", { stateKeys: ["selectedDate"] })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "dynamicStateBinding" })]),
    );
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

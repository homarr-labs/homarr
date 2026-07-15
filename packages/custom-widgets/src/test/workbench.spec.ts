import { describe, expect, it } from "vitest";

import {
  analyzeJsxTemplate,
  analyzeRequestManifest,
  appendDataPath,
  createResponseTreeNode,
  CUSTOM_JSX_TEMPLATE_LIMIT,
  DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
  customWidgetFormSchema,
} from "../workbench";

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
    expect(analyzeJsxTemplate('<SubFetch requestId="known" />', { apiVersion: 2, requestIds: ["known"] })).toEqual([]);
    expect(
      analyzeJsxTemplate('<SubFetch requestId="missing" url="/api" />', { apiVersion: 2, requestIds: ["known"] }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "legacyNetworkProps" }),
        expect.objectContaining({ code: "unknownRequest", value: "missing" }),
      ]),
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
});

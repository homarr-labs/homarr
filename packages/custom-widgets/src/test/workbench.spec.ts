import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_STARTER, customWidgetDefinitionSchema } from "../core";
import {
  CUSTOM_WIDGET_OPTIONS_EXAMPLES,
  CUSTOM_WIDGET_REQUEST_EXAMPLES,
  getCustomWidgetOptionsJsonSchema,
  getCustomWidgetRequestsJsonSchema,
} from "../core/schema-references";
import {
  analyzeCustomWidgetAccessibility,
  analyzeJsxTemplate,
  analyzeRequestManifest,
  appendDataPath,
  createResponseTreeNode,
  CUSTOM_JSX_TEMPLATE_LIMIT,
  customWidgetFormSchema,
  DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
  renameCustomWidgetOption,
  renameCustomWidgetRequest,
} from "../workbench";
import { getCustomJsxComponentPropCompletions } from "../workbench/code-language";

describe("Custom Widget workbench contracts", () => {
  it("provides valid lean starter form values", () => {
    expect(customWidgetFormSchema.safeParse(DEFAULT_CUSTOM_WIDGET_FORM_VALUES).success).toBe(true);
    expect(JSON.parse(DEFAULT_CUSTOM_WIDGET_FORM_VALUES.sources)).toHaveProperty("default");
  });

  it("validates keyed request manifests", () => {
    expect(analyzeRequestManifest(JSON.stringify(CUSTOM_WIDGET_REQUEST_EXAMPLES.full))).toEqual([]);
    expect(analyzeRequestManifest("[]")).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "invalidRequestManifest" })]),
    );
    expect(getCustomWidgetRequestsJsonSchema()).toMatchObject({ type: "object" });
    expect(getCustomWidgetOptionsJsonSchema()).toMatchObject({ type: "object" });
    expect(CUSTOM_WIDGET_OPTIONS_EXAMPLES.full.limit.default).toBe(20);
  });

  it("enforces the template size and named request references", () => {
    expect(analyzeJsxTemplate("x".repeat(CUSTOM_JSX_TEMPLATE_LIMIT + 1))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "templateTooLong" })]),
    );
    expect(analyzeJsxTemplate('<SubFetch requestId="known" />', { requestIds: ["known"] })).toEqual([]);
    expect(analyzeJsxTemplate('<SubFetch requestId="missing" url="/api" />', { requestIds: ["known"] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "inlineRequestProps" }),
        expect.objectContaining({ code: "unknownRequest" }),
      ]),
    );
  });

  it("supports temporary inputs and diagnoses incompatible bindings", () => {
    expect(analyzeJsxTemplate('<TextInput bind="filter"/><Switch bind="filter"/>')).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "bindingTypeConflict" })]),
    );
    expect(analyzeJsxTemplate("<TextInput bind={inputs.filter} />")).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "dynamicInputBinding" })]),
    );
  });

  it("does not advertise statement blocks or IIFEs", () => {
    expect(
      analyzeJsxTemplate("<Text>{data.items.map(item => { const name = item.name; return name; })}</Text>"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ast", value: expect.stringContaining("UNSUPPORTED_BLOCK_STATEMENT") }),
      ]),
    );
    expect(analyzeJsxTemplate("<Text>{(() => data.name)()}</Text>")).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ast", value: expect.stringContaining("IIFEs") })]),
    );
  });

  it("supports compound names and contextual prop completions", () => {
    expect(analyzeJsxTemplate("<Card.Section><Tabs.List /></Card.Section>")).toEqual([]);
    expect(getCustomJsxComponentPropCompletions("TextInput")).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "bind=" })]),
    );
  });

  it("renames keyed request references atomically", () => {
    const renamed = renameCustomWidgetRequest(
      {
        ...customWidgetDefinitionSchema.parse(CUSTOM_WIDGET_STARTER),
        requests: {
          items: {
            source: "default",
            kind: "query",
            method: "GET",
            path: "/items",
            auth: "inherit",
            permission: "view",
            trigger: "load",
            confirmation: undefined,
          },
          refresh: {
            source: "default",
            kind: "action",
            method: "POST",
            path: "/refresh",
            auth: "inherit",
            permission: "modify",
            trigger: "manual",
            confirmation: undefined,
            invalidates: ["items"],
          },
        },
        options: {
          item: {
            label: "Item",
            control: "select",
            default: "",
            choicesFrom: { request: "items", valuePath: "id", labelPath: "name" },
          },
        },
        template: '<Stack>{data["items"]}{status.items.ok}</Stack>',
      },
      "items",
      "inventory",
    );
    expect(renamed.requests.inventory).toBeDefined();
    expect(renamed.requests.refresh?.invalidates).toEqual(["inventory"]);
    expect(renamed.options.item?.choicesFrom?.request).toBe("inventory");
    expect(renamed.template).toContain("inventory");
  });

  it("renames option references atomically", () => {
    const renamed = renameCustomWidgetOption(
      customWidgetDefinitionSchema.parse({
        ...CUSTOM_WIDGET_STARTER,
        options: { room: { label: "Room", control: "text", default: "office" } },
        requests: {
          status: {
            path: "/rooms/{option:room}",
            query: { selected: { $option: "room" } },
            body: { room: { $option: "room" } },
          },
        },
        template: '<Text>{options.room}{options["room"]}</Text>',
      }),
      "room",
      "roomId",
    );
    expect(renamed.options.roomId?.default).toBe("office");
    expect(renamed.requests.status?.path).toBe("/rooms/{option:roomId}");
    expect(renamed.requests.status?.query).toEqual({ selected: { $option: "roomId" } });
    expect(renamed.requests.status?.body).toEqual({ room: { $option: "roomId" } });
    expect(renamed.template).toBe('<Text>{options.roomId}{options["roomId"]}</Text>');
  });

  it("builds response paths and accessibility diagnostics", () => {
    expect(appendDataPath("data", "first-name", false)).toBe('data["first-name"]');
    expect(
      createResponseTreeNode({ items: [{ name: "one" }] }, "data", "data").children?.[0]?.children?.[0]?.children?.[0]
        ?.value,
    ).toBe("data.items[0].name");
    expect(analyzeCustomWidgetAccessibility('<Image src="/image.png"/><ActionIcon/><TextInput />')).toEqual([
      "imageAlt",
      "actionIconLabel",
      "inputLabel",
    ]);
  });
});

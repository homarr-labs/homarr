import { describe, expect, it } from "vitest";

import {
  customWidgetDefinitionSchema,
  customWidgetOptionControls,
  customWidgetOptionSchema,
  getCustomWidgetDefaultOptions,
  normalizeCustomWidgetOptions,
  validateCustomWidgetOptions,
} from "../core";

const defaultsByControl: Record<(typeof customWidgetOptionControls)[number], unknown> = {
  text: "value",
  textarea: "long value",
  number: 2,
  switch: true,
  select: "one",
  multiSelect: ["one"],
  slider: 50,
  date: "2026-07-21",
  time: "12:30",
  color: "#228be6",
  icon: "server",
  url: "https://example.com",
  duration: 30,
  timeZone: "Europe/Paris",
  json: { nested: true },
};

describe("lean Custom Widget options", () => {
  it("treats an empty dynamic choices item path as the response root", () => {
    expect(
      customWidgetOptionSchema.parse({
        label: "Printer",
        control: "select",
        default: "",
        choicesFrom: {
          request: "printers",
          itemsPath: "",
          valuePath: "id",
          labelPath: "name",
        },
      }).choicesFrom?.itemsPath,
    ).toBeUndefined();
  });

  it.each(customWidgetOptionControls)("accepts the %s control and infers its default type", (control) => {
    const option = {
      label: control,
      control,
      default: defaultsByControl[control],
      ...(["select", "multiSelect"].includes(control) ? { choices: [{ label: "One", value: "one" }] } : {}),
    };
    expect(customWidgetOptionSchema.safeParse(option).success).toBe(true);
  });

  it("builds and validates a complete instance configuration", () => {
    const options = Object.fromEntries(
      customWidgetOptionControls.map((control) => [
        control,
        customWidgetOptionSchema.parse({
          label: control,
          control,
          default: defaultsByControl[control],
          ...(["select", "multiSelect"].includes(control) ? { choices: [{ label: "One", value: "one" }] } : {}),
        }),
      ]),
    );
    const configuration = getCustomWidgetDefaultOptions(options);
    expect(validateCustomWidgetOptions(options, configuration)).toEqual([]);
  });

  it("replaces stale values with current defaults", () => {
    const options = customWidgetDefinitionSchema.parse({
      $schema: "homarr-custom-widget-v2",
      name: "Updated options",
      sources: {},
      requests: {},
      options: {
        limit: { label: "Limit", control: "slider", default: 5, min: 1, max: 10 },
        label: { label: "Label", control: "text", default: "Default" },
      },
      template: "<Text>{options.limit}</Text>",
    }).options;

    const normalized = normalizeCustomWidgetOptions(options, {
      limit: "5",
      label: "Custom",
      removed: true,
    });

    expect(normalized).toEqual({ limit: 5, label: "Custom" });
    expect(validateCustomWidgetOptions(options, normalized)).toEqual([]);
  });

  it("rejects duplicate static choice values", () => {
    expect(
      customWidgetOptionSchema.safeParse({
        label: "Environment",
        control: "select",
        default: "prod",
        choices: [
          { label: "Production", value: "prod" },
          { label: "Duplicate", value: "prod" },
        ],
      }).success,
    ).toBe(false);
  });

  it("keeps dynamic choices on a load query without invocation parameters", () => {
    const result = customWidgetDefinitionSchema.safeParse({
      $schema: "homarr-custom-widget-v2",
      name: "Dynamic options",
      sources: { default: { baseUrl: "https://example.com", networkScope: "public", auth: "none" } },
      requests: { environments: { path: "/environments" } },
      options: {
        environment: {
          label: "Environment",
          control: "select",
          default: "",
          choicesFrom: { request: "environments", valuePath: "id", labelPath: "name" },
        },
      },
      template: "<Text>{options.environment}</Text>",
    });
    expect(result.success).toBe(true);
  });
});

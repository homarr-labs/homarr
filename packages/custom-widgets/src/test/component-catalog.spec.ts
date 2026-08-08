import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  customJsxAuthoringCatalog,
  getCustomJsxPropType,
  resolveCustomJsxPropDescriptor,
} from "../core/component-catalog";
import {
  CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION,
  CUSTOM_WIDGET_AUTHORING_VERSION,
} from "../core/component-catalog-types";
import { customJsxComponentRegistry } from "../core/component-registry";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const catalogPath = resolve(repositoryRoot, "packages/custom-widgets/src/core/component-catalog.generated.json");
const publicCatalogPath = resolve(repositoryRoot, "apps/docs/static/custom-widgets/component-catalog-v1.json");

// Keep a reviewed ceiling close to the generated artifact so accidental metadata
// duplication must receive explicit review.
const MAX_CATALOG_BYTES = 800 * 1024;

describe("Custom JSX authoring catalog", () => {
  test("is versioned against the installed authoring surface", async () => {
    const mantinePackage = JSON.parse(
      await readFile(resolve(repositoryRoot, "node_modules/@mantine/core/package.json"), "utf8"),
    ) as { version: string };

    expect(customJsxAuthoringCatalog.schemaVersion).toBe(CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION);
    expect(customJsxAuthoringCatalog.mantineVersion).toBe(mantinePackage.version);
    expect(customJsxAuthoringCatalog.customWidgetVersion).toBe(CUSTOM_WIDGET_AUTHORING_VERSION);
  });

  test("publishes deterministic unique component and prop records", () => {
    const componentNames = customJsxAuthoringCatalog.components.map(({ name }) => name);
    const globalPropNames = customJsxAuthoringCatalog.globalProps.map(({ name }) => name);
    const types = customJsxAuthoringCatalog.types;
    expect(new Set(componentNames).size).toBe(componentNames.length);
    expect(new Set(globalPropNames).size).toBe(globalPropNames.length);
    expect(new Set(types).size).toBe(types.length);
    expect(componentNames).toEqual([...componentNames].toSorted());
    expect(globalPropNames).toEqual([...globalPropNames].toSorted());
    expect(types).toEqual([...types].toSorted());

    const globals = new Map(customJsxAuthoringCatalog.globalProps.map((prop) => [prop.name, prop]));
    for (const component of customJsxAuthoringCatalog.components) {
      const propNames = component.props.map(({ name }) => name);
      expect(new Set(propNames).size, component.name).toBe(propNames.length);
      expect(propNames, component.name).toEqual([...propNames].toSorted());
      for (const prop of component.props) {
        expect(prop.source, `${component.name}.${prop.name}`).toBe("component");
        expect(prop.typeRef, `${component.name}.${prop.name}`).toBeGreaterThanOrEqual(0);
        expect(prop.typeRef, `${component.name}.${prop.name}`).toBeLessThan(types.length);
        expect(getCustomJsxPropType(prop), `${component.name}.${prop.name}`).not.toBe("");
        const global = globals.get(prop.name);
        if (global) {
          expect(
            prop.required !== global.required ||
              getCustomJsxPropType(prop) !== getCustomJsxPropType(global) ||
              JSON.stringify(prop.literalValues ?? []) !== JSON.stringify(global.literalValues ?? []),
            `${component.name}.${prop.name} must be a meaningful global-prop override`,
          ).toBe(true);
        }
      }
    }
    for (const prop of customJsxAuthoringCatalog.globalProps) {
      expect(prop.source, prop.name).toBe("global");
      expect(prop.required, prop.name).toBe(false);
      expect(prop.typeRef, prop.name).toBeGreaterThanOrEqual(0);
      expect(prop.typeRef, prop.name).toBeLessThan(types.length);
      expect(resolveCustomJsxPropDescriptor(prop).type, prop.name).not.toBe("");
    }
  });

  test("covers the complete runtime component registry", () => {
    const catalogNames = customJsxAuthoringCatalog.components.map(({ name }) => name);
    const runtimeNames = customJsxComponentRegistry.map(({ name }) => name).toSorted();
    expect(catalogNames).toEqual(runtimeNames);
  });

  test("includes prop APIs, bindings, accessibility, and denied reasons", () => {
    const textInput = customJsxAuthoringCatalog.components.find(({ name }) => name === "TextInput");
    const label = textInput?.props.find(({ name }) => name === "label");
    expect(label && getCustomJsxPropType(label)).toContain("ReactNode");
    expect(label?.required).toBe(false);
    expect(label?.description).toBeTruthy();
    expect(textInput?.bind).toEqual({ type: "string", initialProp: "defaultValue" });

    const switchComponent = customJsxAuthoringCatalog.components.find(({ name }) => name === "Switch");
    expect(switchComponent?.bind).toEqual({ type: "boolean", initialProp: "defaultChecked" });

    expect(customJsxAuthoringCatalog.components.some(({ name }) => name === "RecursiveList")).toBe(false);

    const portal = customJsxAuthoringCatalog.components.find(({ name }) => name === "Portal");
    expect(portal?.safety).toBe("denied");
    expect(portal?.deniedReason).toBeTruthy();
    expect(portal?.props).toEqual([]);

    const tableOfContents = customJsxAuthoringCatalog.components.find(({ name }) => name === "TableOfContents");
    expect(tableOfContents?.safety).toBe("denied");
    expect(tableOfContents?.deniedReason).toContain("outside the widget root");

    const tooltip = customJsxAuthoringCatalog.components.find(({ name }) => name === "Tooltip");
    expect(tooltip?.blockedProps).toContainEqual(
      expect.objectContaining({ name: "target", reason: expect.stringContaining("outside the widget root") }),
    );
    expect(tooltip?.props.map(({ name }) => name)).not.toContain("target");

    const datePickerInput = customJsxAuthoringCatalog.components.find(({ name }) => name === "DatePickerInput");
    expect(datePickerInput?.blockedProps.map(({ name }) => name)).toEqual(["dropdownType", "modalProps"]);
  });

  test("documents blocked prop capabilities once and excludes them from APIs", () => {
    const blockedNames = customJsxAuthoringCatalog.blockedCapabilities.map(({ name }) => name);
    expect(new Set(blockedNames).size).toBe(blockedNames.length);
    expect(customJsxAuthoringCatalog.blockedCapabilities).toContainEqual(
      expect.objectContaining({ kind: "prop", name: "dangerouslySetInnerHTML" }),
    );
    expect(customJsxAuthoringCatalog.blockedCapabilities).toContainEqual(
      expect.objectContaining({ kind: "prop-pattern", name: "on*" }),
    );
    const authoredProps = [
      ...customJsxAuthoringCatalog.globalProps,
      ...customJsxAuthoringCatalog.components.flatMap(({ props }) => props),
    ];
    expect(authoredProps.some(({ name }) => /^on/iu.test(name))).toBe(false);
    expect(authoredProps.some(({ name }) => name === "dangerouslySetInnerHTML")).toBe(false);
  });

  test("stays within the reviewed compact byte budget", async () => {
    const catalog = await readFile(catalogPath);
    expect(catalog.byteLength).toBeLessThanOrEqual(MAX_CATALOG_BYTES);
  });

  test("publishes a byte-identical static documentation copy", async () => {
    const [catalog, publicCatalog] = await Promise.all([readFile(catalogPath), readFile(publicCatalogPath)]);
    expect(publicCatalog.equals(catalog)).toBe(true);
  });
});

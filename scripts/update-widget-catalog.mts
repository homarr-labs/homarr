import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { z } from "zod/v4";

import type { WidgetDefinition } from "../packages/widgets/src/definition";
import type { WidgetImports } from "../packages/widgets/src/registry";
import type { WidgetOptionDefinition } from "../packages/widgets/src/options";

type Schema = Record<string, unknown>;
const choiceValue = (option: string | { value: string }) => {
  if (typeof option === "string") return option;
  return option.value;
};
function optionSchema(option: WidgetOptionDefinition): Schema {
  if ("validate" in option && option.validate) {
    let validator = option.validate;
    if (option.type === "multiText") validator = z.array(validator);
    const schema = z.toJSONSchema(validator, { io: "input", unrepresentable: "any" });
    delete schema.$schema;
    return schema;
  }
  if (option.type === "switch") return { type: "boolean" };
  if (option.type === "select") return { type: "string", enum: option.options.map(choiceValue) };
  if (option.type === "multiSelect")
    return { type: "array", items: { type: "string", enum: option.options.map(choiceValue) } };
  if (option.type === "dynamicSelect")
    return {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          properties: { value: { type: "string" }, label: { type: "string" } },
          required: ["value", "label"],
          additionalProperties: true,
        },
      ],
    };
  if (option.type === "customWidgetConfiguration") return { type: "object", additionalProperties: true };
  if (Array.isArray(option.defaultValue)) return { type: "array", items: { type: "string" } };
  if (typeof option.defaultValue === "number") return { type: "number" };
  if (typeof option.defaultValue === "string") return { type: "string" };
  throw new Error(`Missing catalog schema for option type ${option.type}`);
}

// Load definitions only while generating. Components and dynamic choice hooks are never run,
// and the API consumes JSON without importing widget/UI packages at runtime.
const server = await createServer({
  configFile: false,
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  server: { middlewareMode: true, ws: false, hmr: false, watch: null },
  appType: "custom",
  optimizeDeps: { noDiscovery: true },
  logLevel: "error",
});
try {
  const { widgetModuleLoaders } = (await server.ssrLoadModule("/packages/widgets/src/registry.ts")) as {
    widgetModuleLoaders: { [TKind in keyof WidgetImports]: () => Promise<{ definition: WidgetDefinition }> };
  };
  const catalog: Record<string, unknown> = {};
  let optionCount = 0;
  for (const [kind, load] of Object.entries(widgetModuleLoaders)) {
    const { definition } = await load();
    const options = definition.createOptions({ enableStatusByDefault: true, forceDisableStatus: false });
    const serialized: Record<string, unknown> = {};
    for (const [key, option] of Object.entries(options)) {
      const schema = optionSchema(option);
      const details: Record<string, unknown> = { type: option.type, defaultValue: option.defaultValue, schema };
      for (const field of ["step", "storedUnit", "maxValues", "presets"] as const) {
        if (field in option) details[field] = option[field as keyof typeof option];
      }
      if ("options" in option) details.choices = option.options.map(choiceValue);
      if ("timeZoneOptions" in option) details.timeZones = option.timeZoneOptions.map((entry) => entry.value);
      if (kind === "releases" && key === "repositories") {
        // Both default factories generate a new ID at runtime. Avoid freezing an arbitrary ID
        // into the catalog or making regeneration depend on random values.
        details.defaultValue = (option.defaultValue as { id: string }[]).map((entry) => ({ ...entry, id: "" }));
        details.generatedDefaultIds = true;
        const item = schema.items as { properties?: { id?: Schema } } | undefined;
        if (item?.properties?.id) delete item.properties.id.default;
      }
      serialized[key] = details;
      optionCount++;
    }
    catalog[kind] = { options: serialized };
  }
  assert.equal(Object.keys(catalog).length, Object.keys(widgetModuleLoaders).length);
  const serialized = `${JSON.stringify(catalog, null, 2)}\n`;
  const destination = "packages/api/src/rest/widget-catalog.json";
  if (process.argv.includes("--write")) await writeFile(destination, serialized);
  else
    assert.equal(
      await readFile(destination, "utf8"),
      serialized,
      "Widget catalog is stale; run pnpm scripts:update-widget-catalog",
    );
  console.log(`Widget catalog verified: ${Object.keys(catalog).length} kinds, ${optionCount} options`);
} finally {
  await server.close();
}
process.exit(0);

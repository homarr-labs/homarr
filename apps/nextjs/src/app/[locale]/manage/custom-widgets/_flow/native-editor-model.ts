import { customWidgetDefinitionSchema, customWidgetIdentifierSchema } from "@homarr/custom-widgets/core";
import { isRecord } from "@homarr/common";
import { collectTemplateReferences } from "@homarr/custom-widgets/workbench";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

export type NativeInputSchema = Record<string, unknown>;

export function nativeInputFields(schema: NativeInputSchema) {
  if (!isRecord(schema.properties)) return [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  return Object.entries(schema.properties).map(([name, value]) => ({
    name,
    schema: isRecord(value) ? value : {},
    required: required.includes(name),
  }));
}

export function nativeLiteralDefault(schema: NativeInputSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (schema.type === "boolean") return false;
  if (schema.type === "number" || schema.type === "integer") return schema.minimum ?? 0;
  if (schema.type === "array") return [];
  if (schema.type === "object") return {};
  return "";
}

export function isCompatibleNativeOption(option: unknown, schema: NativeInputSchema): boolean {
  if (!isRecord(option) || option.control === "integration") return false;
  const value = option.default;
  if (schema.type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (["string", "number", "boolean"].includes(String(schema.type))) return typeof value === schema.type;
  if (schema.type === "object") return isRecord(value);
  if (schema.type !== "array") return true;
  if (!Array.isArray(value)) return false;
  if (!isRecord(schema.items)) return true;
  const type = schema.items.type;
  if (type === "integer") return value.every((entry) => typeof entry === "number" && Number.isInteger(entry));
  if (["string", "number", "boolean"].includes(String(type))) return value.every((entry) => typeof entry === type);
  return true;
}

/** Match parameter references to their field schema without storing execution values in the draft. */
export function nativeParameterFields(input: unknown, schema: NativeInputSchema) {
  const fields = new Map<string, NativeInputSchema>();
  const visit = (value: unknown, current: NativeInputSchema) => {
    if (Array.isArray(value)) {
      const item = isRecord(current.items) ? current.items : {};
      value.forEach((entry) => visit(entry, item));
      return;
    }
    if (!isRecord(value)) return;
    if (typeof value.$param === "string") {
      fields.set(value.$param, current);
      return;
    }
    const properties = isRecord(current.properties) ? current.properties : {};
    for (const [key, child] of Object.entries(value)) {
      visit(child, isRecord(properties[key]) ? properties[key] : {});
    }
  };
  visit(input, schema);
  return [...fields].map(([name, fieldSchema]) => ({ name, schema: fieldSchema }));
}

export function renameNativeCapability(definition: HomarrCustomWidgetV2, currentId: string, nextId: string) {
  customWidgetIdentifierSchema.parse(nextId);
  const native = definition.extensions?.native;
  if (!native?.[currentId]) throw new Error(`Unknown capability '${currentId}'`);
  if (nextId !== currentId && (native[nextId] || definition.requests[nextId])) {
    throw new Error(`Request or capability '${nextId}' already exists`);
  }
  const rewrite = (template: string) => {
    const references = collectTemplateReferences(template)
      .filter((entry) => entry.name === currentId && ["native", "data", "status"].includes(entry.kind))
      .toSorted((left, right) => right.from - left.from);
    let result = template;
    for (const reference of references) {
      const original = template.slice(reference.from, reference.to);
      let from = reference.from;
      let replacement = nextId;
      if (original.startsWith('"')) replacement = JSON.stringify(nextId);
      else if (original.startsWith("'")) replacement = `'${nextId}'`;
      else if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(nextId)) {
        if (template[from - 1] !== ".") throw new Error("Use bracket notation in code before renaming this reference.");
        if (template[from - 2] !== "?") from -= 1;
        replacement = `[${JSON.stringify(nextId)}]`;
      }
      result = result.slice(0, from) + replacement + result.slice(reference.to);
    }
    return result;
  };
  return customWidgetDefinitionSchema.parse({
    ...definition,
    template: rewrite(definition.template),
    extensions: {
      ...definition.extensions,
      native: Object.fromEntries(Object.entries(native).map(([id, entry]) => [id === currentId ? nextId : id, entry])),
      fragments:
        definition.extensions?.fragments &&
        Object.fromEntries(
          Object.entries(definition.extensions.fragments).map(([id, template]) => [id, rewrite(template)]),
        ),
    },
  });
}

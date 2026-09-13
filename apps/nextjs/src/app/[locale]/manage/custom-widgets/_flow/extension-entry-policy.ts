import { customWidgetIdentifierSchema } from "@homarr/custom-widgets/core";
import { validateCustomJsxTemplate } from "@homarr/custom-widgets/jsx/analyzer";
import { collectTemplateReferences } from "@homarr/custom-widgets/workbench";
import { isRecord, parseJson } from "../_custom-widget-form-utils";

export type ExtensionEntryKind = "fragment" | "preference" | "content";
export const extensionCollection = { fragment: "fragments", preference: "preferences", content: "content" } as const;

export function readExtensionCollection(raw: string, kind: ExtensionEntryKind) {
  const extensions = parseJson(raw || "{}");
  if (!isRecord(extensions)) return null;
  const value = extensions[extensionCollection[kind]];
  if (value !== undefined && !isRecord(value)) return null;
  return { extensions, entries: value ?? {} };
}

export function validExtensionEntryName(name: string, entries: Record<string, unknown>) {
  return (
    customWidgetIdentifierSchema.safeParse(name).success &&
    !["constructor", "prototype"].includes(name) &&
    !Object.hasOwn(entries, name)
  );
}

/** An incomplete template cannot prove an entry is unused, so deletion stays conservative. */
export function extensionEntryDependants(template: string, fragments: unknown, kind: ExtensionEntryKind, name: string) {
  const templates: [string, unknown][] = [["widget", template]];
  if (isRecord(fragments)) {
    for (const [id, jsx] of Object.entries(fragments)) {
      if (kind !== "fragment" || id !== name) templates.push([`fragment:${id}`, jsx]);
    }
  } else if (fragments !== undefined) return { invalid: true, nodes: [] as string[] };
  const nodes = new Set<string>();
  for (const [id, jsx] of templates) {
    if (typeof jsx !== "string" || validateCustomJsxTemplate(jsx).some((issue) => issue.severity === "error"))
      return { invalid: true, nodes: [...nodes] };
    if (
      collectTemplateReferences(jsx).some(
        (reference) => reference.kind === kind && (reference.name === name || reference.name === "*"),
      )
    )
      nodes.add(id);
  }
  return { invalid: false, nodes: [...nodes] };
}

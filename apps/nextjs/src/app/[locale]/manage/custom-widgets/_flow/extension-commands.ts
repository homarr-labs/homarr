import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { readObject } from "./graph";
import type { WidgetNode } from "./graph";
import { freshFlowIdentifier } from "./identifiers";

const fields = { fragment: "fragments", preference: "preferences", content: "content", native: "native" } as const;
export function isExtensionKind(kind: string): kind is keyof typeof fields {
  return Object.hasOwn(fields, kind);
}
function collection(extensions: Record<string, unknown>, field: string): Record<string, unknown> | null {
  const value = extensions[field];
  if (value === undefined) return {};
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}
export function createExtensionCommands(form: CustomWidgetWorkbenchForm) {
  const write = (extensions: Record<string, unknown>) =>
    form.setFieldValue("extensions", JSON.stringify(extensions, null, 2));
  return {
    add(kind: keyof typeof fields) {
      if (kind === "native") return "native:new";
      const extensions = readObject(form.values.extensions);
      const field = fields[kind];
      const entries = collection(extensions, field);
      if (!entries) return `${kind}:new`;
      let limit = 32;
      if (kind === "preference") limit = 64;
      if (Object.keys(entries).length >= limit) return `${kind}:new`;
      const key = freshFlowIdentifier(entries, kind);
      let value: unknown = { type: "string", defaultValue: "" };
      if (kind === "fragment") value = "<Stack />";
      if (kind === "content") value = { type: "string", defaultValue: "", permission: "modify" };
      write({ ...extensions, [field]: { ...entries, [key]: value } });
      return `${kind}:${key}`;
    },
    duplicate(node: WidgetNode) {
      if (!isExtensionKind(node.data.kind)) return node.id;
      const extensions = readObject(form.values.extensions);
      const field = fields[node.data.kind];
      const entries = collection(extensions, field);
      if (!entries || !Object.hasOwn(entries, node.data.identifier)) return node.id;
      let limit = 32;
      if (node.data.kind === "preference" || node.data.kind === "native") limit = 64;
      if (Object.keys(entries).length >= limit) return node.id;
      let identifiers = entries;
      if (node.data.kind === "native") identifiers = { ...entries, ...readObject(form.values.requests) };
      const key = freshFlowIdentifier(identifiers, `${node.data.identifier}Copy`);
      write({ ...extensions, [field]: { ...entries, [key]: structuredClone(entries[node.data.identifier]) } });
      return `${node.data.kind}:${key}`;
    },
    remove(nodes: WidgetNode[]) {
      const selected = nodes.filter((node) => isExtensionKind(node.data.kind));
      if (!selected.length) return;
      const extensions = readObject(form.values.extensions);
      for (const node of selected) {
        if (!isExtensionKind(node.data.kind)) continue;
        const field = fields[node.data.kind];
        const existing = collection(extensions, field);
        if (!existing) return;
        const entries = { ...existing };
        delete entries[node.data.identifier];
        extensions[field] = entries;
      }
      write(extensions);
    },
  };
}

import type { Edge, Node } from "@xyflow/react";
import { collectCustomWidgetRequestReferences } from "@homarr/custom-widgets/core";
import type { CustomWidgetEditorLayout, CustomJsxRequest } from "@homarr/custom-widgets/core";
import { collectGeneratedBindings, collectTemplateReferences } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

export type FlowKind =
  | "source"
  | "query"
  | "action"
  | "options"
  | "widget"
  | "group"
  | "native"
  | "fragment"
  | "preference"
  | "content";
export interface WidgetNodeData extends Record<string, unknown> {
  kind: FlowKind;
  identifier: string;
  label: string;
  summary: string;
}
export type WidgetNode = Node<WidgetNodeData, "widget" | "preview" | "group">;
export type WidgetEdge = Edge<{
  relationship: "source" | "data" | "invoke" | "invalidates" | "option" | "composition" | "preference" | "content";
  generatedBindingIds?: string[];
}>;
type Relationship = NonNullable<WidgetEdge["data"]>["relationship"];
export function readObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    /* Preserve invalid JSON in the inspector. */
  }
  return {};
}
export function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}
const colors = {
  source: "var(--mantine-color-blue-6)",
  data: "var(--mantine-color-teal-6)",
  invoke: "var(--mantine-color-orange-6)",
  invalidates: "var(--mantine-color-grape-6)",
  option: "var(--mantine-color-gray-6)",
  composition: "var(--mantine-color-pink-6)",
  preference: "var(--mantine-color-yellow-6)",
  content: "var(--mantine-color-cyan-6)",
};

export function projectWidgetGraph(values: CustomWidgetFormValues, layout: CustomWidgetEditorLayout) {
  const nodes: WidgetNode[] = [];
  const edges: WidgetEdge[] = [];
  const generatedEdges = new Map<string, Set<string> | null>();
  for (const [id, group] of Object.entries(layout.groups)) {
    const position = layout.nodes[id] ?? { x: 0, y: 0 };
    nodes.push({
      id,
      type: "group",
      position: { x: position.x, y: position.y },
      style: { width: group.width, height: group.height },
      data: { kind: "group", identifier: id, label: group.title, summary: "" },
    });
  }
  const addNode = (
    id: string,
    kind: FlowKind,
    identifier: string,
    label: string,
    summary: string,
    x: number,
    y: number,
  ) => {
    const position = layout.nodes[id] ?? { x, y };
    nodes.push({
      id,
      type: kind === "widget" ? "preview" : "widget",
      ariaLabel: label,
      position: { x: position.x, y: position.y },
      parentId: position.parentId && layout.groups[position.parentId] ? position.parentId : undefined,
      dragHandle: ".widget-node-drag",
      data: { kind, identifier, label, summary },
    });
  };
  const addEdge = (source: string, target: string, relationship: Relationship, bindingId?: string) => {
    const id = `${source}:${relationship}:${target}`;
    if (!bindingId) generatedEdges.set(id, null);
    else if (!generatedEdges.has(id)) generatedEdges.set(id, new Set([bindingId]));
    else generatedEdges.get(id)?.add(bindingId);
    if (edges.some((edge) => edge.id === id)) return;
    edges.push({
      id,
      source,
      target,
      sourceHandle: "out",
      targetHandle: "in",
      data: { relationship },
      reconnectable: relationship === "source" ? "source" : relationship === "invalidates",
      deletable: relationship === "invalidates",
      style: {
        stroke: colors[relationship],
        strokeWidth: 1.5,
        strokeDasharray: relationship === "invalidates" ? "5 5" : undefined,
      },
    });
  };
  Object.entries(readObject(values.sources)).forEach(([id, source], index) => {
    const value = record(source);
    addNode(`source:${id}`, "source", id, String(value.name ?? id), String(value.baseUrl ?? ""), 0, index * 145);
  });
  const requests = readObject(values.requests);
  const extensions = readObject(values.extensions ?? "{}");
  const native = record(extensions.native);
  const requestNode = (id: string) => (Object.hasOwn(native, id) ? `native:${id}` : `request:${id}`);
  Object.entries(requests).forEach(([id, raw], index) => {
    const request = record(raw);
    const kind = request.kind === "action" ? "action" : "query";
    addNode(
      `request:${id}`,
      kind,
      id,
      id,
      `${String(request.method ?? "GET")} ${String(request.path ?? "")}`,
      340,
      index * 130,
    );
    addEdge(`source:${String(request.source ?? "default")}`, `request:${id}`, "source");
    if (Array.isArray(request.invalidates))
      for (const target of request.invalidates) {
        if (typeof target === "string") addEdge(`request:${id}`, `request:${target}`, "invalidates");
      }
    if (typeof request.path === "string") {
      const references = collectCustomWidgetRequestReferences(
        request as Pick<CustomJsxRequest, "path" | "query" | "body">,
      );
      if (references.options.size) addEdge("options", `request:${id}`, "option");
    }
  });
  Object.entries(native).forEach(([id, raw], index) => {
    const capability = record(raw);
    addNode(
      `native:${id}`,
      "native",
      id,
      id,
      String(capability.capability ?? ""),
      340,
      (Object.keys(requests).length + index) * 130,
    );
    const references = collectCustomWidgetRequestReferences({ path: "", query: record(capability.input) });
    if (references.options.size || capability.integrationOption) addEdge("options", `native:${id}`, "option");
  });
  const parsedOptions = readObject(values.options);
  const optionNames = Object.keys(parsedOptions);
  for (const option of Object.values(parsedOptions)) {
    const requestId = record(record(option).choicesFrom).request;
    if (typeof requestId === "string") addEdge(requestNode(requestId), "options", "data");
  }
  if (optionNames.length)
    addNode("options", "options", "options", "options", optionNames.join(", "), 0, nodes.length * 80 + 100);
  for (const [id, value] of Object.entries(record(extensions.preferences)))
    addNode(`preference:${id}`, "preference", id, id, String(record(value).type ?? ""), 0, nodes.length * 130);
  for (const [id, value] of Object.entries(record(extensions.content)))
    addNode(
      `content:${id}`,
      "content",
      id,
      id,
      `${String(record(value).type ?? "")} · ${String(record(value).permission ?? "")}`,
      0,
      nodes.length * 130,
    );
  const fragments = Object.entries(record(extensions.fragments)).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  fragments.forEach(([id], index) => addNode(`fragment:${id}`, "fragment", id, id, "JSX", 700, 260 + index * 130));
  addNode("widget", "widget", "widget", values.name, "JSX", 700, 100);
  const templates = [
    ["widget", values.template],
    ...fragments.map(([id, source]) => [`fragment:${id}`, source]),
  ] as const;
  for (const [consumer, template] of templates) {
    if (!consumer || template === undefined) continue;
    const bindings =
      consumer === "widget"
        ? collectGeneratedBindings(
            template,
            fragments.map(([, source]) => source),
          )
        : [];
    for (const ref of collectTemplateReferences(template)) {
      const addReference = (source: string, target: string, relationship: Relationship) => {
        const binding = bindings.find(
          (entry) =>
            entry.source === source &&
            entry.target === target &&
            entry.relationship === relationship &&
            ref.from >= entry.contentFrom &&
            ref.to <= entry.contentTo,
        );
        addEdge(source, target, relationship, binding?.id);
      };
      if (ref.kind === "data" || ref.kind === "status") addReference(requestNode(ref.name), consumer, "data");
      if (ref.kind === "request") addReference(consumer, requestNode(ref.name), "invoke");
      if (ref.kind === "native") {
        const descriptor = record(native[ref.name]);
        if (descriptor.kind === "action") addReference(consumer, `native:${ref.name}`, "invoke");
        else addReference(`native:${ref.name}`, consumer, "data");
      }
      if (ref.kind === "options") addReference("options", consumer, "option");
      if (["fragment", "preference", "content"].includes(ref.kind)) {
        const referenced = nodes.filter(
          (node) => node.data.kind === ref.kind && (ref.name === "*" || node.data.identifier === ref.name),
        );
        for (const target of referenced) {
          if (ref.kind === "fragment") addReference(target.id, consumer, "composition");
          if (ref.kind === "preference") addReference(target.id, consumer, "preference");
          if (ref.kind === "content") addReference(target.id, consumer, "content");
        }
      }
    }
  }
  for (const edge of edges) {
    const bindings = generatedEdges.get(edge.id);
    if (!edge.data || !bindings?.size) continue;
    edge.data.generatedBindingIds = [...bindings];
    edge.deletable = true;
    edge.reconnectable = edge.data.relationship === "invoke" ? "target" : "source";
  }
  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, edges: edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
}

export async function arrangeWidgetGraph(nodes: WidgetNode[], edges: WidgetEdge[], preserveAnchor = false) {
  const engine = await import("./layout-engine");
  return engine.arrangeWidgetGraph(nodes, edges, preserveAnchor);
}

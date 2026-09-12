import type { Connection } from "@xyflow/react";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { projectWidgetGraph, readObject, record } from "./graph";
import type { WidgetNode } from "./graph";

export interface FlowBindingIntent {
  kind: "query" | "action" | "option" | "requestOption";
  source: string;
  target: string;
  identifier: string;
  native: boolean;
  replaceGeneratedIds?: string[];
  replaceEdgeId?: string;
  snapshot: Pick<CustomWidgetFormValues, "template" | "requests" | "options" | "extensions">;
}

export function connectionIssue(connection: Pick<Connection, "source" | "target">, nodes: WidgetNode[]) {
  const source = nodes.find((entry) => entry.id === connection.source);
  const target = nodes.find((entry) => entry.id === connection.target);
  if (!source || !target) return "missing";
  if (source.data.kind === "widget" && ["query", "action", "native"].includes(target.data.kind)) return null;
  if (source.data.kind === "source" && ["query", "action"].includes(target.data.kind)) return null;
  if (source.data.kind === "action" && target.data.kind === "query") return null;
  if (["query", "action", "native", "options"].includes(source.data.kind) && target.data.kind === "widget") return null;
  if (source.data.kind === "options" && ["query", "action", "native"].includes(target.data.kind)) return null;
  return "codeOwned";
}

export function planFlowConnection(
  connection: Pick<Connection, "source" | "target">,
  nodes: WidgetNode[],
  values: CustomWidgetFormValues,
): FlowBindingIntent | "direct" | "missing" | "codeOwned" {
  const issue = connectionIssue(connection, nodes);
  if (issue) return issue;
  const source = nodes.find((entry) => entry.id === connection.source);
  const target = nodes.find((entry) => entry.id === connection.target);
  if (!source || !target) return "missing";
  if (source.data.kind === "widget") return planFlowConnection({ source: target.id, target: source.id }, nodes, values);
  if (source.data.kind === "source" || (source.data.kind === "action" && target.data.kind === "query")) return "direct";
  let kind: FlowBindingIntent["kind"] = "query";
  let identifier = source.data.identifier;
  let native = source.data.kind === "native";
  if (source.data.kind === "options") {
    kind = "option";
    if (target.data.kind !== "widget") {
      kind = "requestOption";
      identifier = target.data.identifier;
      native = target.data.kind === "native";
    }
  } else if (source.data.kind === "action") kind = "action";
  else if (native && record(record(readObject(values.extensions).native)[identifier]).kind === "action")
    kind = "action";
  return {
    kind,
    source: source.id,
    target: target.id,
    identifier,
    native,
    snapshot: {
      template: values.template,
      requests: values.requests,
      options: values.options,
      extensions: values.extensions,
    },
  };
}

export function isFlowBindingCurrent(intent: FlowBindingIntent, values: CustomWidgetFormValues) {
  return Object.entries(intent.snapshot).every(([key, value]) => values[key as keyof typeof intent.snapshot] === value);
}

/** Deferred graph props cannot authorize removal after a newer authored reference was added. */
export function isGeneratedConnectionCurrent(
  values: CustomWidgetFormValues,
  edgeId: string | undefined,
  ids: readonly string[],
) {
  const current = projectWidgetGraph(values, { version: 1, nodes: {}, groups: {} }).edges.find(
    (edge) => edge.id === edgeId,
  )?.data?.generatedBindingIds;
  return !!current?.length && current.length === ids.length && current.every((id) => ids.includes(id));
}

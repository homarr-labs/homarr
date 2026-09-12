import type { Connection } from "@xyflow/react";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { removeGeneratedBindings } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { buildDefinition } from "../_custom-widget-form-utils";
import { readObject, record } from "./graph";
import type { FlowKind, WidgetNode, WidgetEdge } from "./graph";
import { freshFlowIdentifier as fresh } from "./identifiers";
import { createExtensionCommands, isExtensionKind } from "./extension-commands";
import { connectionIssue, isGeneratedConnectionCurrent, planFlowConnection } from "./connection-planner";
export { connectionIssue } from "./connection-planner";

export function isGraphEditable(
  values: Pick<CustomWidgetFormValues, "sources" | "requests" | "options" | "extensions">,
) {
  return [values.sources, values.requests, values.options, values.extensions || "{}"].every((value) => {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
    } catch {
      return false;
    }
  });
}

export function createFlowCommands(form: CustomWidgetWorkbenchForm, store: CustomWidgetFormDocumentStore) {
  const extensionCommands = createExtensionCommands(form);
  const write = (field: "sources" | "requests" | "options", value: Record<string, unknown>) =>
    form.setFieldValue(field, JSON.stringify(value, null, 2));
  const disconnect = (edge: WidgetEdge) => {
    if (!isGraphEditable(form.values)) return "invalidGraphJson";
    if (edge.data?.generatedBindingIds?.length) {
      if (!isGeneratedConnectionCurrent(store.getValues(), edge.id, edge.data.generatedBindingIds)) return "codeOwned";
      const fragments = Object.values(record(readObject(store.getValues().extensions).fragments)).filter(
        (value): value is string => typeof value === "string",
      );
      const template = removeGeneratedBindings(store.getValues().template, edge.data.generatedBindingIds, fragments);
      if (template === null || !buildDefinition({ ...store.getValues(), template }).success) return "codeOwned";
      form.setFieldValue("template", template);
      return null;
    }
    if (edge.data?.relationship !== "invalidates") return "codeOwned";
    const requests = readObject(form.values.requests);
    const source = edge.source.replace(/^request:/u, "");
    const target = edge.target.replace(/^request:/u, "");
    const request = record(requests[source]);
    if (!Array.isArray(request.invalidates)) return null;
    write("requests", {
      ...requests,
      [source]: { ...request, invalidates: request.invalidates.filter((entry) => entry !== target) },
    });
    return null;
  };
  const connect = (connection: Connection, nodes: WidgetNode[]) => {
    if (!isGraphEditable(form.values)) return "invalidGraphJson";
    const issue = connectionIssue(connection, nodes);
    if (issue) return issue;
    if (planFlowConnection(connection, nodes, form.values) !== "direct") return "bindingRequired";
    const source = nodes.find((node) => node.id === connection.source);
    const target = nodes.find((node) => node.id === connection.target);
    if (!source || !target) return "missing";
    const requests = readObject(form.values.requests);
    if (source.data.kind === "source") {
      write("requests", {
        ...requests,
        [target.data.identifier]: { ...record(requests[target.data.identifier]), source: source.data.identifier },
      });
    } else {
      const request = record(requests[source.data.identifier]);
      const invalidates = Array.isArray(request.invalidates) ? request.invalidates : [];
      write("requests", {
        ...requests,
        [source.data.identifier]: { ...request, invalidates: [...new Set([...invalidates, target.data.identifier])] },
      });
    }
    return null;
  };
  return {
    add(kind: FlowKind, preferredSource?: string) {
      if (!isGraphEditable(form.values)) return "widget";
      let id = "widget";
      store.transaction(() => {
        if (isExtensionKind(kind)) {
          id = extensionCommands.add(kind);
          return;
        }
        if (kind === "source") {
          const sources = readObject(form.values.sources);
          const key = fresh(sources, "source");
          write("sources", {
            ...sources,
            [key]: { baseUrl: "http://service:8080", networkScope: "private", auth: "none" },
          });
          id = `source:${key}`;
        } else if (kind === "query" || kind === "action") {
          const sources = readObject(form.values.sources);
          let source = Object.keys(sources)[0];
          if (preferredSource && sources[preferredSource]) source = preferredSource;
          if (!source) {
            source = "default";
            write("sources", { default: { baseUrl: "http://service:8080", networkScope: "private", auth: "none" } });
          }
          const requests = readObject(form.values.requests);
          const key = fresh({ ...requests, ...record(readObject(form.values.extensions).native) }, kind);
          let trigger = "load";
          if (kind === "action") trigger = "manual";
          write("requests", { ...requests, [key]: { source, path: "/api/data", kind, method: "GET", trigger } });
          id = `request:${key}`;
        } else if (kind === "options") {
          const options = readObject(form.values.options);
          const key = fresh(options, "option");
          write("options", { ...options, [key]: { control: "text", label: key, default: "" } });
          id = "options";
        }
      });
      return id;
    },
    connect,
    disconnect,
    reconnect(edge: WidgetEdge, connection: Connection, nodes: WidgetNode[]) {
      if (!isGraphEditable(form.values)) return "invalidGraphJson";
      const issue = connectionIssue(connection, nodes);
      if (issue) return issue;
      if (planFlowConnection(connection, nodes, form.values) !== "direct") return "codeOwned";
      const source = nodes.find((node) => node.id === connection.source);
      if (edge.data?.relationship === "source" && (edge.target !== connection.target || source?.data.kind !== "source"))
        return "codeOwned";
      if (edge.data?.relationship === "invalidates" && source?.data.kind !== "action") return "codeOwned";
      if (!["source", "invalidates"].includes(edge.data?.relationship ?? "")) return "codeOwned";
      store.transaction(() => {
        if (edge.data?.relationship === "invalidates") disconnect(edge);
        connect(connection, nodes);
      });
      return null;
    },
    duplicate(node: WidgetNode) {
      if (!isGraphEditable(form.values)) return node.id;
      if (isExtensionKind(node.data.kind)) return extensionCommands.duplicate(node);
      let field: "sources" | "requests" = "requests";
      let prefix = "request";
      if (node.data.kind === "source") {
        field = "sources";
        prefix = "source";
      }
      if (!["source", "query", "action"].includes(node.data.kind)) return node.id;
      const entries = readObject(form.values[field]);
      let identifiers = entries;
      if (field === "requests") identifiers = { ...entries, ...record(readObject(form.values.extensions).native) };
      const key = fresh(identifiers, `${node.data.identifier}Copy`);
      const copy = structuredClone(record(entries[node.data.identifier]));
      if (Array.isArray(copy.invalidates))
        copy.invalidates = copy.invalidates.map((id) => (id === node.data.identifier ? key : id));
      write(field, { ...entries, [key]: copy });
      return `${prefix}:${key}`;
    },
    remove(nodes: WidgetNode[]) {
      if (nodes.every((node) => node.data.kind === "group")) return;
      if (!isGraphEditable(form.values)) return;
      store.transaction(() => {
        const sources = readObject(form.values.sources);
        const requests = readObject(form.values.requests);
        let options = readObject(form.values.options);
        const layout = structuredClone(store.getLayout());
        for (const node of nodes) {
          if (node.data.kind === "source") delete sources[node.data.identifier];
          if (["query", "action"].includes(node.data.kind)) delete requests[node.data.identifier];
          if (node.data.kind === "options") options = {};
          delete layout.nodes[node.id];
          delete layout.groups[node.id];
        }
        form.setValues({
          ...form.values,
          sources: JSON.stringify(sources, null, 2),
          requests: JSON.stringify(requests, null, 2),
          options: JSON.stringify(options, null, 2),
          extensions: form.values.extensions,
        });
        extensionCommands.remove(nodes);
        store.setLayout(layout);
      });
    },
  };
}

import type { CustomWidgetEditorLayout } from "@homarr/custom-widgets/core";

export function renameDefinitionBinding(bindings: Record<string, string>, previousId: string, nextId: string) {
  const identity = bindings[previousId];
  if (!identity || previousId === nextId) return bindings;
  const { [previousId]: _previous, ...rest } = bindings;
  return { ...rest, [nextId]: identity };
}

export function renameEditorNode(layout: CustomWidgetEditorLayout, previousId: string, nextId: string) {
  const entry = layout.nodes[previousId];
  if (previousId === nextId || !entry) return layout;
  const { [previousId]: _previous, ...nodes } = layout.nodes;
  return { ...layout, nodes: { ...nodes, [nextId]: entry } };
}

export function getNodeRenames(previous: Record<string, string>, next: Record<string, string>, prefix: string) {
  const names = new Map(Object.entries(next).map(([name, identity]) => [identity, name]));
  return Object.fromEntries(
    Object.entries(previous).flatMap(([name, identity]) => {
      const nextName = names.get(identity);
      if (!nextName || nextName === name) return [];
      return [[`${prefix}:${name}`, `${prefix}:${nextName}`]];
    }),
  );
}

export function remapWorkbenchSelection(ids: string[], renames: Readonly<Record<string, string>>) {
  if (!ids.some((id) => Object.hasOwn(renames, id))) return ids;
  return ids.map((id) => renames[id] ?? id);
}

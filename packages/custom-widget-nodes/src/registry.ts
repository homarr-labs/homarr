import type { NodeTypeDefinition } from "./types";

const nodeTypeRegistry = new Map<string, NodeTypeDefinition>();

export const registerNodeType = <TData>(definition: NodeTypeDefinition<TData>) => {
  nodeTypeRegistry.set(definition.type, definition as NodeTypeDefinition);
};

export const getNodeType = (type: string): NodeTypeDefinition | undefined => {
  return nodeTypeRegistry.get(type);
};

export const getAllNodeTypes = (): NodeTypeDefinition[] => {
  return Array.from(nodeTypeRegistry.values());
};

export const getNodeTypesByCategory = (category: NodeTypeDefinition["category"]): NodeTypeDefinition[] => {
  return getAllNodeTypes().filter((n) => n.category === category);
};

import { parseCustomJsxTemplate } from "../jsx/interpreter-parser";

export interface TemplateReference {
  kind:
    | "data"
    | "status"
    | "options"
    | "inputs"
    | "request"
    | "native"
    | "bind"
    | "fragment"
    | "preference"
    | "content";
  name: string;
  from: number;
  to: number;
}

type Node = Record<string, unknown>;
function node(value: unknown): Node | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Node;
  return undefined;
}
function literal(value: unknown) {
  const current = node(value);
  if (current?.type === "JSXExpressionContainer") return node(current.expression);
  return current;
}
const rootKinds = {
  data: "data",
  status: "status",
  options: "options",
  inputs: "inputs",
  preferences: "preference",
  content: "content",
  contentStatus: "content",
} as const;

/** Parse references without touching authored whitespace, comments or expressions. */
export function collectTemplateReferences(template: string): TemplateReference[] {
  const result: TemplateReference[] = [];
  const visit = (value: unknown, shadowed: Set<string>) => {
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, shadowed));
      return;
    }
    const current = node(value);
    if (!current) return;
    let scope = shadowed;
    if (current.type === "ArrowFunctionExpression") {
      scope = new Set(shadowed);
      for (const param of (current.params ?? []) as unknown[]) {
        const name = node(param)?.name;
        if (typeof name === "string") scope.add(name);
      }
    }
    const object = node(current.object);
    const property = node(current.property);
    const root = object?.name;
    if (
      current.type === "MemberExpression" &&
      typeof root === "string" &&
      !scope.has(root) &&
      Object.hasOwn(rootKinds, root)
    ) {
      const name = current.computed ? property?.value : property?.name;
      if (typeof name === "string" && property)
        result.push({
          kind: rootKinds[root as keyof typeof rootKinds],
          name,
          from: Number(property.start) - 2,
          to: Number(property.end) - 2,
        });
      else if (current.computed && property && ["preferences", "content", "contentStatus"].includes(root))
        result.push({
          kind: rootKinds[root as keyof typeof rootKinds],
          name: "*",
          from: Number(property.start) - 2,
          to: Number(property.end) - 2,
        });
    }
    if (current.type === "JSXOpeningElement") {
      const tag = node(current.name)?.name;
      const attributes = (current.attributes as unknown[]).map(node).filter((attribute) => !!attribute);
      const bound = attributes.some((attribute) => node(attribute.name)?.name === "bind");
      for (const attribute of attributes) {
        const name = node(attribute.name)?.name;
        const attributeValue = literal(attribute.value);
        if (!attributeValue) continue;
        let kind: TemplateReference["kind"] | undefined;
        if (name === "name" && tag === "View") kind = "fragment";
        if (name === "name" && (tag === "ContentSaveButton" || tag === "ContentResetButton")) kind = "content";
        if (bound && name === "persist") kind = "preference";
        if (bound && name === "content") kind = "content";
        if (kind)
          result.push({
            kind,
            name: typeof attributeValue.value === "string" ? attributeValue.value : "*",
            from: Number(attributeValue.start) - 2,
            to: Number(attributeValue.end) - 2,
          });
      }
    }
    if (current.type === "JSXAttribute") {
      const name = node(current.name)?.name;
      let attributeLiteral = node(current.value);
      if (attributeLiteral?.type === "JSXExpressionContainer") attributeLiteral = node(attributeLiteral.expression);
      if (
        (name === "requestId" || name === "nativeId" || name === "bind") &&
        typeof attributeLiteral?.value === "string"
      ) {
        result.push({
          kind: name === "bind" ? "bind" : name === "nativeId" ? "native" : "request",
          name: attributeLiteral.value,
          from: Number(attributeLiteral.start) - 2,
          to: Number(attributeLiteral.end) - 2,
        });
      }
    }
    for (const [key, child] of Object.entries(current)) {
      if (key !== "loc") visit(child, scope);
    }
  };
  try {
    visit(parseCustomJsxTemplate(template), new Set());
  } catch {
    /* Invalid drafts keep their source intact. */
  }
  return result;
}

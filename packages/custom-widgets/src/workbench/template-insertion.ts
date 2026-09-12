import { parseCustomJsxTemplate } from "../jsx/interpreter-parser";
import type { AstNode } from "../jsx/interpreter-foundation";

const layouts = new Set(["Stack", "Group", "Box", "Paper", "Card", "SimpleGrid", "Flex", "Container"]);
const node = (value: unknown) => value as AstNode | undefined;

/** Insert at a known JSX boundary without printing or rewriting the author's existing syntax. */
export function insertCustomWidgetTemplateContent(template: string, content: string) {
  const root = parseCustomJsxTemplate(template);
  parseCustomJsxTemplate(content);
  const children = (root.children as AstNode[]).filter(
    (entry) => entry.type !== "JSXText" || String(entry.value).trim(),
  );
  const element = children[0];
  const opening = node(element?.openingElement);
  const name = node(opening?.name)?.name;
  if (children.length === 1 && element?.type === "JSXElement" && typeof name === "string" && layouts.has(name)) {
    const closing = node(element.closingElement);
    const end = closing?.start;
    if (typeof end === "number") {
      const at = end - 2;
      return template.slice(0, at) + "\n" + content + "\n" + template.slice(at);
    }
    if (opening?.selfClosing && typeof opening.end === "number") {
      const at = opening.end - 4;
      if (template.slice(at, at + 2) === "/>")
        return template.slice(0, at) + ">\n" + content + `\n</${name}>` + template.slice(at + 2);
    }
  }
  // The interpreter's implicit fragment supports siblings, including complex code-owned roots.
  return template + "\n" + content;
}

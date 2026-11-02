import { parseExpression } from "@babel/parser";

export const ARENA_IMAGE_PATH = "/images/demo-dashboard-background.svg";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function arenaTemplateAdmission(template: string): string[] {
  const issues: string[] = [];
  if (/(?:https?:|javascript:|data:|\/\/|url\s*\()/iu.test(template))
    issues.push("External, active or CSS URL syntax is not admitted");
  let tree: unknown;
  try {
    tree = parseExpression(template, { plugins: ["jsx"] });
  } catch {
    return [...issues, "Template could not be inspected for fixture-only URI admission"];
  }
  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!record(value)) return;
    if (value.type === "JSXAttribute" && record(value.name)) {
      const name = value.name.name;
      if (typeof name === "string" && /^(?:href|srcSet|poster|background|action|formAction|iconUrl)$/iu.test(name))
        issues.push("Navigation and secondary URI attributes are not admitted");
      if (name === "src") {
        const attribute = value.value;
        let allowed = record(attribute) && attribute.type === "StringLiteral" && attribute.value === ARENA_IMAGE_PATH;
        if (record(attribute) && attribute.type === "JSXExpressionContainer" && record(attribute.expression)) {
          const expression = attribute.expression;
          if (expression.type === "StringLiteral" && expression.value === ARENA_IMAGE_PATH) allowed = true;
          if (
            expression.type === "MemberExpression" &&
            expression.computed === false &&
            record(expression.object) &&
            expression.object.type === "Identifier" &&
            record(expression.property) &&
            expression.property.name === "image"
          )
            allowed = true;
        }
        if (!allowed) issues.push("Image src must be the known local placeholder or a fixture-row image field");
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (!["loc", "start", "end", "extra", "comments"].includes(key)) visit(child);
    }
  }
  visit(tree);
  return [...new Set(issues)];
}

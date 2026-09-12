import { generate, ident, parse, walk } from "css-tree";

const allowedAtRules = new Set(["media", "supports", "container", "keyframes", "-webkit-keyframes"]);
const animationKeywords = new Set([
  "none",
  "infinite",
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
  "forwards",
  "backwards",
  "both",
  "running",
  "paused",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "step-start",
  "step-end",
]);

/** Parse and namespace authored CSS; no resource loading or document-wide rules. */
export function compileCustomWidgetStyles(stylesheet: string, scopeId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/u.test(scopeId)) throw new Error("Invalid stylesheet scope");
  if (stylesheet.length > 30_000) throw new Error("Stylesheets are limited to 30,000 characters");
  const ast = parse(stylesheet, {
    positions: true,
    parseCustomProperty: true,
    onParseError: (error) => {
      throw error;
    },
  });
  const keyframes = new Map<string, string>();
  let count = 0;
  walk(ast, function (node) {
    if (++count > 10_000) throw new Error("Stylesheet exceeds the complexity limit");
    if (node.type === "Raw" || node.type === "Url") throw new Error("CSS resources and unparsed CSS are not supported");
    if (node.type === "Atrule") {
      if (!allowedAtRules.has(normalize(node.name))) throw new Error(`Unsupported CSS rule @${node.name}`);
      if (normalize(node.name).endsWith("keyframes")) {
        const name = node.prelude && generate(node.prelude);
        if (!name || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/u.test(name)) throw new Error("Use an identifier for keyframes");
        keyframes.set(name, `cw-${scopeId}-${name}`);
      }
    }
    if (
      node.type === "Function" &&
      ["url", "expression", "image-set", "-webkit-image-set", "attr"].includes(normalize(node.name))
    ) {
      throw new Error(`Unsupported CSS function ${node.name}`);
    }
    if (node.type === "Declaration" && ["behavior", "-moz-binding"].includes(normalize(node.property))) {
      throw new Error(`Unsupported CSS property ${node.property}`);
    }
  });
  walk(ast, function (node) {
    if (node.type === "Atrule" && normalize(node.name).endsWith("keyframes") && node.prelude) {
      const prelude = parse(keyframes.get(generate(node.prelude)) ?? "", { context: "atrulePrelude" });
      if (prelude.type === "AtrulePrelude") node.prelude = prelude;
    }
    if (node.type === "ClassSelector") node.name = `cw-${scopeId}-${node.name}`;
    if (node.type === "Declaration" && /^(?:-webkit-)?animation(?:-name)?$/u.test(normalize(node.property))) {
      walk(node.value, (value) => {
        if (value.type === "Function" && !["cubic-bezier", "steps", "linear"].includes(normalize(value.name))) {
          throw new Error("Animation values must reference declared keyframes directly");
        }
        if (value.type !== "Identifier") return;
        const localName = keyframes.get(value.name);
        if (localName) value.name = localName;
        else if (!animationKeywords.has(value.name)) throw new Error(`Unknown widget keyframes '${value.name}'`);
      });
    }
  });
  walk(ast, {
    visit: "Rule",
    enter(node) {
      if (this.atrule && normalize(this.atrule.name).endsWith("keyframes")) return;
      if (this.rule && this.rule !== node) throw new Error("Use flat CSS selectors instead of nested rules");
      if (node.prelude.type !== "SelectorList") throw new Error("Invalid widget selector");
      node.prelude.children.forEach((selector) => {
        if (selector.type !== "Selector") return;
        const prefix = parse(`[data-cw-scope="${scopeId}"] ${generate(selector)}`, { context: "selector" });
        if (prefix.type === "Selector") selector.children = prefix.children;
      });
    },
  });
  return generate(ast);
}

const normalize = (name: string) => ident.decode(name).toLowerCase();

export function scopeCustomWidgetClassNames(value: unknown, scopeId?: string) {
  if (!scopeId || typeof value !== "string") return undefined;
  return value
    .split(/\s+/u)
    .filter((name) => /^[a-zA-Z_][a-zA-Z0-9_-]*$/u.test(name))
    .map((name) => `cw-${scopeId}-${name}`)
    .join(" ");
}

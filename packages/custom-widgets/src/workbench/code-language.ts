import { snippetCompletion } from "@codemirror/autocomplete";
import type { Completion, CompletionSource } from "@codemirror/autocomplete";
import { jsxLanguage } from "@codemirror/lang-javascript";
import { hoverTooltip } from "@codemirror/view";

import {
  customJsxAuthoringCatalog,
  customJsxCatalogComponentByName,
  getCustomJsxComponentProps,
} from "../core/component-catalog";
import { customJsxTablerIconNames } from "../core/tabler-icons";

const enabledCatalogComponents = customJsxAuthoringCatalog.components.filter(
  (component) => component.safety !== "denied",
);

const componentCompletions: Completion[] = enabledCatalogComponents.map((component) => ({
  label: component.name,
  type: "class",
  detail: `${component.package} · ${component.category} · ${component.safety}`,
  info: component.description ?? component.documentationUrl,
}));

export function getCustomJsxComponentPropCompletions(componentName: string): Completion[] {
  return getCustomJsxComponentProps(componentName)
    .filter((prop) => prop.name !== "key")
    .map((prop) => ({
      label: `${prop.name}=`,
      type: "property",
      detail: `${prop.type}${prop.required ? " · required" : ""}`,
      info: [prop.description, prop.literalValues?.length ? `Values: ${prop.literalValues.join(", ")}` : undefined]
        .filter(Boolean)
        .join("\n"),
    }));
}

const iconCompletions: Completion[] = customJsxTablerIconNames.map((name) => ({
  label: `name="${name}"`,
  type: "enum",
  detail: "Safe Tabler icon",
}));

const safeBlockCompletions: Completion[] = [
  snippetCompletion("map((item) => {\n\tconst value = ${};\n\treturn ${};\n})", {
    label: "map block",
    detail: "Safe immutable collection callback",
    type: "snippet",
  }),
  snippetCompletion("(() => {\n\tconst value = ${};\n\treturn ${};\n})()", {
    label: "derived value IIFE",
    detail: "Safe page-level derived value",
    type: "snippet",
  }),
];

export function getCustomJsxLocalConstCompletions(source: string, cursor: number): Completion[] {
  const wrapped = `<>${source}</>`;
  const target = cursor + 2;
  let activeNode = jsxLanguage.parser.parse(wrapped).resolveInner(target, -1);
  while (activeNode.name !== "Block") {
    const parent = activeNode.parent;
    if (!parent) return [];
    activeNode = parent;
  }
  const completions: Completion[] = [];
  for (let statement = activeNode.firstChild; statement; statement = statement.nextSibling) {
    if (statement.name !== "VariableDeclaration" || statement.from >= target) continue;
    if (statement.firstChild?.name !== "const") continue;
    const definitions = statement.getChildren("VariableDefinition");
    definitions.forEach((definition, index) => {
      const nextDefinition = definitions[index + 1];
      const declaratorFinished = nextDefinition ? nextDefinition.from <= target : statement.to < target;
      if (!declaratorFinished) return;
      completions.push({
        label: wrapped.slice(definition.from, definition.to),
        type: "variable",
        detail: "Safe local const",
      });
    });
  }
  return completions;
}

export const createCustomJsxCompletionSource =
  (additional: Completion[]): CompletionSource =>
  (context) => {
    const word = context.matchBefore(/[A-Za-z](?:[\w."'_-]|\[|\])*/u);
    if (!word && !context.explicit) return null;
    const source = context.state.doc.toString();
    const localCompletions = getCustomJsxLocalConstCompletions(source, context.pos);
    const componentName = activeOpeningComponent(source, context.pos);
    const contextualCompletions = componentName
      ? [
          ...getCustomJsxComponentPropCompletions(componentName),
          ...(componentName === "TablerIcon" ? iconCompletions : []),
        ]
      : componentCompletions;
    return {
      from: word?.from ?? context.pos,
      options: [...localCompletions, ...safeBlockCompletions, ...contextualCompletions, ...additional],
    };
  };

export const customJsxComponentHover = hoverTooltip((view, position) => {
  const source = view.state.doc.toString();
  const token = dottedTokenAt(source, position);
  if (!token) return null;
  const component = customJsxCatalogComponentByName.get(token.value);
  const activeComponentName = activeOpeningComponent(source, position);
  const prop = activeComponentName
    ? getCustomJsxComponentProps(activeComponentName).find((candidate) => candidate.name === token.value)
    : undefined;
  if ((!component || component.safety === "denied") && !prop) return null;
  return {
    pos: token.from,
    end: token.to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.style.padding = "6px 8px";
      dom.textContent = prop
        ? `${activeComponentName}.${prop.name}: ${prop.type}${prop.required ? " · required" : ""}${prop.description ? ` — ${prop.description}` : ""}`
        : `${component?.name} · ${component?.package} · ${component?.category}${component?.description ? ` — ${component.description}` : ""}`;
      return { dom };
    },
  };
});

function activeOpeningComponent(source: string, position: number): string | undefined {
  const match = source.slice(0, position).match(/<([A-Z][A-Za-z0-9.]*)\b[^<>]*$/u);
  const name = match?.[1];
  return name && customJsxCatalogComponentByName.get(name)?.safety !== "denied" ? name : undefined;
}

function dottedTokenAt(source: string, position: number) {
  let from = position;
  let to = position;
  while (from > 0 && /[A-Za-z0-9._-]/u.test(source[from - 1] ?? "")) from -= 1;
  while (to < source.length && /[A-Za-z0-9._-]/u.test(source[to] ?? "")) to += 1;
  return from === to ? null : { from, to, value: source.slice(from, to) };
}

import type { Completion, CompletionSource } from "@codemirror/autocomplete";
import { hoverTooltip } from "@codemirror/view";

import {
  customJsxComponentByName,
  customJsxTablerIconNames,
  enabledCustomJsxComponents,
} from "@homarr/custom-widgets/core";

const componentCompletions: Completion[] = enabledCustomJsxComponents.map((component) => ({
  label: component.name,
  type: "class",
  detail: `${component.category} · ${component.safety}`,
  info: component.documentationUrl,
}));

const propCompletions: Completion[] = [
  ...new Set(enabledCustomJsxComponents.flatMap((component) => component.supportedProps)),
]
  .filter((prop) => prop !== "key")
  .map((prop) => ({ label: `${prop}=`, type: "property", detail: "Mantine prop" }));

const iconCompletions: Completion[] = customJsxTablerIconNames.map((name) => ({
  label: `name="${name}"`,
  type: "enum",
  detail: "Safe Tabler icon",
}));

export const createCustomJsxCompletionSource =
  (additional: Completion[]): CompletionSource =>
  (context) => {
    const word = context.matchBefore(/[A-Za-z](?:[\w."'_-]|\[|\])*/u);
    if (!word && !context.explicit) return null;
    return {
      from: word?.from ?? context.pos,
      options: [...componentCompletions, ...propCompletions, ...iconCompletions, ...additional],
    };
  };

export const customJsxComponentHover = hoverTooltip((view, position) => {
  const word = view.state.wordAt(position);
  if (!word) return null;
  const name = view.state.doc.sliceString(word.from, word.to);
  const component = customJsxComponentByName.get(name);
  if (!component || component.safety === "denied") return null;
  return {
    pos: word.from,
    end: word.to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.style.padding = "6px 8px";
      dom.textContent = `${component.name} · ${component.category} · ${component.documentationUrl}`;
      return { dom };
    },
  };
});

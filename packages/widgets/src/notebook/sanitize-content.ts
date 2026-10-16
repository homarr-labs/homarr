import { addHook, removeHook, sanitize } from "isomorphic-dompurify";
import type { Config, UponSanitizeAttributeHook, UponSanitizeElementHook } from "isomorphic-dompurify";

const textAlignValuePattern = /^(?:left|right|center|justify)$/;
const aspectRatioValuePattern = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/;

export const isSupportedAspectRatioValue = (value: string) => {
  const match = aspectRatioValuePattern.exec(value);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
};

const isValidColorValue = (node: Element, property: string, value: string) => {
  if (value.includes("var(") || value.includes("url(")) return false;
  const probe = node.ownerDocument.createElement("span");
  probe.style.setProperty(property, value);
  return probe.style.getPropertyValue(property) !== "";
};

const filterSupportedStyles = (node: Element, style: string) => {
  const declarations: string[] = [];
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!value) continue;
    if (property === "text-align" && textAlignValuePattern.test(value)) {
      declarations.push(`${property}: ${value}`);
      continue;
    }
    if (property === "aspect-ratio") {
      if (node.nodeName === "IMG" && isSupportedAspectRatioValue(value)) declarations.push(`${property}: ${value}`);
      continue;
    }
    if ((property === "color" || property === "background-color") && isValidColorValue(node, property, value)) {
      declarations.push(`${property}: ${value}`);
    }
  }
  return declarations.join("; ");
};

const requiredDataAttributeValues: Record<string, (node: Element, value: string) => boolean> = {
  "data-type": (_node, value) => value === "taskList" || value === "taskItem" || value === "detailsContent",
  "data-checked": (_node, value) => value === "true" || value === "false" || value === "",
  "data-color": (node, value) => isValidColorValue(node, "color", value),
};

const attributeHook: UponSanitizeAttributeHook = (node, event) => {
  if (event.attrName === "style") {
    const filtered = filterSupportedStyles(node, event.attrValue);
    if (filtered.length === 0) {
      event.keepAttr = false;
      return;
    }
    event.attrValue = filtered;
    return;
  }
  if (!event.attrName.startsWith("data-")) return;
  const isRequiredDataAttribute = requiredDataAttributeValues[event.attrName];
  if (!isRequiredDataAttribute || !isRequiredDataAttribute(node, event.attrValue)) {
    event.keepAttr = false;
  }
};

const elementHook: UponSanitizeElementHook = (node, event) => {
  if (event.tagName === "a") {
    const element = node as Element;
    if (element.getAttribute("target") !== "_blank") return;
    const rel = new Set((element.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean));
    rel.delete("opener");
    rel.add("noopener");
    rel.add("noreferrer");
    element.setAttribute("rel", [...rel].join(" "));
    return;
  }
  if (event.tagName === "input") {
    const element = node as Element;
    const isTaskCheckbox =
      element.getAttribute("type") === "checkbox" && element.closest('li[data-type="taskItem"]') !== null;
    if (!isTaskCheckbox) element.parentNode?.removeChild(element);
  }
};

const notebookSanitizeConfig: Config = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "details",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "input",
    "label",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
  ADD_ATTR: ["data-type", "data-color", "data-checked", "target", "colwidth"],
  FORBID_ATTR: ["class", "id", "name"],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
};

const runSanitize = <TResult>(callback: () => TResult): TResult => {
  addHook("uponSanitizeElement", elementHook);
  addHook("uponSanitizeAttribute", attributeHook);
  try {
    return callback();
  } finally {
    removeHook("uponSanitizeElement", elementHook);
    removeHook("uponSanitizeAttribute", attributeHook);
  }
};

const sanitizeFragment = (html: string) =>
  runSanitize(() => sanitize(html, { ...notebookSanitizeConfig, RETURN_DOM_FRAGMENT: true }));

export const sanitizeNotebookHtml = (html: string, disableTasks = false) => {
  const fragment = sanitizeFragment(html);
  for (const input of fragment.querySelectorAll("input")) {
    const task = input.closest('li[data-type="taskItem"]')?.cloneNode(true) as Element | undefined;
    task?.querySelectorAll('label, ul[data-type="taskList"]').forEach((element) => element.remove());
    const label = task?.textContent?.replace(/\s+/g, " ").trim() || "Task item";
    input.setAttribute("aria-label", label);
    if (disableTasks) input.disabled = true;
  }
  const holder = fragment.ownerDocument.createElement("div");
  holder.append(fragment);
  return holder.innerHTML;
};

const blockTagNames = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
  "UL",
  "OL",
  "LI",
  "TABLE",
  "TR",
  "TD",
  "TH",
  "HR",
  "DETAILS",
  "SUMMARY",
]);

const isBlockNode = (node: Node) => {
  if (node.nodeType !== 1) return false;
  if (node.nodeName === "DIV") return (node as Element).getAttribute("data-type") === "detailsContent";
  return blockTagNames.has(node.nodeName);
};

const collectText = (node: Node, state: { seen: boolean }, segments: string[]) => {
  if (node.nodeType === 3) {
    segments.push(node.textContent ?? "");
    return;
  }
  if (node.nodeType !== 1) {
    node.childNodes.forEach((child) => collectText(child, state, segments));
    return;
  }
  if (node.nodeName === "BR") {
    segments.push("\n");
    return;
  }
  const isBlock = isBlockNode(node);
  if (isBlock && state.seen) segments.push("\n\n");
  if (isBlock) state.seen = true;
  node.childNodes.forEach((child) => collectText(child, state, segments));
};

export const getNotebookText = (html: string) => {
  const fragment = sanitizeFragment(html);
  const segments: string[] = [];
  collectText(fragment, { seen: false }, segments);
  return segments.join("").trim();
};

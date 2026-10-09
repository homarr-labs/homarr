import { parseExpression } from "@babel/parser";
import { snapshotPublicAttributeValues, snapshotPublicFields } from "./public-fields";
import { customJsxTablerIconNames } from "@homarr/custom-widgets/core";
import { redactSnapshotCss } from "./css";

import { integrationKinds, widgetKinds } from "@homarr/definitions";
import {
  headerBuiltinItemIds,
  headerLogoDisplayValues,
  headerSearchDisplayValues,
} from "@homarr/validation/header-preferences";

const sensitiveKey =
  /secret|password|passwd|token|authorization|cookie|credential|api.?key|private.?key|email|username|address|latitude|longitude|coordinates|headers/i;
const urlKey = /(?:url|uri|href|host|hostname|endpoint|path|src)$/i;
const sourceKey = /customCss|customCssClasses|html|markdown|content|description|body|script|srcDoc/i;
const imageKey = /(?:image|avatar|thumbnail|poster|cover|icon|logo|favicon)(?:url|uri|path)?$/i;
export const snapshotPlaceholder = "/images/board-snapshot-placeholder.svg";
const iconNames = new Set<string>(customJsxTablerIconNames);

// Only known presentation/protocol values survive. Private strings are replaced,
// even when their field name gives no indication that they contain a secret.
const publicValues = new Set<string>([
  ...widgetKinds,
  ...integrationKinds,
  "empty",
  "container",
  "main",
  "left",
  "right",
  "mobile",
  "base",
  "custom",
  ...headerBuiltinItemIds,
  ...headerLogoDisplayValues,
  ...headerSearchDisplayValues,
  "builtin",
  "board",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "auto",
  "dark",
  "light",
  "public",
  "private",
  "view",
  "modify",
  "admin",
  "use",
  "interact",
  "full",
  "query",
  "infinite",
  "mutation",
  "subscription",
  "load",
  "manual",
  "action",
  "item",
  "preview",
  "customJsx",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "success",
  "error",
  "pending",
  "row",
  "column",
  "center",
  "start",
  "end",
  "flex-start",
  "flex-end",
  "space-between",
  "wrap",
  "nowrap",
  "solid",
  "outline",
  "light",
  "subtle",
  "transparent",
  "filled",
  "default",
  "primaryColor",
  "secondaryColor",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "cyan",
  "teal",
  "pink",
  "grape",
  "violet",
  "gray",
  "white",
  "black",
  "cover",
  "contain",
  "repeat",
  "no-repeat",
  "repeat-x",
  "repeat-y",
  "fixed",
  "scroll",
  "local",
  "celsius",
  "fahrenheit",
  "metric",
  "imperial",
  "decimal",
  "binary",
  "bytes",
  "bits",
  "en",
  "UTC",
  "on",
  "off",
  "unavailable",
  "stopped",
  "starting",
  "pomodoro",
  "focus",
  "shortBreak",
  "longBreak",
  "idle",
  // Normalized runtime discriminants used for widget branches and labels.
  "unknown",
  "downloading",
  "queued",
  "paused",
  "completed",
  "failed",
  "processing",
  "leeching",
  "stalled",
  "seeding",
  "importing",
  "torrent",
  "usenet",
  "miscellaneous",
  "created",
  "running",
  "restarting",
  "exited",
  "removing",
  "dead",
  "canceled",
  "up",
  "down",
  "grace",
  "new",
  "enabled",
  "disabled",
  "warning",
  "active",
  "disconnected",
  "never_connected",
  "online",
  "offline",
  "charging",
  "onBattery",
  "lowBattery",
  "available",
  "partiallyAvailable",
  "requested",
  "deleted",
  "blacklisted",
  "approved",
  "declined",
  "movie",
  "tv",
  "episode",
  "book",
  "podcast",
  "music",
  "audio",
  "video",
  "playing",
  "buffering",
  "Ready",
  "NotReady",
  "Active",
  "Terminating",
  "Reserved",
  "Used",
  "Pods",
  "CPU",
  "Memory",
  "configmaps",
  "pods",
  "ingresses",
  "namespaces",
  "nodes",
  "services",
  "volumes",
  "node",
  "qemu",
  "lxc",
  "storage",
  "digitalRelease",
  "physicalRelease",
  "cinemaRelease",
  "http",
  "https",
  "tcp",
  "udp",
  "ok",
  "healthy",
  "unhealthy",
]);

export const createSnapshotRedactor = () => {
  const replacements = new Map<string, string>();
  const structuralValues = new Set<string>();
  const structuralFields = new Set(snapshotPublicFields);
  const locations = new Map<string, number>();
  const preserve = (value: string) => {
    if (/^[\w$-]{1,64}$/.test(value) && !sensitiveKey.test(value)) structuralValues.add(value);
  };
  const replace = (value: string) => {
    if (!replacements.has(value)) replacements.set(value, `redacted_${replacements.size + 1}`);
    return replacements.get(value) ?? "redacted";
  };
  const field = (value: string) => {
    if (structuralFields.has(value) || /^redacted[_-]\d+$/.test(value)) return value;
    return replace(value);
  };
  const cssIdentifier = (value: string): string => {
    if (structuralFields.has(value) || /^redacted[_-]\d+$/.test(value)) return value;
    if (value.startsWith("--")) return `--${cssIdentifier(value.slice(2))}`;
    return replace(value);
  };
  const string = (value: string, key = ""): string => {
    if (value === "") return value;
    if (sensitiveKey.test(key)) return "";
    if (key === "systemId" && value.split(":").length === 2 && !value.includes("/"))
      return value
        .split(":")
        .map((part) => string(part))
        .join(":");
    if (/timezone/i.test(key)) {
      try {
        Intl.DateTimeFormat("en", { timeZone: value });
        return value;
      } catch {
        return "UTC";
      }
    }
    if (imageKey.test(key)) return snapshotPlaceholder;
    if (urlKey.test(key) || /(?:[a-z]+:\/\/|www\.|@|\b\d{1,3}(?:\.\d{1,3}){3}\b)/i.test(value)) return "";
    if (/state|status/i.test(key) && value.includes(":") && value.split(":").every((part) => publicValues.has(part)))
      return value;
    if (publicValues.has(value) || structuralValues.has(value)) return value;
    if (/format/i.test(key) && /^[YMDHhmsSaAd:.,/ -]{1,40}$/.test(value)) return value;
    if (
      /color|colour/i.test(key) &&
      /^(#[\da-f]{3,8}|(?:red|blue|green|yellow|orange|cyan|teal|pink|grape|violet|gray|dark|white|black)(?:\.\d)?)$/i.test(
        value,
      )
    )
      return value;
    if (/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?$/.test(value)) return value;
    if (/^redacted[_-]\d+$/.test(value)) return value;
    return replace(value);
  };
  const redactAttributeValue = (value: string, name: string) => {
    if (sensitiveKey.test(name)) return "";
    if (snapshotPublicAttributeValues.has(`${name}:${value}`)) return value;
    if (
      [
        "aria-expanded",
        "aria-pressed",
        "aria-selected",
        "aria-hidden",
        "aria-disabled",
        "aria-checked",
        "data-board-container-collapsed",
        "data-visible",
        "data-checked",
      ].includes(name) &&
      /^(?:true|false)$/.test(value)
    )
      return value;
    if (
      [
        "aria-colindex",
        "aria-rowindex",
        "aria-level",
        "aria-colcount",
        "aria-rowcount",
        "tabindex",
        "colspan",
        "rowspan",
        "start",
        "width",
        "height",
      ].includes(name) &&
      /^[+-]?\d{1,12}(?:\.\d{1,6})?$/.test(value)
    )
      return value;
    return string(value, name);
  };
  const cssNames = {
    identifier: cssIdentifier,
    text: string,
    attribute: redactAttributeValue,
  };
  const template = (source: string): string => {
    try {
      const ast = parseExpression(source, { plugins: ["jsx"] });
      const edits: { start: number; end: number; text: string }[] = [];
      const visit = (node: unknown, parent?: Record<string, unknown>, grandparent?: Record<string, unknown>) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          for (const child of node) visit(child, parent, grandparent);
          return;
        }
        const record = node as Record<string, unknown>;
        const { type, start, end, value } = record;
        if (typeof start === "number" && typeof end === "number") {
          if (type === "StringLiteral" && typeof value === "string") {
            // Object keys and data selectors are structural, not display text.
            const isProperty =
              parent?.key === node ||
              ((parent?.type === "MemberExpression" || parent?.type === "OptionalMemberExpression") &&
                parent.property === node);
            let propertyName = "";
            if (parent?.type === "ObjectProperty") {
              const property = parent.key as { name?: string; value?: string };
              propertyName = property.name ?? property.value ?? "";
            }
            if (parent?.type === "JSXAttribute") propertyName = (parent.name as { name?: string }).name ?? "";
            let replacement = string(value, propertyName);
            if (isProperty) replacement = field(value);
            if (parent?.type === "JSXAttribute") {
              const attribute = (parent.name as { name?: string }).name;
              const component = (grandparent?.name as { name?: string } | undefined)?.name;
              if (
                component === "SubData" &&
                attribute === "as" &&
                ["Text", "Title", "Badge", "Code", "Image"].includes(value)
              )
                replacement = value;
              if ((component === "Icon" || component === "TablerIcon") && attribute === "name" && iconNames.has(value))
                replacement = value;
              if (attribute === "bind" || attribute === "requestId") replacement = field(value);
              if (attribute === "className" || attribute === "class")
                replacement = value.split(/\s+/).map(cssIdentifier).join(" ");
              if (attribute === "id") replacement = cssIdentifier(value);
              if (attribute === "href") replacement = "https://example.invalid/";
              if (attribute?.startsWith("data-") || attribute?.startsWith("aria-"))
                replacement = redactAttributeValue(value, attribute);
              if (attribute === "path")
                replacement = value
                  .split(".")
                  .map((part) => {
                    if (/^\d+$/.test(part)) return part;
                    return field(part);
                  })
                  .join(".");
            }
            edits.push({ start, end, text: JSON.stringify(replacement) });
          } else if (
            type === "NumericLiteral" &&
            parent?.type === "ObjectProperty" &&
            sensitiveKey.test(
              String(
                (parent.key as { name?: string; value?: string }).name ??
                  (parent.key as { value?: string }).value ??
                  "",
              ),
            )
          ) {
            const property = parent.key as { name?: string; value?: string };
            const redacted = redact(record.value, property.name ?? property.value ?? "");
            edits.push({ start, end, text: String(redacted) });
          } else if (type === "Identifier" && typeof record.name === "string") {
            const isProperty =
              (parent?.key === node && !parent.computed) ||
              ((parent?.type === "MemberExpression" || parent?.type === "OptionalMemberExpression") &&
                parent.property === node &&
                !parent.computed);
            if (isProperty) {
              let replacement = field(record.name);
              if (parent?.shorthand && replacement !== record.name) replacement += `: ${record.name}`;
              edits.push({ start, end, text: replacement });
            }
          } else if (type === "JSXText" && typeof value === "string" && value.trim()) {
            edits.push({ start, end, text: string(value.trim()) });
          } else if (type === "TemplateElement") {
            edits.push({ start, end, text: "redacted" });
          } else if (type === "RegExpLiteral") {
            edits.push({ start, end, text: "/redacted/" });
          } else if (type === "CommentBlock" || type === "CommentLine") {
            edits.push({ start, end, text: " " });
          }
        }
        for (const [property, child] of Object.entries(record)) {
          if (["loc", "extra", "tokens", "comments"].includes(property)) continue;
          if (child && typeof child === "object") visit(child, record, parent);
        }
      };
      visit(ast);
      for (const comment of ast.comments ?? [])
        edits.push({ start: comment.start ?? 0, end: comment.end ?? 0, text: " " });
      let result = source;
      let previousStart = source.length + 1;
      for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
        if (edit.end > previousStart) continue;
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
        previousStart = edit.start;
      }
      return result;
    } catch {
      // Never fall back to exporting unparsed source.
      return "<Text>Redacted Custom Widget</Text>";
    }
  };
  const richText = (value: string): string => {
    // An inert template retains notebook structure without loading resources.
    if (typeof document === "undefined") return "";
    const fragment = document.createElement("template");
    fragment.innerHTML = value;
    const visit = (node: Node) => {
      if (node.nodeType === Node.COMMENT_NODE) {
        node.parentNode?.removeChild(node);
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) node.textContent = (node.textContent ?? "").replace(/[^\s]/gu, "x");
      if (node instanceof Element) {
        if (
          !/^(?:p|br|h[1-6]|strong|b|em|i|u|s|del|code|pre|blockquote|ul|ol|li|a|span|div|mark|hr|table|thead|tbody|tfoot|tr|th|td|colgroup|col|details|summary|label|input|img)$/i.test(
            node.tagName,
          )
        ) {
          node.remove();
          return;
        }
        let imageRatio: string | undefined;
        if (node.tagName === "IMG" && !(node as HTMLImageElement).style.aspectRatio) {
          const source = node.getAttribute("src");
          const rendered = Array.from(document.images).find(
            (image) => image.getAttribute("src") === source || image.src === source,
          );
          if (rendered?.naturalWidth && rendered.naturalHeight)
            imageRatio = `${rendered.naturalWidth} / ${rendered.naturalHeight}`;
        }
        for (const attribute of Array.from(node.attributes)) {
          const { name, value: attributeValue } = attribute;
          node.removeAttribute(name);
          if (name === "class") node.setAttribute(name, attributeValue.split(/\s+/).map(cssIdentifier).join(" "));
          else if (name === "id") node.setAttribute(name, cssIdentifier(attributeValue));
          else if (name === "style")
            node.setAttribute(name, redactSnapshotCss(attributeValue, cssNames, "declarationList"));
          else if (name === "src" && node.tagName === "IMG") node.setAttribute(name, snapshotPlaceholder);
          else if (name === "href" && node.tagName === "A") node.setAttribute(name, "https://example.invalid/");
          else if (
            ["width", "height"].includes(name) &&
            /^\d{1,5}(?:\.\d{1,3})?(?:%|px|r?em|vw|vh)?$/.test(attributeValue)
          )
            node.setAttribute(name, attributeValue);
          else if (["colspan", "rowspan", "start"].includes(name) && /^\d{1,5}$/.test(attributeValue))
            node.setAttribute(name, attributeValue);
          else if (
            name === "data-type" &&
            ["taskItem", "taskList", "details", "detailsSummary", "detailsContent"].includes(attributeValue)
          )
            node.setAttribute(name, attributeValue);
          else if (
            ["colwidth", "data-colwidth"].includes(name) &&
            ["TD", "TH"].includes(node.tagName) &&
            /^\d{1,5}(?:,\d{1,5}){0,100}$/.test(attributeValue)
          )
            node.setAttribute(name, attributeValue);
          else if (name === "open" && node.tagName === "DETAILS") node.setAttribute(name, "");
          else if (name === "data-checked" && ["true", "false"].includes(attributeValue))
            node.setAttribute(name, attributeValue);
          else if (name === "dir" && ["ltr", "rtl", "auto"].includes(attributeValue))
            node.setAttribute(name, attributeValue);
          else if (name === "type" && attributeValue === "checkbox") node.setAttribute(name, attributeValue);
          else if (name === "checked") node.setAttribute(name, "");
        }
        if (imageRatio) (node as HTMLImageElement).style.aspectRatio = imageRatio;
      }
      for (const child of Array.from(node.childNodes)) visit(child);
    };
    visit(fragment.content);
    return fragment.innerHTML;
  };
  const redact = (value: unknown, key = "", depth = 0): unknown => {
    if (depth > 40) throw new Error("Snapshot data is too deeply nested");
    if (/^(latitude|longitude)$/i.test(key) && typeof value === "number") {
      const location = `${key}:${value}`;
      if (!locations.has(location)) locations.set(location, (locations.size + 1) / 10000);
      return locations.get(location);
    }
    if (sensitiveKey.test(key)) {
      if (typeof value === "string") return "";
      if (typeof value === "number") return 0;
      if (Array.isArray(value)) return [];
      if (value && typeof value === "object") return {};
    }
    if (key === "template" && typeof value === "string") return template(value);
    if (key === "customCss" && typeof value === "string") return redactSnapshotCss(value, cssNames);
    if (key === "customCssClasses" && Array.isArray(value))
      return value.filter((name): name is string => typeof name === "string").map(cssIdentifier);
    if (key === "content" && typeof value === "string") return richText(value);
    if (sourceKey.test(key)) {
      if (Array.isArray(value)) return [];
      if (typeof value === "string") return "";
    }
    if (value instanceof Date) return new Date(value);
    if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
    if (typeof value === "string") return string(value, key);
    if (Array.isArray(value)) {
      const values = value.map((child) => redact(child, key, depth + 1));
      if (key === "eventNames" && values.every((child) => typeof child === "string")) return values.toSorted();
      return values;
    }
    if (typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).flatMap(([name, child]) => {
          if (["__proto__", "prototype", "constructor"].includes(name)) return [];
          return [[field(name), redact(child, name, depth + 1)]];
        }),
      );
    }
    return null;
  };
  return { redact, string, preserve, field, preserveField: (name: string) => structuralFields.add(name) };
};

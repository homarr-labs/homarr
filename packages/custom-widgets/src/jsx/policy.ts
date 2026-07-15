export const CUSTOM_JSX_LIMITS = Object.freeze({
  templateLength: 50_000,
  astDepth: 64,
  operations: 25_000,
  collectionItems: 2_000,
  renderedNodes: 10_000,
  stringLength: 200_000,
});

export const CUSTOM_JSX_BLOCKED_PROPERTIES: ReadonlySet<string> = new Set([
  "__proto__",
  "apply",
  "arguments",
  "bind",
  "call",
  "callee",
  "caller",
  "constructor",
  "prototype",
]);

export const CUSTOM_JSX_BLOCKED_PROPS: ReadonlySet<string> = new Set([
  "children",
  "className",
  "classNames",
  "classes",
  "component",
  "dangerouslySetInnerHTML",
  "innerRef",
  "portalProps",
  "ref",
  "renderRoot",
  "styles",
  "unstyled",
  "withinPortal",
]);

export const CUSTOM_JSX_BLOCKED_TAGS: ReadonlySet<string> = new Set([
  "base",
  "embed",
  "form",
  "iframe",
  "link",
  "meta",
  "object",
  "script",
  "style",
]);

export const CUSTOM_JSX_URL_PROPS: ReadonlySet<string> = new Set(["backgroundImage", "href", "src"]);

export const CUSTOM_JSX_BLOCKED_STYLE_KEYS: ReadonlySet<string> = new Set([
  "backdropFilter",
  "behavior",
  "bottom",
  "clipPath",
  "content",
  "filter",
  "inset",
  "left",
  "mask",
  "pointerEvents",
  "position",
  "right",
  "top",
  "zIndex",
]);

export function normalizeCustomJsxProperty(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase();
}

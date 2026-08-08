export const CUSTOM_JSX_LIMITS = Object.freeze({
  templateLength: 50_000,
  astDepth: 64,
  operations: 25_000,
  collectionItems: 4_000,
  renderedNodes: 10_000,
  stringLength: 200_000,
});

export const CUSTOM_JSX_BINDING_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/u;

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
  "autoFocus",
  "children",
  "className",
  "classNames",
  "classes",
  "component",
  "contentEditable",
  "dangerouslySetInnerHTML",
  "form",
  "formAction",
  "formEncType",
  "formMethod",
  "formNoValidate",
  "formTarget",
  "innerRef",
  "ping",
  "popover",
  "popoverTarget",
  "popoverTargetAction",
  "portalProps",
  "ref",
  "renderRoot",
  "srcDoc",
  "suppressContentEditableWarning",
  "suppressHydrationWarning",
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

export const CUSTOM_JSX_URL_PROPS: ReadonlySet<string> = new Set([
  "backgroundImage",
  "fallbackSrc",
  "href",
  "image",
  "poster",
  "src",
]);

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
  "pos",
  "position",
  "right",
  "top",
  "zIndex",
]);

const CUSTOM_JSX_BLOCKED_POSITION_PROPS: ReadonlySet<string> = new Set([
  "bottom",
  "inset",
  "left",
  "pos",
  "right",
  "top",
  "zIndex",
]);

export function normalizeCustomJsxProperty(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase();
}

export function isBlockedCustomJsxLexicalBinding(name: string): boolean {
  return CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(name));
}

export function isBlockedCustomJsxProp(name: string): boolean {
  return (
    /^on/iu.test(name) ||
    name.startsWith("__") ||
    /(?:Ref|^ref[A-Z])/u.test(name) ||
    CUSTOM_JSX_BLOCKED_PROPS.has(name) ||
    CUSTOM_JSX_BLOCKED_POSITION_PROPS.has(name) ||
    (name !== "bind" && CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(name)))
  );
}

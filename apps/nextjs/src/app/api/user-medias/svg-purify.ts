import createDOMPurify from "dompurify";
import { parseHTML } from "linkedom";

const svgSanitizeOptions = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ["style"],
} as const;

// ponytail: linkedom stores DOM tree pointers as own value properties; DOMPurify
// resolves them via prototype getters (lookupGetter). Without this shim, sanitize
// is a no-op and XSS payloads pass through unchanged.
const patchLinkedomNodePrototype = (Node: typeof window.Node) => {
  for (const prop of [
    "ownerDocument",
    "parentNode",
    "nextSibling",
    "previousSibling",
    "nodeName",
    "nodeType",
    "childNodes",
  ] as const) {
    if (Object.getOwnPropertyDescriptor(Node.prototype, prop)?.get) {
      continue;
    }

    if (Object.getOwnPropertyDescriptor(Node.prototype, prop)?.value !== undefined) {
      delete Node.prototype[prop as keyof Node];
    }

    Object.defineProperty(Node.prototype, prop, {
      configurable: true,
      enumerable: true,
      get() {
        return Object.getOwnPropertyDescriptor(this, prop)?.value ?? null;
      },
      set(value: unknown) {
        Object.defineProperty(this, prop, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      },
    });
  }
};

const createDocument = () => parseHTML("<!doctype html><html><head></head><body></body></html>");

const { window, document, Node } = createDocument();
patchLinkedomNodePrototype(Node);

if (!document.implementation?.createHTMLDocument) {
  Object.defineProperty(document, "implementation", {
    value: {
      createHTMLDocument() {
        return createDocument().document;
      },
      createDocument() {
        return createDocument().document;
      },
    },
  });
}

window.NodeFilter ??= {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
  SHOW_ALL: 0xffffffff,
  SHOW_ELEMENT: 1,
  SHOW_ATTRIBUTE: 2,
  SHOW_TEXT: 4,
  SHOW_CDATA_SECTION: 8,
  SHOW_PROCESSING_INSTRUCTION: 64,
  SHOW_COMMENT: 128,
  SHOW_DOCUMENT: 0x100,
  SHOW_DOCUMENT_TYPE: 0x200,
  SHOW_DOCUMENT_FRAGMENT: 0x400,
  SHOW_NOTATION: 0x800,
} as typeof window.NodeFilter;

const purify = createDOMPurify(window as unknown as Parameters<typeof createDOMPurify>[0]);

export const sanitizeSvg = (svgText: string) => {
  // linkedom's DOMParser omits html/body for fragment-only SVG; DOMPurify needs a body root.
  const wrapped = `<html><body>${svgText}</body></html>`;
  return purify.sanitize(wrapped, svgSanitizeOptions);
};

export { svgSanitizeOptions, purify };

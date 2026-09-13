import type { z } from "zod/v4";

import { getCustomJsxBindingType } from "./component-registry";
import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { parseCustomJsxTemplate } from "../jsx/interpreter-parser";
import type { AstNode } from "../jsx/interpreter-foundation";
import { CUSTOM_WIDGET_SCHEMA_V3 } from "./extensions-schema";
import type { CustomWidgetExtensions } from "./extensions-schema";
import type { CustomWidgetOptions } from "./options-schema";
import type { CustomJsxRequest } from "./request-schema";
import { collectCustomWidgetRequestReferences } from "./request-schema";

interface ExtendedDefinition {
  $schema: string;
  template: string;
  extensions?: CustomWidgetExtensions;
  requests: Record<string, CustomJsxRequest>;
  options: CustomWidgetOptions;
}
const ROOT_TEMPLATE = "@template";

export function validateCustomWidgetExtensions(definition: ExtendedDefinition, ctx: z.RefinementCtx) {
  const extensions = definition.extensions;
  const version3 = definition.$schema === CUSTOM_WIDGET_SCHEMA_V3;
  if (extensions && !version3) {
    ctx.addIssue({
      code: "custom",
      path: ["extensions"],
      message: "Runtime extensions require homarr-custom-widget-v3",
    });
  }
  if (!version3) {
    for (const [name, option] of Object.entries(definition.options)) {
      if (option.control === "integration" || option.integrationKinds !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["options", name],
          message: "Integration options require homarr-custom-widget-v3",
        });
      }
    }
  }
  const fragments = extensions?.fragments ?? {};
  const references = new Map<string, Set<string>>();
  const templates = [[ROOT_TEMPLATE, definition.template], ...Object.entries(fragments)] as const;
  if (templates.reduce((size, [, value]) => size + value.length, 0) > 100_000) {
    ctx.addIssue({
      code: "custom",
      path: ["extensions", "fragments"],
      message: "Combined JSX must not exceed 100,000 characters",
    });
  }
  for (const [name, template] of templates) {
    const path = name === ROOT_TEMPLATE ? ["template"] : ["extensions", "fragments", name];
    if (name !== ROOT_TEMPLATE) {
      for (const diagnostic of validateCustomJsxTemplate(template)) {
        if (diagnostic.severity === "error") ctx.addIssue({ code: "custom", path, message: diagnostic.message });
      }
    }
    const usedFragments = new Set<string>();
    references.set(name, usedFragments);
    try {
      visit(parseCustomJsxTemplate(template), (node) => {
        if (node.type !== "JSXOpeningElement") return;
        const tag = node.name as AstNode;
        const component = String(tag.name ?? "");
        const attributes = (node.attributes ?? []) as AstNode[];
        const literal = (key: string) => {
          const value = attributes.find((entry) => (entry.name as AstNode)?.name === key)?.value as AstNode | undefined;
          if (value?.type === "Literal" && typeof value.value === "string") return value.value;
          return undefined;
        };
        const advanced =
          [
            "View",
            "WidgetModal",
            "WidgetDrawer",
            "AppEmbed",
            "NativeQuery",
            "NativeActionButton",
            "ContentSaveButton",
            "ContentResetButton",
          ].includes(component) ||
          attributes.some((entry) =>
            ["className", "persist", "content"].includes(String((entry.name as AstNode)?.name)),
          );
        if (advanced && !version3) ctx.addIssue({ code: "custom", path, message: `${component} uses a v3 capability` });
        if (component === "View") {
          const target = literal("name");
          if (!target || !Object.hasOwn(fragments, target))
            ctx.addIssue({ code: "custom", path, message: "View must name a declared fragment" });
          else usedFragments.add(target);
        }
        if (["NativeQuery", "NativeActionButton"].includes(component)) {
          const target = literal("nativeId");
          const capability = target && extensions?.native?.[target];
          if (!capability)
            ctx.addIssue({ code: "custom", path, message: `${component} must name a declared native capability` });
          else if ((component === "NativeQuery") !== (capability.kind === "query")) {
            ctx.addIssue({ code: "custom", path, message: `${component} references the wrong capability kind` });
          }
        }
        if (name !== ROOT_TEMPLATE && ["SubFetch", "ActionButton", "ToggleSwitch"].includes(component)) {
          const target = literal("requestId");
          const request = target && definition.requests[target];
          if (!request) ctx.addIssue({ code: "custom", path, message: `${component} must name a declared request` });
          else if (
            (component === "SubFetch") !== (request.kind === "query") ||
            (component === "SubFetch" && request.trigger !== "manual")
          ) {
            ctx.addIssue({ code: "custom", path, message: `${component} references an incompatible request` });
          }
        }
        const contentName = literal("content");
        if (attributes.some((entry) => (entry.name as AstNode)?.name === "content")) {
          const declaration = extensions?.content?.[contentName ?? ""];
          const type = getCustomJsxBindingType(component, { type: literal("type") });
          if (!contentName || !declaration || !literal("bind") || !type || declaration.type !== type) {
            ctx.addIssue({
              code: "custom",
              path,
              message: "content must name a declared shared value matching a bound control",
            });
          }
          if (literal("persist"))
            ctx.addIssue({
              code: "custom",
              path,
              message: "A control cannot bind both shared content and a browser preference",
            });
        }
        if (
          ["ContentSaveButton", "ContentResetButton"].includes(component) &&
          !extensions?.content?.[literal("name") ?? ""]
        ) {
          ctx.addIssue({ code: "custom", path, message: `${component} must name a declared shared content value` });
        }
        const persisted = literal("persist");
        if (
          attributes.some((entry) => (entry.name as AstNode)?.name === "persist") &&
          (!persisted || !extensions?.preferences?.[persisted])
        ) {
          ctx.addIssue({ code: "custom", path, message: "persist must name a declared preference" });
        }
        if (persisted) {
          const binding = literal("bind");
          const type = getCustomJsxBindingType(component, { type: literal("type") });
          if (!binding || !type)
            ctx.addIssue({ code: "custom", path, message: "Saved preferences require a supported bound control" });
          else if (extensions?.preferences?.[persisted]?.type !== type) {
            ctx.addIssue({ code: "custom", path, message: "Saved preference type must match its bound control" });
          }
        }
      });
    } catch {
      /* Syntax diagnostics are produced by the JSX analyzer. */
    }
  }
  const visitedFragments = new Set<string>();
  const visitFragment = (name: string, stack: Set<string>): boolean => {
    if (stack.has(name)) return true;
    if (visitedFragments.has(name)) return false;
    const next = new Set(stack).add(name);
    for (const target of references.get(name) ?? []) if (visitFragment(target, next)) return true;
    visitedFragments.add(name);
    return false;
  };
  for (const name of Object.keys(fragments)) {
    if (visitFragment(name, new Set())) {
      ctx.addIssue({
        code: "custom",
        path: ["extensions", "fragments", name],
        message: "View fragments cannot recurse",
      });
      break;
    }
  }
  for (const [id, capability] of Object.entries(extensions?.native ?? {})) {
    const path = ["extensions", "native", id];
    if (Object.hasOwn(definition.requests, id))
      ctx.addIssue({ code: "custom", path, message: "Native and HTTP request IDs must be distinct" });
    if (capability.integrationOption && definition.options[capability.integrationOption]?.control !== "integration") {
      ctx.addIssue({ code: "custom", path, message: "Native integrationOption must reference an integration option" });
    }
    const refs = collectCustomWidgetRequestReferences({ path: "", body: capability.input });
    for (const option of refs.options) {
      if (!definition.options[option]) ctx.addIssue({ code: "custom", path, message: `Unknown option '${option}'` });
    }
    if (capability.trigger === "load" && refs.params.size)
      ctx.addIssue({ code: "custom", path, message: "Load capabilities cannot use invocation parameters" });
  }
}

function visit(node: AstNode, action: (node: AstNode) => void) {
  action(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child?.type) visit(child as AstNode, action);
      }
    } else if (value && typeof value === "object" && "type" in value) visit(value as AstNode, action);
  }
}

export function validateCustomWidgetTemplateRequests(
  template: string,
  requests: Record<string, CustomJsxRequest>,
  ctx: z.RefinementCtx,
) {
  for (const match of template.matchAll(/<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/gu)) {
    const component = match[1] as "SubFetch" | "ActionButton" | "ToggleSwitch";
    const attributes = match[2] ?? "";
    const idMatch = attributes.match(/\brequestId\s*=\s*(?:"([^"]+)"|'([^']+)')/u);
    const requestId = idMatch?.[1] ?? idMatch?.[2];
    if (!requestId) {
      ctx.addIssue({ code: "custom", path: ["template"], message: `${component} must use a literal requestId` });
      continue;
    }
    const request = requests[requestId];
    const expectedKind = component === "SubFetch" ? "query" : "action";
    if (!request)
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: `${component} references unknown request '${requestId}'`,
      });
    else if (request.kind !== expectedKind)
      ctx.addIssue({ code: "custom", path: ["template"], message: `${component} requires a ${expectedKind} request` });
    else if (component === "SubFetch" && request.trigger !== "manual")
      ctx.addIssue({ code: "custom", path: ["template"], message: `SubFetch requires '${requestId}' to be manual` });
  }
}

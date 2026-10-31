import { z } from "zod/v4";

import type { AstNode } from "../jsx/interpreter-foundation";
import { parseCustomJsxTemplate } from "../jsx/interpreter-parser";
import { CUSTOM_JSX_LIMITS } from "../jsx/policy";
import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";

type Definition = Pick<HomarrCustomWidgetV2, "sources" | "requests" | "options" | "template">;
type Counts = Map<string, number>;

export const customWidgetAcknowledgedRemovalsSchema = z
  .array(
    z
      .string()
      .min(1)
      .max(CUSTOM_JSX_LIMITS.templateLength + 128),
  )
  .max(32_768)
  .refine(
    (keys) => keys.reduce((length, key) => length + key.length, 0) <= 20 * CUSTOM_JSX_LIMITS.templateLength,
    `Acknowledged removal keys must contain at most ${20 * CUSTOM_JSX_LIMITS.templateLength} characters in total`,
  )
  .describe(
    "Complete set of exact removedFromSaved keys for removals the user explicitly requested. Restore every other reported removal before saving. This acknowledgement is not proof of semantic preservation.",
  );

const hasProtectedProps = (tag: string) => /(?:Chart|Progress|Table|Image)(?:\.|$)|^Sparkline$|^Heatmap$/u.test(tag);
const hasProtectedCount = (tag: string) =>
  hasProtectedProps(tag) ||
  /(?:Input|Select|Picker|Switch|Checkbox|Radio|Slider|Textarea|Autocomplete|Rating|Chip|SegmentedControl|Pagination|ActionButton|SubFetch)(?:\.|$)/u.test(
    tag,
  );

export function getCustomWidgetRemovals(saved: Definition, candidate: Definition): string[] {
  const removals: string[] = [];
  const requests = matchRenames(
    saved.requests,
    candidate.requests,
    (left, right) => left.method === right.method && left.path === right.path,
  );
  const options = matchRenames(
    saved.options,
    candidate.options,
    (left, right) => left.label === right.label && left.control === right.control,
  );
  for (const id of Object.keys(saved.requests).toSorted()) {
    if (!requests.has(id)) removals.push(`request:${id}`);
  }
  for (const id of Object.keys(saved.options).toSorted()) {
    if (!options.has(id)) removals.push(`option:${id}`);
  }
  for (const id of Object.keys(saved.sources).toSorted()) {
    if (!Object.hasOwn(candidate.sources, id)) removals.push(`source:${id}`);
  }
  const before = summarize(saved.template);
  const after = summarize(candidate.template, requests, options);
  for (const [tag, count] of [...before.tags].toSorted()) {
    const remaining = after.tags.get(tag) ?? 0;
    if (remaining === 0 || (hasProtectedCount(tag) && remaining < count)) removals.push(`component:${tag}`);
    if (remaining === 0) continue;
    const previousProps = before.props.get(tag) ?? new Map<string, number>();
    const nextProps = after.props.get(tag) ?? new Map<string, number>();
    if ((nextProps.get("style") ?? 0) < Math.min(previousProps.get("style") ?? 0, remaining)) {
      removals.push(`style:${tag}`);
    }
    if (!hasProtectedProps(tag)) continue;
    for (const [prop, propCount] of [...previousProps].toSorted()) {
      if (prop !== "style" && (nextProps.get(prop) ?? 0) < Math.min(propCount, remaining)) {
        removals.push(`prop:${tag}.${prop}`);
      }
    }
    for (const [prop, disabledCount] of [...(after.disabled.get(tag) ?? [])].toSorted()) {
      if (disabledCount > (before.disabled.get(tag)?.get(prop) ?? 0)) removals.push(`prop:${tag}.${prop}=false`);
    }
  }
  for (const [call, count] of [...before.calls].toSorted()) {
    if ((after.calls.get(call) ?? 0) < count) removals.push(`call:${call}`);
  }
  for (const binding of [...before.bindings].toSorted()) {
    if (!after.bindings.has(binding)) removals.push(binding);
  }
  return [...new Set(removals)];
}

function matchRenames<T>(before: Record<string, T>, after: Record<string, T>, matches: (left: T, right: T) => boolean) {
  const matched = new Map<string, string>();
  const available = new Set(Object.keys(after).toSorted());
  for (const id of Object.keys(before).toSorted()) {
    if (!available.delete(id)) continue;
    matched.set(id, id);
  }
  for (const [id, value] of Object.entries(before).toSorted()) {
    if (matched.has(id)) continue;
    const renamed = [...available].find((key) => {
      const next = after[key];
      return next !== undefined && matches(value, next);
    });
    if (renamed === undefined) continue;
    matched.set(id, renamed);
    available.delete(renamed);
  }
  return matched;
}

function summarize(template: string, requests = new Map<string, string>(), options = new Map<string, string>()) {
  const tags: Counts = new Map();
  const props = new Map<string, Counts>();
  const disabled = new Map<string, Counts>();
  const calls: Counts = new Map();
  const bindings = new Set<string>();
  const requestIds = new Map([...requests].map(([before, after]) => [after, before]));
  const optionIds = new Map([...options].map(([before, after]) => [after, before]));
  const visit = (node: AstNode) => {
    if (node.type === "JSXOpeningElement") {
      const tag = getPath(node.name).join(".");
      if (tag) {
        increment(tags, tag);
        const attributes = props.get(tag) ?? new Map<string, number>();
        const disabledAttributes = disabled.get(tag) ?? new Map<string, number>();
        for (const attribute of Array.isArray(node.attributes) ? node.attributes : []) {
          const prop = getNode(attribute);
          if (prop?.type !== "JSXAttribute") continue;
          const name = getNode(prop.name)?.name;
          if (typeof name !== "string") continue;
          increment(attributes, name);
          const expression = getNode(getNode(prop.value)?.expression);
          if (/^with[A-Z]/u.test(name) && expression?.type === "Literal" && expression.value === false) {
            increment(disabledAttributes, name);
          }
        }
        props.set(tag, attributes);
        disabled.set(tag, disabledAttributes);
      }
    }
    if (node.type === "MemberExpression") {
      const [root, id, field] = getPath(node);
      if (root === "data" && id && field) bindings.add(`data.${requestIds.get(id) ?? id}.${field}`);
      if (root === "options" && id) bindings.add(`options.${optionIds.get(id) ?? id}`);
    }
    if (node.type === "CallExpression") {
      const path = getPath(node.callee);
      const method = path.at(-1);
      if (method === "sort" || method === "toSorted") increment(calls, "sort");
      if (method === "filter") increment(calls, "filter");
      if (path.join(".") === "Date.now") increment(calls, "Date.now");
    }
    for (const value of Object.values(node)) {
      for (const child of Array.isArray(value) ? value : [value]) {
        const childNode = getNode(child);
        if (childNode) visit(childNode);
      }
    }
  };
  visit(parseCustomJsxTemplate(template));
  return { tags, props, disabled, calls, bindings };
}

function getNode(value: unknown): AstNode | undefined {
  if (typeof value === "object" && value !== null && "type" in value && typeof value.type === "string") {
    return value as AstNode;
  }
  return undefined;
}

function getPath(value: unknown): string[] {
  const node = getNode(value);
  if (!node) return [];
  if ((node.type === "Identifier" || node.type === "JSXIdentifier") && typeof node.name === "string") {
    return [node.name];
  }
  if (node.type === "ChainExpression") return getPath(node.expression);
  if (node.type === "LogicalExpression") return getPath(node.left);
  if (node.type === "MemberExpression" || node.type === "JSXMemberExpression") {
    const object = getPath(node.object);
    const property = getNode(node.property);
    if (node.computed) {
      if (property?.type !== "Literal" || typeof property.value !== "string") return [];
      return [...object, property.value];
    }
    return [...object, ...getPath(node.property)];
  }
  return [];
}

function increment(counts: Counts, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

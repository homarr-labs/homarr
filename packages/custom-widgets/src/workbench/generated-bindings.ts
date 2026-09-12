import { parseCustomJsxTemplate } from "../jsx/interpreter-parser";
import type { AstNode } from "../jsx/interpreter-foundation";
import { collectTemplateReferences } from "./template-references";

export interface GeneratedBindingDescriptor {
  source: string;
  target: string;
  relationship: "data" | "invoke" | "option";
}
export interface GeneratedBindingRange extends GeneratedBindingDescriptor {
  id: string;
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
}
interface Marker {
  id: string;
  descriptor?: GeneratedBindingDescriptor;
  checksum?: string;
  from: number;
  to: number;
}
const prefix = "homarr:binding:v1:";

/** Portable authoring hints, not a trust or execution boundary. */
export function markGeneratedBinding(content: string, descriptor: GeneratedBindingDescriptor, existingId?: string) {
  parseCustomJsxTemplate(content);
  if (!isDescriptor(descriptor)) throw new Error("Invalid generated binding descriptor");
  const id =
    existingId ?? Array.from(crypto.getRandomValues(new Uint32Array(3)), (value) => value.toString(36)).join("");
  if (!/^[a-z0-9]{1,32}$/u.test(id)) throw new Error("Invalid generated binding ID");
  const body = `\n${content}\n`;
  const metadata = encodeURIComponent(JSON.stringify(descriptor));
  return `{/* ${prefix}${id}:${checksum(body)}:${metadata} */}${body}{/* ${prefix}${id}:end */}`;
}

/** Only complete, unchanged comment pairs at sibling JSX boundaries can be edited visually. */
export function collectGeneratedBindings(
  template: string,
  otherTemplates: readonly string[] = [],
): GeneratedBindingRange[] {
  const ranges: GeneratedBindingRange[] = [];
  const ids = new Map<string, { starts: number; ends: number }>();
  const dynamicInputs: { from: number; to: number }[] = [];
  const visit = (value: unknown, parent?: AstNode) => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, parent);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as AstNode;
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      let opening: Marker | undefined;
      for (const child of node.children as AstNode[]) {
        const marker = readMarker(template, child);
        if (!marker) continue;
        const occurrences = ids.get(marker.id) ?? { starts: 0, ends: 0 };
        ids.set(marker.id, occurrences);
        if (marker.descriptor) {
          occurrences.starts += 1;
          opening = marker;
          continue;
        }
        occurrences.ends += 1;
        if (opening?.id === marker.id && opening.descriptor) {
          const content = template.slice(opening.to, marker.from);
          if (checksum(content) === opening.checksum) {
            ranges.push({
              ...opening.descriptor,
              id: opening.id,
              from: opening.from,
              to: marker.to,
              contentFrom: opening.to,
              contentTo: marker.from,
            });
          }
        }
        opening = undefined;
      }
    }
    if (isUnboundedInputRead(node, parent))
      dynamicInputs.push({ from: Number(node.start) - 2, to: Number(node.end) - 2 });
    for (const [key, child] of Object.entries(node)) {
      if (key !== "loc") visit(child, node);
    }
  };
  try {
    visit(parseCustomJsxTemplate(template));
  } catch {
    return [];
  }
  const references = collectTemplateReferences(template);
  let externalInputs: ReturnType<typeof readExternalInputs> | undefined;
  return ranges.filter((range) => {
    const occurrences = ids.get(range.id);
    if (occurrences?.starts !== 1 || occurrences.ends !== 1) return false;
    if (ranges.some((other) => other !== range && other.from < range.to && other.to > range.from)) return false;
    const bindings = new Set(
      references.filter((ref) => ref.kind === "bind" && inside(ref, range)).map((ref) => ref.name),
    );
    if (!bindings.size) return true;
    // Removing a generated control must not strand code authored elsewhere in the widget.
    if (dynamicInputs.some((ref) => !inside(ref, range))) return false;
    externalInputs ??= readExternalInputs(otherTemplates);
    if (externalInputs.dynamic || [...bindings].some((name) => externalInputs?.names.has(name))) return false;
    return !references.some((ref) => ref.kind === "inputs" && bindings.has(ref.name) && !inside(ref, range));
  });
}

/** Revalidate ownership against current source; never replay offsets from an older draft. */
export function removeGeneratedBindings(
  template: string,
  ids: readonly string[],
  otherTemplates: readonly string[] = [],
): string | null {
  if (!ids.length) return null;
  const wanted = new Set(ids);
  const ranges = collectGeneratedBindings(template, otherTemplates).filter((range) => wanted.has(range.id));
  if (ranges.length !== wanted.size) return null;
  ranges.sort((left, right) => right.from - left.from);
  let candidate = template;
  let boundary = template.length;
  for (const range of ranges) {
    if (range.to > boundary) return null;
    candidate = candidate.slice(0, range.from) + candidate.slice(range.to);
    boundary = range.from;
  }
  try {
    parseCustomJsxTemplate(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function readMarker(template: string, node: AstNode): Marker | undefined {
  if (node.type !== "JSXExpressionContainer" || (node.expression as AstNode | undefined)?.type !== "JSXEmptyExpression")
    return;
  const from = Number(node.start) - 2;
  const to = Number(node.end) - 2;
  const source = template.slice(from, to);
  const match = /^\{\/\* homarr:binding:v1:([a-z0-9]{1,32}):(.+) \*\/\}$/u.exec(source);
  if (!match?.[1] || !match[2]) return;
  const id = match[1];
  if (match[2] === "end") return { id, from, to };
  const separator = match[2].indexOf(":");
  if (separator < 0) return;
  const fingerprint = match[2].slice(0, separator);
  if (!/^\d+-[a-f0-9]{16}$/u.test(fingerprint)) return;
  try {
    const descriptor: unknown = JSON.parse(decodeURIComponent(match[2].slice(separator + 1)));
    if (!isDescriptor(descriptor)) return;
    return { id, descriptor, checksum: fingerprint, from, to };
  } catch {
    return;
  }
}

function isDescriptor(value: unknown): value is GeneratedBindingDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as GeneratedBindingDescriptor;
  return (
    typeof descriptor.source === "string" &&
    descriptor.source.length <= 256 &&
    typeof descriptor.target === "string" &&
    descriptor.target.length <= 256 &&
    ["data", "invoke", "option"].includes(descriptor.relationship)
  );
}

function inside(reference: { from: number; to: number }, range: GeneratedBindingRange) {
  return reference.from >= range.contentFrom && reference.to <= range.contentTo;
}

function isUnboundedInputRead(node: AstNode, parent?: AstNode) {
  if (node.type !== "Identifier" || node.name !== "inputs") return false;
  if (parent?.type !== "MemberExpression" || parent.object !== node) return true;
  return Boolean(parent.computed) && typeof (parent.property as AstNode | undefined)?.value !== "string";
}

function readExternalInputs(templates: readonly string[]) {
  const names = new Set<string>();
  let dynamic = false;
  const visit = (value: unknown, parent?: AstNode) => {
    if (dynamic) return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child, parent);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as AstNode;
    if (isUnboundedInputRead(node, parent)) dynamic = true;
    for (const [key, child] of Object.entries(node)) {
      if (key !== "loc") visit(child, node);
    }
  };
  for (const template of templates) {
    try {
      visit(parseCustomJsxTemplate(template));
    } catch {
      dynamic = true;
    }
    if (dynamic) break;
    for (const reference of collectTemplateReferences(template)) {
      if (reference.kind === "inputs") names.add(reference.name);
    }
  }
  return { names, dynamic };
}

/** Two independent checksums detect source changes; these markers do not authenticate code. */
function checksum(source: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const character = source.charCodeAt(index);
    first = Math.imul(first ^ character, 0x01000193);
    second = Math.imul(second ^ character, 0x85ebca6b);
  }
  return `${source.length}-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

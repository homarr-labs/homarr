import { parseCustomJsxTemplate } from "../jsx/interpreter-parser";
import { collectGeneratedBindings, markGeneratedBinding } from "./generated-bindings";

export interface GeneratedBindingEdit {
  from: number;
  to: number;
  value: string;
}

/** Preserve unchanged generated ownership while applying known, bounded reference edits. */
export function applyGeneratedBindingEdits(
  template: string,
  edits: GeneratedBindingEdit[],
  nodeRename?: { from: string; to: string },
) {
  let operations = [...edits];
  for (const binding of collectGeneratedBindings(template)) {
    const contained = edits.filter((edit) => edit.from >= binding.contentFrom && edit.to <= binding.contentTo);
    const descriptor = { source: binding.source, target: binding.target, relationship: binding.relationship };
    if (nodeRename?.from === descriptor.source) descriptor.source = nodeRename.to;
    if (nodeRename?.from === descriptor.target) descriptor.target = nodeRename.to;
    if (!contained.length && descriptor.source === binding.source && descriptor.target === binding.target) continue;
    if (edits.some((edit) => edit.from < binding.to && edit.to > binding.from && !contained.includes(edit))) continue;
    const body = template.slice(binding.contentFrom, binding.contentTo);
    if (!body.startsWith("\n") || !body.endsWith("\n")) continue;
    const updatedBody = applyEdits(
      body,
      contained.map((edit) => ({
        ...edit,
        from: edit.from - binding.contentFrom,
        to: edit.to - binding.contentFrom,
      })),
    );
    operations = operations.filter((edit) => !contained.includes(edit));
    operations.push({
      from: binding.from,
      to: binding.to,
      value: markGeneratedBinding(updatedBody.slice(1, -1), descriptor, binding.id),
    });
  }
  const result = applyEdits(template, operations);
  parseCustomJsxTemplate(result);
  return result;
}

function applyEdits(template: string, edits: GeneratedBindingEdit[]) {
  let result = template;
  let boundary = template.length;
  for (const edit of edits.toSorted((left, right) => right.from - left.from)) {
    if (
      !Number.isInteger(edit.from) ||
      !Number.isInteger(edit.to) ||
      edit.from < 0 ||
      edit.to < edit.from ||
      edit.to > boundary
    )
      throw new Error("Invalid template edit ranges");
    result = result.slice(0, edit.from) + edit.value + result.slice(edit.to);
    boundary = edit.from;
  }
  return result;
}

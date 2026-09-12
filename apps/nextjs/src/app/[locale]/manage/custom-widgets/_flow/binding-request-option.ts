import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { collectTemplateReferences } from "@homarr/custom-widgets/workbench";
import { collectCustomWidgetRequestReferences } from "@homarr/custom-widgets/core";
import { buildDefinition, isRecord } from "../_custom-widget-form-utils";
import { readObject, record } from "./graph";
import type { FlowBindingIntent } from "./connection-planner";
import type { BindingChoices } from "./binding-code";
import { isCompatibleNativeOption, nativeInputFields } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";

const parameters = (value: Record<string, unknown>) =>
  collectCustomWidgetRequestReferences({
    path: String(value.path ?? ""),
    query: record(value.query),
    body: value.body ?? value.input,
  }).params;

export function requestOptionCandidate(
  intent: FlowBindingIntent,
  values: CustomWidgetFormValues,
  choices: BindingChoices,
  schema: NativeInputSchema = {},
) {
  if (!Object.hasOwn(readObject(values.options), choices.option)) throw new Error("Choose an existing option");
  const key = choices.field.trim();
  if (intent.native) {
    const fields = nativeInputFields(schema);
    const target = fields.find((field) => field.name === key);
    if (
      fields.length &&
      (!target || !isCompatibleNativeOption(readObject(values.options)[choices.option], target.schema))
    )
      throw new Error("Choose an option compatible with this capability field");
  }
  if (!key || key.length > 256 || ["__proto__", "constructor", "prototype"].includes(key))
    throw new Error("Choose a valid request field");
  const reference = { $option: choices.option };
  if (intent.native && choices.location !== "input") throw new Error("Choose a native capability input");
  if (!intent.native && choices.location === "input") throw new Error("Choose an HTTP request field");
  const field = intent.native ? "extensions" : "requests";
  const document = readObject(values[field]);
  let entries = document;
  if (intent.native) entries = record(document.native);
  const descriptor = record(entries[intent.identifier]);
  const updated = { ...descriptor };
  if (choices.location === "path") {
    const placeholder = `{param:${key}}`;
    const path = String(descriptor.path ?? "");
    if (!path.includes(placeholder)) throw new Error("Choose an existing path parameter");
    updated.path = path.replaceAll(placeholder, `{option:${choices.option}}`);
  } else {
    const current = descriptor[choices.location];
    if (current !== undefined && (!isRecord(current) || "$option" in current || "$param" in current))
      throw new Error("This field is code-owned. Edit its existing binding before adding a named field.");
    updated[choices.location] = { ...record(current), [key]: reference };
  }
  const nextEntries = { ...entries, [intent.identifier]: updated };
  const remaining = parameters(updated);
  if ([...parameters(descriptor)].some((name) => !remaining.has(name))) {
    const templates = [
      values.template,
      ...Object.values(record(readObject(values.extensions).fragments)).filter(
        (value): value is string => typeof value === "string",
      ),
    ];
    if (
      templates.some((template) =>
        collectTemplateReferences(template).some(
          (entry) =>
            ["request", "native"].includes(entry.kind) && (entry.name === intent.identifier || entry.name === "*"),
        ),
      )
    )
      throw new Error(
        "This change removes an invocation parameter used by existing JSX. Update that control in code first.",
      );
  }
  let nextDocument = nextEntries;
  if (intent.native) nextDocument = { ...document, native: nextEntries };
  const patch = { [field]: JSON.stringify(nextDocument, null, 2) };
  const parsed = buildDefinition({ ...values, ...patch });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid widget definition");
  return { patch, preview: JSON.stringify(updated, null, 2) };
}

import { collectCustomWidgetRequestReferences } from "@homarr/custom-widgets/core";
import {
  collectTemplateReferences,
  insertCustomWidgetTemplateContent,
  markGeneratedBinding,
  removeGeneratedBindings,
} from "@homarr/custom-widgets/workbench";
import type { GeneratedBindingDescriptor } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { buildDefinition } from "../_custom-widget-form-utils";
import { readObject, record } from "./graph";
import type { FlowBindingIntent } from "./connection-planner";
import { isGeneratedConnectionCurrent } from "./connection-planner";
import { nativeLiteralDefault, nativeParameterFields } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";
import { freshFlowIdentifier } from "./identifiers";

export interface BindingParameter {
  mode: "control" | "input" | "option" | "literal";
  name: string;
  controlName: string;
  value: unknown;
}
export interface BindingChoices {
  format: "json" | "text" | "list" | "table";
  path: string;
  columns: string;
  label: string;
  option: string;
  field: string;
  location: "query" | "body" | "path" | "input";
  params: Record<string, BindingParameter>;
}
export interface BindingLabels {
  loading: string;
  empty: string;
  run: string;
  error: string;
}

export function bindingDescriptor(intent: FlowBindingIntent) {
  if (intent.native) return record(record(readObject(intent.snapshot.extensions).native)[intent.identifier]);
  return record(readObject(intent.snapshot.requests)[intent.identifier]);
}
export function bindingParameters(intent: FlowBindingIntent, schema: NativeInputSchema) {
  const descriptor = bindingDescriptor(intent);
  if (intent.native) return nativeParameterFields(descriptor.input, schema);
  const references = collectCustomWidgetRequestReferences({
    path: String(descriptor.path ?? ""),
    query: record(descriptor.query),
    body: descriptor.body,
  });
  return [...references.params].map((name) => ({ name, schema: {} as NativeInputSchema }));
}
export function createBindingParameters(intent: FlowBindingIntent, schema: NativeInputSchema) {
  const occupied = Object.fromEntries(
    collectTemplateReferences(intent.snapshot.template)
      .filter((ref) => ref.kind === "bind")
      .map((ref) => [ref.name, true]),
  );
  return Object.fromEntries(
    bindingParameters(intent, schema).map(({ name, schema: field }) => {
      const binding = freshFlowIdentifier(occupied, `${intent.identifier}-${name}`);
      occupied[binding] = true;
      return [
        name,
        {
          mode: "control",
          name: binding,
          controlName: binding,
          value: nativeLiteralDefault(field),
        } satisfies BindingParameter,
      ];
    }),
  );
}

const quote = JSON.stringify;
function propertyPath(root: string, path: string) {
  const parts = path.trim().split(".").filter(Boolean);
  if (parts.length > 16 || parts.some((part) => ["constructor", "prototype", "__proto__"].includes(part)))
    throw new Error("Invalid data path");
  return root + parts.map((part) => `?.[${quote(part)}]`).join("");
}
function parameterCode(choices: BindingChoices) {
  const controls: string[] = [];
  const entries = Object.entries(choices.params).map(([key, parameter]) => {
    let expression = quote(parameter.value);
    if (!["string", "number", "boolean"].includes(typeof parameter.value))
      throw new Error("Parameters must be text, numbers, or booleans");
    if (parameter.mode === "input" || parameter.mode === "control") expression = `inputs[${quote(parameter.name)}]`;
    if (parameter.mode === "option") expression = `options[${quote(parameter.name)}]`;
    if (parameter.mode === "control") {
      let component = "TextInput";
      let defaultProp = "defaultValue";
      if (typeof parameter.value === "number") component = "NumberInput";
      if (typeof parameter.value === "boolean") {
        component = "Switch";
        defaultProp = "defaultChecked";
      }
      controls.push(
        `<${component} bind=${quote(parameter.name)} label={${quote(key)}} ${defaultProp}={${quote(parameter.value)}} />`,
      );
    }
    return `${quote(key)}: ${expression}`;
  });
  return { controls, params: `params={{ ${entries.join(", ")} }}` };
}
function renderValue(root: string, choices: BindingChoices, labels: BindingLabels) {
  const value = propertyPath(root, choices.path);
  if (choices.format === "text") return `<Text>{String(${value} ?? ${quote(labels.empty)})}</Text>`;
  if (choices.format === "json")
    return `{(${value} ?? null) === null ? <Text c="dimmed">{${quote(labels.empty)}}</Text> : <Code block>{JSON.stringify(${value})}</Code>}`;
  const rows = `(${value}).slice(0, 50)`;
  let body = `${rows}.map((row, index) => <Text key={index} size="sm">{JSON.stringify(row)}</Text>)`;
  if (choices.format === "table") {
    const columns = choices.columns
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (!columns.length) throw new Error("Choose at least one table column");
    const header = columns.map((column) => `<Table.Th>{${quote(column)}}</Table.Th>`).join("");
    const cells = columns
      .map((column) => `<Table.Td>{String(${propertyPath("row", column)} ?? "")}</Table.Td>`)
      .join("");
    body = `<Table.ScrollContainer minWidth={300}><Table><Table.Thead><Table.Tr>${header}</Table.Tr></Table.Thead><Table.Tbody>{${rows}.map((row, index) => <Table.Tr key={index}>${cells}</Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>`;
  } else body = `<Stack gap="xs">{${body}}</Stack>`;
  return `{Array.isArray(${value}) && ${value}.length > 0 ? (${body}) : <Text c="dimmed">{${quote(labels.empty)}}</Text>}`;
}

export function createBindingSnippet(intent: FlowBindingIntent, choices: BindingChoices, labels: BindingLabels) {
  if (intent.kind === "option") {
    if (!record(readObject(intent.snapshot.options)[choices.option]).control)
      throw new Error("Choose an existing option");
    return `<Text>{String(options[${quote(choices.option)}] ?? "")}</Text>`;
  }
  const descriptor = bindingDescriptor(intent);
  const { controls, params } = parameterCode(choices);
  let content: string;
  if (intent.kind === "action") {
    let component = "ActionButton";
    let idProp = "requestId";
    if (intent.native) {
      component = "NativeActionButton";
      idProp = "nativeId";
    }
    content = `<${component} ${idProp}=${quote(intent.identifier)} ${params} variant="default">{${quote(choices.label || labels.run)}}</${component}>`;
  } else if (descriptor.trigger === "manual" || descriptor.capability === "beszel.live") {
    let component = "SubFetch";
    let idProp = "requestId";
    let live = "";
    if (intent.native) {
      component = "NativeQuery";
      idProp = "nativeId";
    }
    if (descriptor.capability === "beszel.live") live = " live";
    content = `<${component} ${idProp}=${quote(intent.identifier)} ${params} trigger="manual"${live}>{(result, meta) => (<Stack gap="xs">${renderValue("result", choices, labels)}</Stack>)}</${component}>`;
  } else {
    const status = `status[${quote(intent.identifier)}]`;
    content = `<Stack gap="xs">\n{${status}?.loading ? <Text c="dimmed">{${quote(labels.loading)}}</Text> : ${status}?.error ? <Alert color="red">{String(${status}.error)}</Alert> : (${`<Stack gap="xs">${renderValue(`data[${quote(intent.identifier)}]`, choices, labels)}</Stack>`})}\n<RefreshButton />\n</Stack>`;
  }
  if (!controls.length) return content;
  return `<Stack gap="xs">\n${controls.join("\n")}\n${content}\n</Stack>`;
}

export function bindingCandidate(
  intent: FlowBindingIntent,
  values: CustomWidgetFormValues,
  choices: BindingChoices,
  labels: BindingLabels,
) {
  const options = readObject(values.options);
  const bindings = collectTemplateReferences(values.template)
    .filter((entry) => entry.kind === "bind")
    .map((entry) => entry.name);
  for (const parameter of Object.values(choices.params)) {
    if (
      parameter.mode === "option" &&
      !["string", "number", "boolean"].includes(typeof record(options[parameter.name]).default)
    )
      throw new Error("Choose an option with a text, number, or boolean value");
    if (parameter.mode === "input" && !bindings.includes(parameter.name))
      throw new Error("Choose an existing widget input");
    if (parameter.mode === "control" && bindings.includes(parameter.name))
      throw new Error("A widget input with this name already exists");
  }
  const snippet = createBindingSnippet(intent, choices, labels);
  let template = values.template;
  if (intent.replaceGeneratedIds) {
    if (!isGeneratedConnectionCurrent(values, intent.replaceEdgeId, intent.replaceGeneratedIds))
      throw new Error("The original connection now includes code-owned references. Edit this relationship in code.");
    const fragments = Object.values(record(readObject(values.extensions).fragments)).filter(
      (value): value is string => typeof value === "string",
    );
    const removed = removeGeneratedBindings(template, intent.replaceGeneratedIds, fragments);
    if (removed === null) throw new Error("The original binding changed. Edit this relationship in code.");
    template = removed;
  }
  const descriptor: GeneratedBindingDescriptor = { source: intent.source, target: "widget", relationship: "data" };
  if (intent.kind === "option") descriptor.relationship = "option";
  if (intent.kind === "action" || (!intent.native && bindingDescriptor(intent).trigger === "manual")) {
    descriptor.source = "widget";
    descriptor.target = intent.source;
    descriptor.relationship = "invoke";
  }
  const candidate = {
    ...values,
    template: insertCustomWidgetTemplateContent(template, markGeneratedBinding(snippet, descriptor)),
  };
  const parsed = buildDefinition(candidate);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid widget definition");
  return { patch: { template: candidate.template }, preview: snippet };
}

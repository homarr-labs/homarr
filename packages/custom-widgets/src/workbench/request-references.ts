import { collectTemplateReferences } from "./template-references";
import { applyGeneratedBindingEdits } from "./generated-binding-edits";
import type { GeneratedBindingEdit } from "./generated-binding-edits";
import { customWidgetDefinitionSchema } from "../core/custom-jsx-schema";
import { customWidgetIdentifierSchema } from "../core/request-schema";
import type { HomarrCustomWidgetV2 } from "../core/custom-jsx-schema";

export function renameCustomWidgetRequest(
  definition: HomarrCustomWidgetV2,
  currentId: string,
  nextId: string,
): HomarrCustomWidgetV2 {
  const parsedId = customWidgetIdentifierSchema.safeParse(nextId);
  if (!parsedId.success) throw new Error(parsedId.error.issues[0]?.message ?? "Invalid request ID");
  if (!definition.requests[currentId]) throw new Error(`Unknown request '${currentId}'`);
  if (currentId !== nextId && definition.requests[nextId]) {
    throw new Error(`Request '${nextId}' already exists`);
  }

  const candidate = {
    ...definition,
    requests: Object.fromEntries(
      Object.entries(definition.requests).map(([id, request]) => [
        id === currentId ? nextId : id,
        { ...request, invalidates: request.invalidates?.map((entry) => (entry === currentId ? nextId : entry)) },
      ]),
    ),
    options: replaceDynamicOptionRequest(definition.options, currentId, nextId),
    template: replaceTemplateRequestReferences(definition.template, currentId, nextId),
    extensions: definition.extensions && {
      ...definition.extensions,
      fragments: mapFragments(definition.extensions.fragments, (source) =>
        replaceTemplateRequestReferences(source, currentId, nextId),
      ),
    },
  };
  return customWidgetDefinitionSchema.parse(candidate);
}

export function renameCustomWidgetOption(
  definition: HomarrCustomWidgetV2,
  currentName: string,
  nextName: string,
): HomarrCustomWidgetV2 {
  const parsedName = customWidgetIdentifierSchema.safeParse(nextName);
  if (!parsedName.success) throw new Error(parsedName.error.issues[0]?.message ?? "Invalid option name");
  if (!definition.options[currentName]) throw new Error(`Unknown option '${currentName}'`);
  if (currentName !== nextName && definition.options[nextName]) throw new Error(`Option '${nextName}' already exists`);

  return customWidgetDefinitionSchema.parse({
    ...definition,
    options: Object.fromEntries(
      Object.entries(definition.options).map(([name, option]) => [name === currentName ? nextName : name, option]),
    ),
    requests: Object.fromEntries(
      Object.entries(definition.requests).map(([id, request]) => [
        id,
        {
          ...request,
          path: request.path.replaceAll(`{option:${currentName}}`, `{option:${nextName}}`),
          query: replaceOptionReferences(request.query, currentName, nextName),
          body: replaceOptionReferences(request.body, currentName, nextName),
        },
      ]),
    ),
    template: replaceTemplateOptionReferences(definition.template, currentName, nextName),
    extensions: definition.extensions && {
      ...definition.extensions,
      fragments: mapFragments(definition.extensions.fragments, (source) =>
        replaceTemplateOptionReferences(source, currentName, nextName),
      ),
      native:
        definition.extensions.native &&
        Object.fromEntries(
          Object.entries(definition.extensions.native).map(([id, capability]) => [
            id,
            {
              ...capability,
              integrationOption: capability.integrationOption === currentName ? nextName : capability.integrationOption,
              input: replaceOptionReferences(capability.input, currentName, nextName),
            },
          ]),
        ),
    },
  });
}

function replaceDynamicOptionRequest<T>(value: T, currentId: string, nextId: string): T {
  if (Array.isArray(value)) return value.map((entry) => replaceDynamicOptionRequest(entry, currentId, nextId)) as T;
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const replaced = Object.fromEntries(
    Object.entries(record).map(([key, child]) => [key, replaceDynamicOptionRequest(child, currentId, nextId)]),
  );
  if (record.request === currentId && "valuePath" in record && "labelPath" in record) replaced.request = nextId;
  return replaced as T;
}

function replaceTemplateRequestReferences(template: string, currentId: string, nextId: string) {
  return replaceParsedReferences(template, currentId, nextId, ["data", "status", "request"], {
    from: `request:${currentId}`,
    to: `request:${nextId}`,
  });
}

function replaceOptionReferences<T>(value: T, currentName: string, nextName: string): T {
  if (Array.isArray(value)) return value.map((entry) => replaceOptionReferences(entry, currentName, nextName)) as T;
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 1 && entries[0]?.[0] === "$option" && entries[0][1] === currentName) {
    return { $option: nextName } as T;
  }
  return Object.fromEntries(
    entries.map(([key, child]) => [key, replaceOptionReferences(child, currentName, nextName)]),
  ) as T;
}

function replaceTemplateOptionReferences(template: string, currentName: string, nextName: string) {
  return replaceParsedReferences(template, currentName, nextName, ["options"]);
}

function replaceParsedReferences(
  template: string,
  current: string,
  next: string,
  kinds: string[],
  nodeRename?: { from: string; to: string },
) {
  const references = collectTemplateReferences(template)
    .filter((reference) => reference.name === current && kinds.includes(reference.kind))
    .toSorted((left, right) => right.from - left.from);
  const edits: GeneratedBindingEdit[] = [];
  for (const reference of references) {
    const original = template.slice(reference.from, reference.to);
    let from = reference.from;
    let replacement = next;
    if (original.startsWith('"')) replacement = JSON.stringify(next);
    else if (original.startsWith("'")) replacement = "'" + next + "'";
    else if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(next)) {
      if (template[from - 1] !== ".") {
        throw new Error("Use bracket notation for this reference in code before renaming it.");
      }
      if (template[from - 2] !== "?") from -= 1;
      replacement = `[${JSON.stringify(next)}]`;
    }
    edits.push({ from, to: reference.to, value: replacement });
  }
  return applyGeneratedBindingEdits(template, edits, nodeRename);
}

function mapFragments(fragments: Record<string, string> | undefined, replace: (template: string) => string) {
  if (!fragments) return undefined;
  return Object.fromEntries(Object.entries(fragments).map(([id, template]) => [id, replace(template)]));
}

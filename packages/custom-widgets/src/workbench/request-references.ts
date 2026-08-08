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
  const escaped = escapeRegExp(currentId);
  return template
    .replace(new RegExp(`(requestId\\s*=\\s*["'])${escaped}(["'])`, "gu"), `$1${nextId}$2`)
    .replace(new RegExp(`((?:data|status)\\s*\\[\\s*["'])${escaped}(["']\\s*\\])`, "gu"), `$1${nextId}$2`)
    .replace(new RegExp(`((?:data|status)\\.)${escaped}\\b`, "gu"), `$1${nextId}`);
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
  const escaped = escapeRegExp(currentName);
  return template
    .replace(new RegExp(`(options\\s*\\[\\s*["'])${escaped}(["']\\s*\\])`, "gu"), `$1${nextName}$2`)
    .replace(new RegExp(`(options\\.)${escaped}\\b`, "gu"), `$1${nextName}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

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
  if (!definition.requests.some((request) => request.id === currentId))
    throw new Error(`Unknown request '${currentId}'`);
  if (currentId !== nextId && definition.requests.some((request) => request.id === nextId)) {
    throw new Error(`Request '${nextId}' already exists`);
  }

  const candidate = {
    ...definition,
    requests: definition.requests.map((request) => ({
      ...request,
      id: request.id === currentId ? nextId : request.id,
      invalidates: request.invalidates?.map((id) => (id === currentId ? nextId : id)),
    })),
    optionsSchema: replaceDynamicOptionRequest(definition.optionsSchema, currentId, nextId),
    template: replaceTemplateRequestReferences(definition.template, currentId, nextId),
  };
  return customWidgetDefinitionSchema.parse(candidate);
}

function replaceDynamicOptionRequest<T>(value: T, currentId: string, nextId: string): T {
  if (Array.isArray(value)) return value.map((entry) => replaceDynamicOptionRequest(entry, currentId, nextId)) as T;
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const replaced = Object.fromEntries(
    Object.entries(record).map(([key, child]) => [key, replaceDynamicOptionRequest(child, currentId, nextId)]),
  );
  if (record.requestId === currentId && "valuePath" in record && "labelPath" in record) replaced.requestId = nextId;
  return replaced as T;
}

function replaceTemplateRequestReferences(template: string, currentId: string, nextId: string) {
  const escaped = escapeRegExp(currentId);
  return template
    .replace(new RegExp(`(requestId\\s*=\\s*["'])${escaped}(["'])`, "gu"), `$1${nextId}$2`)
    .replace(new RegExp(`((?:data|status)\\s*\\[\\s*["'])${escaped}(["']\\s*\\])`, "gu"), `$1${nextId}$2`)
    .replace(new RegExp(`((?:data|status)\\.)${escaped}\\b`, "gu"), `$1${nextId}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

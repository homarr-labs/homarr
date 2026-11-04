import type { CustomWidgetSource } from "../core/request-schema";
import { getCustomWidgetRequiredSecretKinds } from "../core/secret-requirements";
import { hasSameCustomWidgetSourceAuthentication } from "../core/source-setup";
import type { CustomWidgetFormValues } from "./form-schema";

type CustomWidgetSourceDraft = Pick<CustomWidgetFormValues, "sources" | "requests" | "secrets">;

export type CustomWidgetSourceDraftEdit =
  | { type: "update"; index: number; changes: Partial<CustomWidgetSource> & { id?: string } }
  | { type: "remove"; index: number };

export type CustomWidgetSourceDraftPatch = Partial<CustomWidgetSourceDraft>;

export type CustomWidgetSourceDraftResult =
  | { success: true; patch: CustomWidgetSourceDraftPatch }
  | { success: false; error: "duplicateSourceId" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function editCustomWidgetSource(
  values: CustomWidgetSourceDraft,
  edit: CustomWidgetSourceDraftEdit,
  isPersistedDefinition: boolean,
): CustomWidgetSourceDraftResult {
  const sources = parseSources(values.sources);
  const previous = sources[edit.index];
  if (!previous) return { success: true, patch: {} };

  let sourceEntries: Array<readonly [string, Record<string, unknown>]> = sources.map(
    ({ id, ...source }) => [id, source] as const,
  );
  let requests = values.requests;
  let secrets = values.secrets;

  if (edit.type === "remove") {
    sourceEntries = sourceEntries.filter((_, index) => index !== edit.index);
    if (previous.id) {
      if (getDependentRequestIds(requests, previous.id).length > 0) {
        requests = JSON.stringify(removeDependentRequests(requests, previous.id), null, 2);
      }
      secrets = secrets.filter((secret) => secret.sourceId !== previous.id);
    }
  } else {
    const { changes } = edit;
    const nextId = changes.id ?? previous.id;
    if (nextId && sources.some((source, index) => index !== edit.index && source.id === nextId)) {
      return { success: false, error: "duplicateSourceId" };
    }

    sourceEntries = sourceEntries.map(([id, source], index) => {
      if (index !== edit.index) return [id, source] as const;
      if (changes.type) return [nextId, { name: source.name, ...changes, id: undefined }] as const;
      return [nextId, { ...source, ...changes, id: undefined }] as const;
    });

    if (changes.type) {
      secrets = secrets.filter((secret) => secret.sourceId !== previous.id);
    } else if (changes.auth !== undefined) {
      secrets = filterSecretsForSourceAuthentication(secrets, previous.id, changes.auth);
      if (
        isPersistedDefinition &&
        previous.type !== "integration" &&
        typeof changes.auth === "object" &&
        changes.auth.type === "headers" &&
        !hasSameCustomWidgetSourceAuthentication(previous, { ...previous, auth: changes.auth })
      ) {
        secrets = secrets.map((secret) => {
          if (secret.sourceId !== previous.id || secret.hasValue === false) return secret;
          return { ...secret, hasValue: false };
        });
      }
    }

    if (previous.id && nextId && previous.id !== nextId) {
      requests = renameSourceRequests(requests, previous.id, nextId);
      secrets = secrets.map((secret) => {
        if (secret.sourceId !== previous.id) return secret;
        return { ...secret, sourceId: nextId };
      });
    }
  }

  const patch: CustomWidgetSourceDraftPatch = {};
  const sourcesJson = JSON.stringify(Object.fromEntries(sourceEntries), null, 2);
  if (sourcesJson !== values.sources) patch.sources = sourcesJson;
  if (requests !== values.requests) patch.requests = requests;
  if (secrets.length !== values.secrets.length || secrets.some((secret, index) => secret !== values.secrets[index])) {
    patch.secrets = secrets;
  }
  return { success: true, patch };
}

export function parseSources(value: string): Array<CustomWidgetSource & { id: string }> {
  const parsed = parseRecord(value);
  if (!parsed) return [];
  return Object.entries(parsed)
    .flatMap(([id, entry]) => (isRecord(entry) ? [{ id, ...(entry as CustomWidgetSource) }] : []))
    .toSorted((left, right) => Number(right.id === "default") - Number(left.id === "default"));
}

export function filterSecretsForSourceAuthentication(
  secrets: CustomWidgetFormValues["secrets"],
  sourceId: string,
  authType: Parameters<typeof getCustomWidgetRequiredSecretKinds>[0],
) {
  const requiredKinds = new Set<string>(getCustomWidgetRequiredSecretKinds(authType));
  return secrets.filter((secret) => secret.sourceId !== sourceId || requiredKinds.has(secret.kind));
}

export function getDependentRequestIds(requestsJson: string, sourceId: string) {
  return Object.entries(parseRecord(requestsJson) ?? {}).flatMap(([requestId, request]) =>
    isRecord(request) && request.source === sourceId ? [requestId] : [],
  );
}

export function removeDependentRequests(requestsJson: string, sourceId: string) {
  return Object.fromEntries(
    Object.entries(parseRecord(requestsJson) ?? {}).filter(
      ([, request]) => !isRecord(request) || request.source !== sourceId,
    ),
  );
}

function renameSourceRequests(requestsJson: string, currentId: string, nextId: string) {
  const requests = parseRecord(requestsJson);
  if (!requests) return requestsJson;
  let changed = false;
  const entries = Object.entries(requests).map(([id, request]) => {
    if (!isRecord(request) || request.source !== currentId) return [id, request];
    changed = true;
    return [id, { ...request, source: nextId }];
  });
  if (!changed) return requestsJson;
  return JSON.stringify(Object.fromEntries(entries), null, 2);
}

function parseRecord(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (isRecord(parsed)) return parsed;
  } catch {
    return undefined;
  }
  return undefined;
}

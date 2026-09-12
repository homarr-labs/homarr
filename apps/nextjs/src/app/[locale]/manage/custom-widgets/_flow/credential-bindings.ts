import { createId } from "@homarr/common";
import { customWidgetSourcesSchema, getCustomWidgetRequiredSecretKinds } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

export type SourceBindings = Record<string, string>;

/** Only definition identities enter history. Credential values remain in the live form. */
export function reconcileDefinitionBindings(raw: string, current: SourceBindings): SourceBindings {
  try {
    const sources: unknown = JSON.parse(raw);
    if (!sources || typeof sources !== "object" || Array.isArray(sources)) return current;
    return Object.fromEntries(Object.keys(sources).map((id) => [id, current[id] ?? createId()]));
  } catch {
    return current;
  }
}

export function restoreCredentialBindings(
  secrets: CustomWidgetFormValues["secrets"],
  previous: SourceBindings,
  next: SourceBindings,
  rawSources: string,
) {
  let sources;
  try {
    sources = customWidgetSourcesSchema.safeParse(JSON.parse(rawSources));
  } catch {
    return secrets;
  }
  if (!sources.success) return secrets;
  const names = new Map(Object.entries(next).map(([name, identity]) => [identity, name]));
  return secrets.flatMap((secret) => {
    const sourceId = names.get(previous[secret.sourceId] ?? "");
    if (!sourceId) return [];
    const source = sources.data[sourceId];
    if (!source) return [];
    let auth: Parameters<typeof getCustomWidgetRequiredSecretKinds>[0];
    if (typeof source.auth === "object") auth = source.auth.type;
    else auth = source.auth;
    if (!new Set<string>(getCustomWidgetRequiredSecretKinds(auth)).has(secret.kind)) return [];
    let savedSourceId = secret.savedSourceId;
    if (secret.hasValue && sourceId !== secret.sourceId) savedSourceId ??= secret.sourceId;
    return [{ ...secret, sourceId, savedSourceId }];
  });
}

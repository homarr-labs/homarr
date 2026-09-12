import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

type Secrets = CustomWidgetFormValues["secrets"];

export function getSourceSecretRenames(secrets: Secrets) {
  return Object.fromEntries(
    secrets.flatMap((secret) => {
      if (!secret.hasValue || secret.value.trim() || !secret.savedSourceId || secret.savedSourceId === secret.sourceId)
        return [];
      return [[secret.savedSourceId, secret.sourceId]];
    }),
  );
}

/** A save changes where credentials live, including when the user renamed a
 * source again while that save was in flight. Preserve newer input values. */
export function markSourceSecretsSaved(
  submitted: Secrets,
  current: Secrets,
  presence?: Array<{ sourceId: string; kind: string }>,
): Secrets {
  return current.map((secret) => {
    const saved = submitted.find(
      (candidate) =>
        candidate.kind === secret.kind &&
        (candidate.savedSourceId ?? candidate.sourceId) === (secret.savedSourceId ?? secret.sourceId),
    );
    if (!saved) return secret;
    const { savedSourceId: _previousSourceId, ...next } = secret;
    let hasValue = Boolean(saved.hasValue || saved.value.trim());
    if (presence) hasValue = presence.some((entry) => entry.sourceId === saved.sourceId && entry.kind === saved.kind);
    return {
      ...next,
      hasValue,
      value: secret.value === saved.value ? "" : secret.value,
      ...(hasValue && secret.sourceId !== saved.sourceId ? { savedSourceId: saved.sourceId } : {}),
    };
  });
}

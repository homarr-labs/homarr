import { isRecord } from "@homarr/common";
import { customWidgetDefinitionSchema, getCustomWidgetRequiredSecretKinds } from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { isHttpIntegrationKind } from "@homarr/definitions";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

export interface CustomWidgetWorkbenchForm {
  values: CustomWidgetFormValues;
  errors: Record<string, string>;
  getValues(): CustomWidgetFormValues;
  setValues(values: CustomWidgetFormValues): void;
  setFieldValue<Key extends keyof CustomWidgetFormValues>(field: Key, value: CustomWidgetFormValues[Key]): void;
  setFieldError(field: keyof CustomWidgetFormValues, message: string): void;
  clearFieldError(field: keyof CustomWidgetFormValues): void;
}

export { isRecord };

export function buildDefinition(values: CustomWidgetFormValues) {
  return customWidgetDefinitionSchema.safeParse({
    $schema: "homarr-custom-widget-v2",
    name: values.name,
    description: values.description || undefined,
    iconUrl: values.iconUrl || undefined,
    sources: parseJson(values.sources),
    requests: parseJson(values.requests),
    options: parseJson(values.options),
    template: values.template,
  });
}

export function filterSecretsForSourceAuthentication(
  secrets: CustomWidgetFormValues["secrets"],
  sourceId: string,
  authType: Parameters<typeof getCustomWidgetRequiredSecretKinds>[0],
) {
  const requiredKinds = new Set<string>(getCustomWidgetRequiredSecretKinds(authType));
  return secrets.filter((secret) => secret.sourceId !== sourceId || requiredKinds.has(secret.kind));
}

export function applyDefinition(form: CustomWidgetWorkbenchForm, widget: HomarrCustomWidgetV2) {
  form.setValues({
    ...form.getValues(),
    name: widget.name,
    description: widget.description ?? "",
    iconUrl: widget.iconUrl ?? "",
    sources: JSON.stringify(widget.sources, null, 2),
    requests: JSON.stringify(widget.requests, null, 2),
    options: JSON.stringify(widget.options, null, 2),
    template: widget.template,
  });
}

export function parseSources(value: string) {
  const parsed = parseJson(value);
  if (!isRecord(parsed)) return [];
  return Object.entries(parsed)
    .flatMap(([id, source]) => {
      const projected =
        isRecord(source) && source.type !== "integration" && source.auth === undefined
          ? { ...source, auth: "none" }
          : source;
      return isSourceDraft(projected) ? [{ id, ...projected }] : [];
    })
    .toSorted((left, right) => Number(right.id === "default") - Number(left.id === "default"));
}

function isSourceDraft(value: unknown): value is CustomWidgetSource {
  if (!isRecord(value)) return false;
  if (value.name !== undefined && typeof value.name !== "string") return false;
  if (value.type === "integration")
    return (
      typeof value.integrationKind === "string" &&
      isHttpIntegrationKind(value.integrationKind) &&
      (value.integrationId === undefined || typeof value.integrationId === "string")
    );
  if (value.type !== undefined && value.type !== "http") return false;
  if (typeof value.baseUrl !== "string" || !["public", "private", "loopback"].includes(String(value.networkScope)))
    return false;
  if (value.auth === "none" || value.auth === "bearer" || value.auth === "basic") return true;
  return (
    isRecord(value.auth) &&
    (value.auth.type === "apiKeyHeader" || value.auth.type === "apiKeyQuery") &&
    typeof value.auth.name === "string"
  );
}

export function parseJson(value: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
}

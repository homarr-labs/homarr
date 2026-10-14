import { z } from "zod/v4";

import type { EditorOption, EditorState, WidgetEditorDomain } from "./contracts";

export function createWidgetEditorSchema(
  options: Record<string, EditorOption>,
  domain: WidgetEditorDomain,
  integrationsRequired: boolean,
  maxIntegrations: number,
) {
  const fields: Record<string, z.ZodType<unknown>> = {};
  for (const [property, option] of Object.entries(options)) {
    if (!("validate" in option) || !option.validate) continue;
    fields[property] = option.type === "multiText" ? z.array(option.validate).optional() : option.validate;
  }
  const refine: unknown = Reflect.get(options, domain.optionsSuperRefine);
  let optionsSchema = z.object(fields);
  if (typeof refine === "function") {
    const sourceRefine = refine as (data: Record<string, unknown>, context: z.RefinementCtx) => void;
    optionsSchema = optionsSchema.superRefine(sourceRefine);
  }
  let integrationIds = z.array(z.string());
  if (integrationsRequired) integrationIds = integrationIds.min(1);
  if (Number.isFinite(maxIntegrations)) integrationIds = integrationIds.max(maxIntegrations);
  return z.object({ options: optionsSchema, integrationIds, advancedOptions: domain.itemAdvancedOptionsSchema });
}

export function normalizeEditorState(value: EditorState): EditorState {
  return {
    ...value,
    advancedOptions: { ...value.advancedOptions, title: value.advancedOptions.title?.trim() || null },
  };
}

export function issueMessages(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((issue) => [issue.path.map(String).join("."), issue.message]));
}

export function extractSaveIssues(error: unknown): Record<string, string> {
  const entries: [string, string][] = [];
  if (typeof error !== "object" || error === null) return {};
  const data = "data" in error ? error.data : undefined;
  if (typeof data === "object" && data !== null && "zodError" in data) {
    const zodError = data.zodError;
    if (typeof zodError === "object" && zodError !== null) {
      const fields = "fieldErrors" in zodError ? zodError.fieldErrors : undefined;
      if (typeof fields === "object" && fields !== null) {
        for (const [path, messages] of Object.entries(fields)) {
          if (!Array.isArray(messages)) continue;
          for (const message of messages) if (typeof message === "string") entries.push([path, message]);
        }
      }
      const forms = "formErrors" in zodError ? zodError.formErrors : undefined;
      if (Array.isArray(forms))
        forms.forEach((message, index) => {
          if (typeof message === "string") entries.push([`form.${index}`, message]);
        });
    }
  }
  let issues: unknown = typeof data === "object" && data !== null && "issues" in data ? data.issues : undefined;
  if (!Array.isArray(issues) && "message" in error && typeof error.message === "string") {
    try {
      issues = JSON.parse(error.message) as unknown;
    } catch {
      issues = undefined;
    }
  }
  for (const issue of Array.isArray(issues) ? issues : []) {
    if (typeof issue !== "object" || issue === null || !("message" in issue) || typeof issue.message !== "string")
      continue;
    if (!("path" in issue)) continue;
    const path = Array.isArray(issue.path) ? issue.path.map(String).join(".") : issue.path;
    if (typeof path === "string") entries.push([path, issue.message]);
  }
  return Object.fromEntries(entries.slice(0, 20));
}

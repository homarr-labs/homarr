import type { CustomWidgetFormValues, EditorDiagnostic } from "@homarr/custom-widgets/workbench";

import { isRecord, parseJson, parseSources } from "./_custom-widget-form-utils";

export function createCustomWidgetCompletions(values: CustomWidgetFormValues, requestIds: string[]) {
  const schema = parseJson(values.optionsSchema);
  const optionKeys = Object.keys(isRecord(schema) && isRecord(schema.properties) ? schema.properties : {});
  const state = parseJson(values.stateSchema);
  const stateKeys = Object.keys(isRecord(state) ? state : {});
  return [
    ...requestIds.flatMap((id) => [
      { label: `data["${id}"]`, type: "variable", detail: `Response from ${id}` },
      { label: `status["${id}"]`, type: "variable", detail: `Status for ${id}` },
      { label: `requestId="${id}"`, type: "property", detail: "Named request" },
    ]),
    ...parseSources(values.sources).map(({ id }) => ({ label: id, type: "constant", detail: "Source ID" })),
    ...optionKeys.map((key) => ({ label: `options.${key}`, type: "variable", detail: "Widget option" })),
    ...stateKeys.map((key) => ({ label: `state.${key}`, type: "variable", detail: "Local state" })),
  ];
}

export function getInvalidCustomWidgetSections(
  issues: readonly { path: PropertyKey[] }[],
  requestDiagnostics: EditorDiagnostic[],
  templateDiagnostics: EditorDiagnostic[],
) {
  const result = new Set<string>();
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (["name", "description", "iconUrl"].includes(field)) result.add("general");
    else if (field === "sources") result.add("sources");
    else if (field === "requests") result.add("requests");
    else if (["optionsSchema", "defaultOptions"].includes(field)) result.add("options");
    else if (["stateSchema", "defaultState"].includes(field)) result.add("state");
    else if (field === "template") result.add("jsx");
  }
  if (requestDiagnostics.some((entry) => entry.severity === "error")) result.add("requests");
  if (templateDiagnostics.some((entry) => entry.severity === "error")) result.add("jsx");
  if (result.size > 0) result.add("preview");
  return result;
}

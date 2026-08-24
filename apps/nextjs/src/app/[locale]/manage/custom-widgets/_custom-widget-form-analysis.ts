import type { CustomWidgetFormValues, EditorDiagnostic } from "@homarr/custom-widgets/workbench";

import { isRecord, parseJson, parseSources } from "./_custom-widget-form-utils";

export function createCustomWidgetCompletions(
  values: Pick<CustomWidgetFormValues, "options" | "sources">,
  requestIds: string[],
) {
  const options = parseJson(values.options);
  const optionKeys = Object.keys(isRecord(options) ? options : {});
  return [
    ...requestIds.flatMap((id) => [
      { label: `data["${id}"]`, type: "variable", detail: `Response from ${id}` },
      { label: `status["${id}"]`, type: "variable", detail: `Status for ${id}` },
      { label: `requestId="${id}"`, type: "property", detail: "Named request" },
    ]),
    ...parseSources(values.sources).map(({ id }) => ({ label: id, type: "constant", detail: "Source ID" })),
    ...optionKeys.map((key) => ({ label: `options.${key}`, type: "variable", detail: "Widget option" })),
    { label: "inputs", type: "variable", detail: "Temporary bound input values" },
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
    else if (field === "options") result.add("options");
    else if (field === "template") result.add("jsx");
  }
  if (requestDiagnostics.some((entry) => entry.severity === "error")) result.add("requests");
  if (templateDiagnostics.some((entry) => entry.severity === "error")) result.add("jsx");
  if (result.size > 0) result.add("preview");
  return result;
}

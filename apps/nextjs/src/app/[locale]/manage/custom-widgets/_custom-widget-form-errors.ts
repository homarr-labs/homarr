const serverToFormFieldMap: Record<string, Record<string, string>> = {
  statGrid: { items: "statGridItems" },
  countGrid: { items: "countGridItems" },
  statusIndicator: { items: "statusItems" },
  progressBars: { bars: "progressBars" },
  keyValue: { mappings: "mappings" },
  table: { columns: "columns", tablePath: "tablePath" },
  singleValue: { jsonPath: "jsonPath", label: "label", unit: "unit" },
  raw: { jsonPath: "rawJsonPath" },
  actionButton: { buttonLabel: "buttonLabel" },
  customJsx: { template: "template", requests: "requestManifest", networkScope: "networkScope" },
};

export function extractServerErrors(error: unknown, displayType: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trpcError = error as {
    data?: { zodError?: { fieldErrors?: Record<string, string[]> } };
    message?: string;
  };
  if (trpcError.data?.zodError?.fieldErrors) {
    for (const [field, messages] of Object.entries(trpcError.data.zodError.fieldErrors)) {
      if (messages?.[0]) errors[field] = messages[0];
    }
    return errors;
  }
  try {
    const issues = JSON.parse(trpcError.message ?? "[]") as Array<{ path: (string | number)[]; message: string }>;
    const fieldMap = serverToFormFieldMap[displayType] ?? {};
    for (const issue of issues) {
      const path = [...issue.path];
      if (path[0] === "displayConfig") {
        path.shift();
        const serverField = String(path[0]);
        path[0] = fieldMap[serverField] ?? serverField;
      }
      errors[path.join(".")] = issue.message;
    }
  } catch {
    // Non-validation server errors are handled by the caller's notification.
  }
  return errors;
}

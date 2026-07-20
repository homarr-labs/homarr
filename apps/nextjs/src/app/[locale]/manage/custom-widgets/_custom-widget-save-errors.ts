export interface CustomWidgetSaveIssue {
  path?: string;
  message: string;
}

const MAX_SAVE_ISSUES = 20;

export function extractCustomWidgetSaveIssues(error: unknown): CustomWidgetSaveIssue[] {
  const record = asRecord(error);
  const data = asRecord(record?.data) ?? asRecord(asRecord(record?.shape)?.data);
  const zodError = asRecord(data?.zodError);
  const fieldErrors = asRecord(zodError?.fieldErrors);
  const flattened = fieldErrors
    ? Object.entries(fieldErrors).flatMap(([path, value]) =>
        Array.isArray(value)
          ? value.flatMap((message) => (typeof message === "string" ? [{ path, message }] : []))
          : [],
      )
    : [];
  const formErrors = Array.isArray(zodError?.formErrors)
    ? zodError.formErrors.flatMap((message) => (typeof message === "string" ? [{ message }] : []))
    : [];
  if (flattened.length > 0 || formErrors.length > 0) return uniqueIssues([...formErrors, ...flattened]);

  const message = typeof record?.message === "string" ? record.message : null;
  if (!message) return [];
  const parsed = parseZodIssueMessage(message);
  return parsed.length > 0 ? uniqueIssues(parsed) : [{ message }];
}

function parseZodIssueMessage(message: string): CustomWidgetSaveIssue[] {
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate) => {
      const issue = asRecord(candidate);
      if (typeof issue?.message !== "string") return [];
      const path = Array.isArray(issue.path)
        ? issue.path
            .filter((part) => typeof part === "string" || typeof part === "number")
            .map(String)
            .join(".")
        : undefined;
      return [{ path: path || undefined, message: issue.message }];
    });
  } catch {
    return [];
  }
}

function uniqueIssues(issues: CustomWidgetSaveIssue[]) {
  return issues
    .filter(
      (issue, index) =>
        issues.findIndex((candidate) => candidate.path === issue.path && candidate.message === issue.message) === index,
    )
    .slice(0, MAX_SAVE_ISSUES);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

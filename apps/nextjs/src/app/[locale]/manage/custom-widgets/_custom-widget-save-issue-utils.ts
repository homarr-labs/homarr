import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturnType } from "@mantine/form";

import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { showErrorNotification } from "@homarr/notifications";

import type { CustomWidgetSaveIssue } from "./_custom-widget-save-errors";

export function reportSaveIssues(
  form: UseFormReturnType<CustomWidgetFormValues>,
  issues: CustomWidgetSaveIssue[],
  setIssues: Dispatch<SetStateAction<CustomWidgetSaveIssue[]>>,
  title: string,
  getRemainingLabel: (count: number) => string,
) {
  setIssues(issues);
  const messagesByPath = new Map<string, string[]>();
  for (const issue of issues) {
    if (!issue.path) continue;
    const field = issue.path.split(".")[0] ?? issue.path;
    messagesByPath.set(field, [...(messagesByPath.get(field) ?? []), issue.message]);
  }
  for (const [path, messages] of messagesByPath) {
    form.setFieldError(path, messages.join(" "));
  }
  const remaining = issues.length - 1;
  showErrorNotification({
    title,
    message: `${issues[0]?.message ?? ""}${remaining > 0 ? ` ${getRemainingLabel(remaining)}` : ""}`,
  });
}

export function clearSaveIssues(form: UseFormReturnType<CustomWidgetFormValues>, issues: CustomWidgetSaveIssue[]) {
  for (const path of new Set(issues.flatMap((issue) => (issue.path ? [issue.path.split(".")[0] ?? issue.path] : [])))) {
    form.clearFieldError(path);
  }
}

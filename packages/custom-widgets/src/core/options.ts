import { getCustomWidgetOptionValueIssue } from "./options-schema";
import type { CustomWidgetOption, CustomWidgetOptions } from "./options-schema";

export interface CustomWidgetOptionIssue {
  path: string;
  message: string;
}

export function getCustomWidgetDefaultOptions(
  options: Record<string, Pick<CustomWidgetOption, "default">>,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(options).map(([name, option]) => [name, option.default]));
}

export function normalizeCustomWidgetOptions(
  options: CustomWidgetOptions,
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).map(([name, option]) => [
      name,
      getCustomWidgetOptionValueIssue(option, value[name]) ? option.default : value[name],
    ]),
  );
}

export function validateCustomWidgetOptions(
  options: CustomWidgetOptions,
  value: Record<string, unknown>,
): CustomWidgetOptionIssue[] {
  const issues: CustomWidgetOptionIssue[] = [];
  for (const [name, option] of Object.entries(options)) {
    const issue = getCustomWidgetOptionValueIssue(option, value[name]);
    if (issue) issues.push({ path: `configuration.${name}`, message: issue });
  }
  for (const name of Object.keys(value)) {
    if (!Object.hasOwn(options, name)) issues.push({ path: `configuration.${name}`, message: "Unknown option" });
  }
  return issues;
}

import { CUSTOM_WIDGET_SCHEMA_V3, customWidgetDefinitionSchema } from "../core";
import type { CustomJsxRequest, CustomWidgetOptions, CustomWidgetSource, CustomWidgetExtensions } from "../core";
import { CustomWidgetDomainError } from "./errors";

interface PreviewTemplateContext {
  name: string;
  description?: string;
  iconUrl?: string;
  sources: Record<string, CustomWidgetSource>;
  requests: Record<string, CustomJsxRequest>;
  optionDefinitions: CustomWidgetOptions;
  template: string;
  extensions?: CustomWidgetExtensions;
}

export function validatePreviewTemplateRevision(current: PreviewTemplateContext, template: string) {
  const parsed = customWidgetDefinitionSchema.safeParse({
    $schema: current.extensions ? CUSTOM_WIDGET_SCHEMA_V3 : "homarr-custom-widget-v2",
    extensions: current.extensions,
    name: current.name,
    description: current.description,
    iconUrl: current.iconUrl,
    sources: current.sources,
    requests: current.requests,
    options: current.optionDefinitions,
    template,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new CustomWidgetDomainError({
      code: "BAD_REQUEST",
      message: `Revised preview template is invalid: ${path}${issue?.message ?? "Unknown validation error"}`,
    });
  }
  if (parsed.data.template === current.template) {
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Revised preview template is unchanged" });
  }
  return parsed.data.template;
}

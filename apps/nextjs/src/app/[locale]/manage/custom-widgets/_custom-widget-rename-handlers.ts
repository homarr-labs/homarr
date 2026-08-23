import { renameCustomWidgetOption, renameCustomWidgetRequest } from "@homarr/custom-widgets/workbench";

import { applyDefinition, buildDefinition } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";

interface RenameHandlersInput {
  form: CustomWidgetWorkbenchForm;
  invalidWidgetMessage: string;
}

export function createCustomWidgetRenameHandlers(input: RenameHandlersInput) {
  const renameRequest = (currentId: string, nextId: string) => {
    const candidate = buildDefinition(input.form.getValues());
    if (!candidate.success) {
      input.form.setFieldError("requests", input.invalidWidgetMessage);
      return;
    }
    try {
      applyDefinition(input.form, renameCustomWidgetRequest(candidate.data, currentId, nextId));
      input.form.clearFieldError("requests");
    } catch (error) {
      input.form.setFieldError("requests", error instanceof Error ? error.message : input.invalidWidgetMessage);
    }
  };
  const renameOption = (currentName: string, nextName: string) => {
    const candidate = buildDefinition(input.form.getValues());
    if (!candidate.success) {
      input.form.setFieldError("options", input.invalidWidgetMessage);
      return;
    }
    try {
      applyDefinition(input.form, renameCustomWidgetOption(candidate.data, currentName, nextName));
      input.form.clearFieldError("options");
    } catch (error) {
      input.form.setFieldError("options", error instanceof Error ? error.message : input.invalidWidgetMessage);
    }
  };
  return { renameRequest, renameOption };
}

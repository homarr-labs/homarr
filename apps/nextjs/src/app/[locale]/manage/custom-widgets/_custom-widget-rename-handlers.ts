import { renameCustomWidgetOption, renameCustomWidgetRequest } from "@homarr/custom-widgets/workbench";

import { applyDefinition } from "./_custom-widget-form-utils";
import type { buildDefinition, CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";

interface RenameHandlersInput {
  form: CustomWidgetWorkbenchForm;
  candidate: ReturnType<typeof buildDefinition>;
  invalidWidgetMessage: string;
}

export function createCustomWidgetRenameHandlers(input: RenameHandlersInput) {
  const renameRequest = (currentId: string, nextId: string) => {
    if (!input.candidate.success) {
      input.form.setFieldError("requests", input.invalidWidgetMessage);
      return;
    }
    try {
      applyDefinition(input.form, renameCustomWidgetRequest(input.candidate.data, currentId, nextId));
      input.form.clearFieldError("requests");
    } catch (error) {
      input.form.setFieldError("requests", error instanceof Error ? error.message : input.invalidWidgetMessage);
    }
  };
  const renameOption = (currentName: string, nextName: string) => {
    if (!input.candidate.success) {
      input.form.setFieldError("options", input.invalidWidgetMessage);
      return;
    }
    try {
      applyDefinition(input.form, renameCustomWidgetOption(input.candidate.data, currentName, nextName));
      input.form.clearFieldError("options");
    } catch (error) {
      input.form.setFieldError("options", error instanceof Error ? error.message : input.invalidWidgetMessage);
    }
  };
  return { renameRequest, renameOption };
}

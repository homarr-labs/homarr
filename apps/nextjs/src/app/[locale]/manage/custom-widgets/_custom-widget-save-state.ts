import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

import type { CustomWidgetFormDocumentStore } from "./_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";

export function applyCustomWidgetSavedState(
  form: CustomWidgetWorkbenchForm,
  store: CustomWidgetFormDocumentStore,
  submitted: CustomWidgetFormValues,
) {
  const savedValues = {
    ...submitted,
    secrets: submitted.secrets.map((secret) => {
      if (!secret.value.trim()) return secret;
      return { ...secret, value: "", hasValue: true };
    }),
  };
  const currentValues = store.getValues();
  form.setInitialValues(savedValues);
  form.setValues({
    ...currentValues,
    secrets: currentValues.secrets.map((secret) => {
      const saved = submitted.secrets.find((entry) => entry.sourceId === secret.sourceId && entry.kind === secret.kind);
      if (!saved?.value.trim() || saved.value !== secret.value) return secret;
      return { ...secret, value: "", hasValue: true };
    }),
  });
  form.resetDirty();
  store.markSaved(savedValues);
}

import type { useZodForm } from "@homarr/form";
import type { useScopedI18n } from "@homarr/translation/client";
import type { customWidgetFormSchema } from "@homarr/custom-widgets/workbench";

export type CustomWidgetFormInstance = ReturnType<typeof useZodForm<typeof customWidgetFormSchema>>;
export type CustomWidgetTranslator = ReturnType<typeof useScopedI18n<"customWidget">>;

export interface DisplayFieldsProps {
  form: CustomWidgetFormInstance;
  t: CustomWidgetTranslator;
  previewJson: unknown;
}

import {
  CUSTOM_WIDGET_OPTIONS_EXAMPLES,
  CUSTOM_WIDGET_REQUEST_EXAMPLES,
  getCustomWidgetDefaultOptionsJsonSchema,
  getCustomWidgetOptionsJsonSchema,
  getCustomWidgetRequestsJsonSchema,
} from "@homarr/custom-widgets/core";

export const customWidgetRequestReference = {
  schema: getCustomWidgetRequestsJsonSchema(),
  minimal: CUSTOM_WIDGET_REQUEST_EXAMPLES.minimal,
  full: CUSTOM_WIDGET_REQUEST_EXAMPLES.full,
};

export const customWidgetOptionsSchemaReference = {
  schema: getCustomWidgetOptionsJsonSchema(),
  minimal: CUSTOM_WIDGET_OPTIONS_EXAMPLES.minimal.schema,
  full: CUSTOM_WIDGET_OPTIONS_EXAMPLES.full.schema,
};

export const customWidgetDefaultOptionsReference = {
  schema: getCustomWidgetDefaultOptionsJsonSchema(),
  minimal: CUSTOM_WIDGET_OPTIONS_EXAMPLES.minimal.defaults,
  full: CUSTOM_WIDGET_OPTIONS_EXAMPLES.full.defaults,
};

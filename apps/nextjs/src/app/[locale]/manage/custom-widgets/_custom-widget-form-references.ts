import {
  CUSTOM_WIDGET_OPTIONS_EXAMPLES,
  CUSTOM_WIDGET_REQUEST_EXAMPLES,
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
  minimal: CUSTOM_WIDGET_OPTIONS_EXAMPLES.minimal,
  full: CUSTOM_WIDGET_OPTIONS_EXAMPLES.full,
};

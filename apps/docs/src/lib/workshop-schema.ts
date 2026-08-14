import { CUSTOM_WIDGET_SCHEMA, type HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import {
  MAX_WORKSHOP_CSS_LENGTH,
  type WorkshopSubmissionType,
  validateWorkshopContent,
  WORKSHOP_CSS_SCHEMA,
} from "@homarr/workshop/schema";

export type SubmissionType = WorkshopSubmissionType;
export const WIDGET_SCHEMA_VERSION = CUSTOM_WIDGET_SCHEMA;
export const CSS_SCHEMA_VERSION = WORKSHOP_CSS_SCHEMA;
export const MAX_CSS_LENGTH = MAX_WORKSHOP_CSS_LENGTH;

export type WorkshopValidationResult =
  | { success: true; data: HomarrCustomWidgetV2 | string }
  | { success: false; error: string };

export const schemaVersionByType = {
  customWidget: WIDGET_SCHEMA_VERSION,
  customCss: CSS_SCHEMA_VERSION,
} satisfies Record<SubmissionType, string>;

export const validateSubmissionContent = (type: SubmissionType, raw: string): WorkshopValidationResult =>
  validateWorkshopContent(type, raw);

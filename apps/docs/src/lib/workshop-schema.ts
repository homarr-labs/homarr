import {
  MAX_WORKSHOP_CSS_LENGTH,
  WORKSHOP_SCHEMA_BY_TYPE,
  type WorkshopSubmissionType,
  validateWorkshopContent,
} from "@homarr/workshop/schema";

export type SubmissionType = WorkshopSubmissionType;
export const WIDGET_SCHEMA_VERSION = WORKSHOP_SCHEMA_BY_TYPE.customWidget;
export const CSS_SCHEMA_VERSION = WORKSHOP_SCHEMA_BY_TYPE.customCss;
export const MAX_CSS_LENGTH = MAX_WORKSHOP_CSS_LENGTH;

export const schemaVersionByType = WORKSHOP_SCHEMA_BY_TYPE;
export const validateSubmissionContent = validateWorkshopContent;

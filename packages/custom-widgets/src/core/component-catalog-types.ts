import type {
  CustomJsxComponentCategory,
  CustomJsxComponentPackage,
  CustomJsxComponentSafety,
} from "./component-types";

export const CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION = 1 as const;
export const CUSTOM_WIDGET_AUTHORING_VERSION = "2.0.0";

export type CustomJsxPropSource = "global" | "component";
export type CustomJsxLiteralValue = string | number | boolean | null;
export type CustomJsxCatalogBindingType = "string" | "number" | "boolean" | "string[]" | "number[]";

export interface CustomJsxPropDescriptor {
  name: string;
  typeRef: number;
  required: boolean;
  source: CustomJsxPropSource;
  literalValues?: CustomJsxLiteralValue[];
  description?: string;
}

export interface CustomJsxBindingDescriptor {
  type: CustomJsxCatalogBindingType;
  initialProp: "defaultValue" | "defaultChecked";
}

export interface CustomJsxBlockedCapability {
  kind: "prop" | "prop-pattern";
  name: string;
  reason: string;
}

export interface CustomJsxComponentBlockedProp {
  name: string;
  reason: string;
}

export interface CustomJsxComponentApi {
  name: string;
  package: CustomJsxComponentPackage;
  category: CustomJsxComponentCategory;
  safety: CustomJsxComponentSafety;
  description?: string;
  documentationUrl: string;
  props: CustomJsxPropDescriptor[];
  blockedProps: CustomJsxComponentBlockedProp[];
  subcomponents: string[];
  bind?: CustomJsxBindingDescriptor;
  accessibilityRequirements: string[];
  deniedReason?: string;
}

export interface CustomJsxAuthoringCatalog {
  schemaVersion: typeof CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION;
  mantineVersion: string;
  customWidgetVersion: string;
  types: string[];
  globalProps: CustomJsxPropDescriptor[];
  blockedCapabilities: CustomJsxBlockedCapability[];
  components: CustomJsxComponentApi[];
}

export type {
  CustomJsxComponentCategory,
  CustomJsxComponentDescriptor,
  CustomJsxComponentPackage,
  CustomJsxComponentSafety,
} from "./component-descriptor";

import { customJsxDeniedComponentRegistry } from "./component-registry-denied";
import { customJsxEnabledComponentRegistry } from "./component-registry-enabled";

export const customJsxComponentRegistry = [
  ...customJsxEnabledComponentRegistry,
  ...customJsxDeniedComponentRegistry,
] as const;
export const enabledCustomJsxComponents = customJsxEnabledComponentRegistry;
export const customJsxComponentByName = new Map(customJsxComponentRegistry.map((entry) => [entry.name, entry]));
export const customJsxSupportedPropsByName = new Map(
  customJsxComponentRegistry.map((entry) => [entry.name, new Set(entry.supportedProps)]),
);

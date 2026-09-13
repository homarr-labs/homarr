import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useId, useRef } from "react";
import { customJsxBindableComponentNames, getCustomJsxBindingType } from "../core/component-registry";
import type { CustomJsxBindingType } from "../core/component-registry";
import { useWidgetContent } from "../runtime/shared-content";
import { useWidgetPreferences } from "../runtime/preferences";
import { getScopedCustomJsxControlName } from "./runtime-component-policy";
import { sanitizeCustomJsxProps } from "./safe-properties";

export type WidgetInputValue = string | number | boolean | string[] | number[];
export type WidgetInputType = CustomJsxBindingType;
interface CustomJsxInputsContextValue {
  scopeId: string;
  inputs: Record<string, WidgetInputValue>;
  inputTypes: Record<string, WidgetInputType>;
  registerInput(name: string, type: WidgetInputType, initialValue: WidgetInputValue): () => void;
  setInputValue(name: string, type: WidgetInputType, value: WidgetInputValue): void;
  resetInput(name: string, type: WidgetInputType): void;
}

const CustomJsxInputsContext = createContext<CustomJsxInputsContextValue | null>(null);

export function CustomJsxInputsProvider({
  children,
  scopeId,
  inputs,
  inputTypes,
  registerInput,
  setInputValue,
  resetInput,
}: CustomJsxInputsContextValue & { children: ReactNode }) {
  return (
    <CustomJsxInputsContext.Provider value={{ scopeId, inputs, inputTypes, registerInput, setInputValue, resetInput }}>
      {children}
    </CustomJsxInputsContext.Provider>
  );
}

const checkedComponents = new Set(["Checkbox", "Switch"]);
const openedComponents = new Set(["Menu", "Popover"]);
const activeComponents = new Set(["Stepper"]);
const namedRadioComponents = new Set(["Radio", "Radio.Card", "Radio.Group", "RadioCard", "RadioGroup"]);

function extractEventValue(value: unknown, checked: boolean): WidgetInputValue | null {
  if (value && typeof value === "object" && "currentTarget" in value) {
    const target = (value as { currentTarget?: { checked?: unknown; value?: unknown } }).currentTarget;
    const result = checked ? target?.checked : target?.value;
    return typeof result === "string" || typeof result === "number" || typeof result === "boolean" ? result : null;
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string" || entry === null)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) return value;
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
    ? value
    : null;
}

export function useBoundCustomJsxProps(componentName: string, props: Record<string, unknown>): Record<string, unknown> {
  const detachedScopeId = useId();
  const binding = typeof props.bind === "string" ? props.bind : undefined;
  const context = useContext(CustomJsxInputsContext);
  const preferences = useWidgetPreferences();
  const content = useWidgetContent();
  const contentName = typeof props.content === "string" ? props.content : undefined;
  const preferenceName = typeof props.persist === "string" ? props.persist : undefined;
  const serializedResetKey = serializeResetKey(props.resetKey);
  const sanitized = sanitizeCustomJsxProps(props, componentName);
  if (namedRadioComponents.has(componentName) && typeof sanitized.name === "string") {
    sanitized.name = getScopedCustomJsxControlName(context?.scopeId ?? detachedScopeId, sanitized.name);
  }
  delete sanitized.bind;
  delete sanitized.resetKey;
  delete sanitized.persist;
  if (contentName) delete sanitized.content;
  if (contentName && content?.status[contentName]?.loading) sanitized.disabled = true;
  const inputType = getCustomJsxBindingType(componentName, sanitized);
  const initialValue = getInitialInputValue(inputType, sanitized);
  const serializedInitialValue = JSON.stringify(initialValue);
  const preferenceDefinition = preferences?.definitions[preferenceName ?? ""];
  const preferenceValue = preferences?.values[preferenceName ?? ""];
  const serializedPreference = JSON.stringify(preferenceValue);
  const contentDefinition = content?.definitions[contentName ?? ""];
  const serializedContent = JSON.stringify(content?.values[contentName ?? ""]);
  const updateInput = context?.setInputValue;
  useEffect(() => {
    if (
      !binding ||
      !inputType ||
      !updateInput ||
      contentDefinition?.type !== inputType ||
      serializedContent === undefined
    )
      return;
    updateInput(binding, inputType, JSON.parse(serializedContent) as WidgetInputValue);
  }, [binding, inputType, contentDefinition?.type, serializedContent, updateInput]);
  useEffect(() => {
    if (
      !binding ||
      !inputType ||
      !updateInput ||
      preferenceDefinition?.type !== inputType ||
      serializedPreference === undefined
    )
      return;
    updateInput(binding, inputType, JSON.parse(serializedPreference) as WidgetInputValue);
  }, [binding, inputType, preferenceDefinition?.type, serializedPreference, updateInput]);
  const isBound = Boolean(binding && context && inputType && customJsxBindableComponentNames.has(componentName));
  const registerInput = context?.registerInput;
  useEffect(() => {
    if (!isBound || !binding || !registerInput || !inputType || serializedInitialValue === undefined) return;
    return registerInput(binding, inputType, JSON.parse(serializedInitialValue) as WidgetInputValue);
  }, [binding, inputType, isBound, registerInput, serializedInitialValue]);
  const previousResetKey = useRef<{ initialized: boolean; value?: string }>({ initialized: false });
  const resetInput = context?.resetInput;
  useEffect(() => {
    const previous = previousResetKey.current;
    previousResetKey.current = { initialized: true, value: serializedResetKey };
    if (!previous.initialized || previous.value === serializedResetKey || serializedResetKey === undefined) return;
    if (!isBound || !binding || !inputType || !resetInput) return;
    resetInput(binding, inputType);
    if (preferenceName && preferenceDefinition?.type === inputType)
      preferences?.setValue(preferenceName, preferenceDefinition.defaultValue);
  }, [binding, inputType, isBound, resetInput, serializedResetKey, preferenceName, preferenceDefinition, preferences]);
  if (!isBound || !binding || !context || !inputType) return sanitized;
  delete sanitized.defaultValue;
  delete sanitized.defaultChecked;
  let currentValue = initialValue;
  if (context.inputTypes[binding] === inputType && Object.hasOwn(context.inputs, binding)) {
    const storedValue = context.inputs[binding];
    if (storedValue !== undefined) currentValue = storedValue;
  }

  if (preferenceName && preferenceDefinition && preferenceDefinition.type === inputType) {
    currentValue = preferences?.values[preferenceName] ?? currentValue;
  }
  if (contentName && contentDefinition?.type === inputType) currentValue = content?.values[contentName] ?? currentValue;
  const update = (value: unknown, checked = false) => {
    const extracted = extractEventValue(value, checked);
    const next = extracted ?? emptyInputValue(inputType);
    context.setInputValue(binding, inputType, next);
    if (preferenceName && preferenceDefinition?.type === inputType) preferences?.setValue(preferenceName, next);
    if (contentName && contentDefinition?.type === inputType) content?.setValue(contentName, next);
  };
  if (checkedComponents.has(componentName)) {
    return {
      ...sanitized,
      checked: Boolean(currentValue),
      onChange: (event: unknown) => update(event, true),
    };
  }
  if (openedComponents.has(componentName)) {
    return { ...sanitized, opened: Boolean(currentValue), onChange: update, withinPortal: false };
  }
  if (activeComponents.has(componentName)) {
    return { ...sanitized, active: Number(currentValue), onStepClick: update };
  }
  return { ...sanitized, value: currentValue, onChange: update };
}

function serializeResetKey(value: unknown) {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? `number:${value}` : undefined;
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  return undefined;
}

function getInitialInputValue(type: WidgetInputType | null, props: Record<string, unknown>): WidgetInputValue {
  if (!type) return "";
  const candidate = type === "boolean" ? props.defaultChecked : props.defaultValue;
  if (type === "boolean" && typeof candidate === "boolean") return candidate;
  if (type === "number" && typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  if (type === "string" && typeof candidate === "string") return candidate;
  if (type === "string[]" && Array.isArray(candidate) && candidate.every((item) => typeof item === "string"))
    return candidate;
  if (
    type === "number[]" &&
    Array.isArray(candidate) &&
    candidate.every((item) => typeof item === "number" && Number.isFinite(item))
  )
    return candidate;
  return emptyInputValue(type);
}

function emptyInputValue(type: WidgetInputType): WidgetInputValue {
  if (type.endsWith("[]")) return [];
  if (type === "number") return 0;
  if (type === "boolean") return false;
  return "";
}

import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Component, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Alert, Box, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { renderSafeJsx } from "../jsx/interpreter";
import { CustomJsxInputsProvider } from "../jsx/runtime-components";
import type { WidgetInputType, WidgetInputValue } from "../jsx/runtime-components";
import { sameInputRecord, sameStringArray, sameTypeRecord } from "./input-state-utils";
import type { CustomJsxRequestCapability } from "./types";

const EMPTY_RECORD: Record<string, never> = {};

const methodColors: Readonly<Record<string, string>> = {
  GET: "blue",
  POST: "orange",
  PUT: "yellow",
  DELETE: "red",
  PATCH: "grape",
};
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const kinds = new Set(["query", "action"]);
const permissions = new Set(["view", "modify", "full"]);

export interface CustomJsxRendererMessages {
  noTemplate: string;
  templateWarnings(count: number): string;
  bindingTypeConflict(name: string, firstType: WidgetInputType, secondType: WidgetInputType): string;
}

export interface CustomJsxRendererProps {
  template: string;
  data: unknown;
  status?: Record<string, unknown>;
  options?: Record<string, unknown>;
  components: Readonly<Record<string, ComponentType<never>>>;
  createBindings(data: unknown): Readonly<Record<string, unknown>>;
  messages: CustomJsxRendererMessages;
}

export const CUSTOM_JSX_METHOD_COLORS = methodColors;

export function parseRequestCapabilities(value: unknown): CustomJsxRequestCapability[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.kind !== "string" ||
      !kinds.has(record.kind) ||
      typeof record.method !== "string" ||
      !methods.has(record.method) ||
      typeof record.minimumBoardPermission !== "string" ||
      !permissions.has(record.minimumBoardPermission)
    )
      return [];
    return [
      {
        id: record.id,
        kind: record.kind,
        method: record.method,
        trigger: record.trigger === "load" ? "load" : "manual",
        minimumBoardPermission: record.minimumBoardPermission,
        confirmation:
          record.confirmation && typeof record.confirmation === "object"
            ? (record.confirmation as CustomJsxRequestCapability["confirmation"])
            : undefined,
        invalidates: Array.isArray(record.invalidates)
          ? record.invalidates.filter((entry): entry is string => typeof entry === "string")
          : [],
      } as CustomJsxRequestCapability,
    ];
  });
}

class RendererErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; onError(error: Error): void },
  { error: Error | null; resetKey: string }
> {
  public state = { error: null, resetKey: "" } as { error: Error | null; resetKey: string };
  public static getDerivedStateFromProps(
    props: Readonly<{ resetKey: string }>,
    state: Readonly<{ error: Error | null; resetKey: string }>,
  ) {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }
  public static getDerivedStateFromError(error: Error) {
    return { error };
  }
  public componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error);
  }
  public render() {
    return this.state.error ? <ErrorAlert error={this.state.error} /> : this.props.children;
  }
}

function ErrorAlert({ error }: { error: Error }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
      <Text size="xs" fw={700}>
        RUNTIME_RENDER_ERROR
      </Text>
      <Text size="xs">{error.message}</Text>
    </Alert>
  );
}

export function CustomJsxRenderer(props: CustomJsxRendererProps) {
  if (!props.template.trim())
    return (
      <Alert color="gray" variant="light" p="xs">
        <Text size="xs" c="dimmed">
          {props.messages.noTemplate}
        </Text>
      </Alert>
    );

  return <CustomJsxRendererSession {...props} />;
}

interface InputRegistration {
  name: string;
  type: WidgetInputType;
  initialValue: WidgetInputValue;
}

interface InputState {
  values: Record<string, WidgetInputValue>;
  types: Record<string, WidgetInputType>;
}

function CustomJsxRendererSession({
  template,
  data,
  status = EMPTY_RECORD,
  options = EMPTY_RECORD,
  components,
  createBindings,
  messages,
}: CustomJsxRendererProps) {
  const inputScopeId = useId();
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [bindingErrors, setBindingErrors] = useState<string[]>([]);
  const [inputState, setInputState] = useState<InputState>({ values: {}, types: {} });
  const { values: inputs, types: inputTypes } = inputState;
  const registrations = useRef(new Map<symbol, InputRegistration>());
  const registrationVersion = useRef(0);
  const mounted = useRef(true);
  const bindingTypeConflict = messages.bindingTypeConflict;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const reconcileInputs = useCallback(() => {
    if (!mounted.current) return;
    const active = new Map<string, InputRegistration>();
    const conflicts: string[] = [];
    for (const registration of registrations.current.values()) {
      const existing = active.get(registration.name);
      if (!existing) {
        active.set(registration.name, registration);
        continue;
      }
      if (existing.type === registration.type) continue;
      const message = bindingTypeConflict(registration.name, existing.type, registration.type);
      if (!conflicts.includes(message) && conflicts.length < 5) conflicts.push(message);
    }
    setBindingErrors((current) => (sameStringArray(current, conflicts) ? current : conflicts));
    setInputState((current) => {
      const nextTypes: Record<string, WidgetInputType> = {};
      for (const [name, registration] of active) nextTypes[name] = registration.type;
      const nextValues: Record<string, WidgetInputValue> = {};
      for (const [name, registration] of active) {
        if (current.types[name] === registration.type && Object.hasOwn(current.values, name)) {
          const previousValue = current.values[name];
          if (previousValue !== undefined) {
            nextValues[name] = previousValue;
            continue;
          }
        }
        nextValues[name] = registration.initialValue;
      }
      if (sameTypeRecord(current.types, nextTypes) && sameInputRecord(current.values, nextValues)) return current;
      return { values: nextValues, types: nextTypes };
    });
  }, [bindingTypeConflict]);
  const registerInput = useCallback(
    (name: string, type: WidgetInputType, initialValue: WidgetInputValue) => {
      const id = Symbol(name);
      registrations.current.set(id, { name, type, initialValue });
      registrationVersion.current += 1;
      reconcileInputs();
      return () => {
        registrations.current.delete(id);
        registrationVersion.current += 1;
        const version = registrationVersion.current;
        queueMicrotask(() => {
          if (registrationVersion.current === version) reconcileInputs();
        });
      };
    },
    [reconcileInputs],
  );
  const setInputValue = useCallback((name: string, type: WidgetInputType, value: WidgetInputValue) => {
    setInputState((current) => {
      const existing = current.types[name];
      if (existing && existing !== type) return current;
      if (existing === type && Object.is(current.values[name], value)) return current;
      return {
        values: { ...current.values, [name]: value },
        types: existing === type ? current.types : { ...current.types, [name]: type },
      };
    });
  }, []);
  const rendered = useMemo(() => {
    try {
      const bindings = { ...createBindings(data), status, options, inputs };
      return {
        ...renderSafeJsx({ template, components, bindings }),
        boundaryKey: createBoundaryKey(template, bindings),
        error: null,
      };
    } catch (error) {
      return {
        node: null,
        warnings: [],
        boundaryKey: `${template.length}:error`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [components, createBindings, data, inputs, options, status, template]);
  useEffect(() => setParseErrors([]), [rendered.boundaryKey, template]);
  const handleError = useCallback(
    (error: Error) =>
      setParseErrors((current) => {
        if (current.length >= 5 || current.includes(error.message)) return current;
        return [...current, error.message];
      }),
    [],
  );
  useEffect(() => {
    rendered.warnings.forEach((warning) => handleError(new Error(warning)));
    if (rendered.error) handleError(rendered.error);
  }, [handleError, rendered]);

  return (
    <Stack gap={0} h="100%">
      <Box h="100%" style={{ contain: "layout paint style", isolation: "isolate", overflow: "auto", minHeight: 0 }}>
        {rendered.error ? (
          <ErrorAlert error={rendered.error} />
        ) : (
          <CustomJsxInputsProvider
            scopeId={inputScopeId}
            inputs={inputs}
            inputTypes={inputTypes}
            registerInput={registerInput}
            setInputValue={setInputValue}
          >
            <RendererErrorBoundary resetKey={rendered.boundaryKey} onError={handleError}>
              {rendered.node}
            </RendererErrorBoundary>
          </CustomJsxInputsProvider>
        )}
      </Box>
      {[...parseErrors, ...bindingErrors].length > 0 && (
        <Alert color="yellow" variant="light" p="xs" mt="xs">
          <Text size="xs" c="dimmed">
            {messages.templateWarnings(parseErrors.length + bindingErrors.length)}
          </Text>
          {[...parseErrors, ...bindingErrors].map((message) => (
            <Text key={message} size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
              {message}
            </Text>
          ))}
        </Alert>
      )}
    </Stack>
  );
}

function createBoundaryKey(template: string, bindings: Readonly<Record<string, unknown>>) {
  let hash = 0;
  const value = `${template}\0${JSON.stringify(bindings)}`;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return `${template.length}:${hash}`;
}

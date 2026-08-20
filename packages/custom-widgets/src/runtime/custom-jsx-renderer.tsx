import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Component, useCallback, useEffect, useId, useMemo, useState } from "react";
import { Alert, Box, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { compileSafeJsx, renderCompiledSafeJsx } from "../jsx/interpreter";
import { CustomJsxInputsProvider } from "../jsx/runtime-components";
import type { WidgetInputType, WidgetInputValue } from "../jsx/runtime-components";
import type { CustomJsxRequestCapability } from "./types";

const EMPTY_RECORD: Record<string, never> = {};
const referenceIds = new WeakMap<object, number>();
let nextReferenceId = 1;

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

  return <CustomJsxRendererSession key={props.template} {...props} />;
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
  const [inputs, setInputs] = useState<Record<string, WidgetInputValue>>({});
  const [inputTypes, setInputTypes] = useState<Record<string, WidgetInputType>>({});
  const registerInput = useCallback((name: string, type: WidgetInputType, initialValue: WidgetInputValue) => {
    setInputTypes((current) => {
      const existing = current[name];
      if (existing === type) return current;
      if (existing && existing !== type) {
        setBindingErrors((errors) => {
          const message = `BINDING_TYPE_CONFLICT: '${name}' is bound as both ${existing} and ${type}`;
          return errors.includes(message) ? errors : [...errors.slice(0, 4), message];
        });
        return current;
      }
      return { ...current, [name]: type };
    });
    setInputs((current) => (Object.hasOwn(current, name) ? current : { ...current, [name]: initialValue }));
  }, []);
  const setInputValue = useCallback(
    (name: string, type: WidgetInputType, value: WidgetInputValue) => {
      const existing = inputTypes[name];
      if (existing && existing !== type) {
        setBindingErrors((errors) => {
          const message = `BINDING_TYPE_CONFLICT: '${name}' is bound as both ${existing} and ${type}`;
          return errors.includes(message) ? errors : [...errors.slice(0, 4), message];
        });
        return;
      }
      setInputTypes((current) => (current[name] === type ? current : { ...current, [name]: type }));
      setInputs((current) => (Object.is(current[name], value) ? current : { ...current, [name]: value }));
    },
    [inputTypes],
  );
  const compiled = useMemo(() => {
    try {
      return { root: compileSafeJsx(template), error: null };
    } catch (error) {
      return { root: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [template]);
  const rendered = useMemo(() => {
    if (compiled.error || !compiled.root) {
      return {
        node: null,
        warnings: [],
        boundaryKey: `${template.length}:compile-error`,
        error: compiled.error ?? new Error("Template compilation failed"),
      };
    }
    try {
      const bindings = { ...createBindings(data), status, options, inputs };
      return {
        ...renderCompiledSafeJsx({ root: compiled.root, components, bindings }),
        boundaryKey: createBoundaryKey(template, [data, status, options, inputs]),
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
  }, [compiled, components, createBindings, data, inputs, options, status, template]);
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

function createBoundaryKey(template: string, values: readonly unknown[]) {
  return `${template.length}:${values.map(referenceKey).join(":")}`;
}

function referenceKey(value: unknown): string {
  if ((typeof value === "object" && value !== null) || typeof value === "function") {
    const reference = value as object;
    let id = referenceIds.get(reference);
    if (!id) {
      id = nextReferenceId;
      nextReferenceId += 1;
      referenceIds.set(reference, id);
    }
    return `r${id}`;
  }
  return `${typeof value}:${String(value)}`;
}

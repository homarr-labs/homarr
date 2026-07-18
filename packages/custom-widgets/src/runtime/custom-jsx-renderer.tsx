import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, Group, Popover, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconNetwork } from "@tabler/icons-react";

import { renderSafeJsx } from "../jsx/interpreter";
import { CustomJsxStateProvider } from "../jsx/runtime-components";
import type { CustomJsxRequestCapability } from "./types";

type CustomWidgetStateValue = string | number | boolean | string[] | number[];
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
  interactive: string;
  networkCapabilities: string;
  templateWarnings(count: number): string;
}

export interface CustomJsxRendererProps {
  template: string;
  data: unknown;
  status?: Record<string, unknown>;
  options?: Record<string, unknown>;
  stateSchema?: Record<string, string>;
  defaultState?: Record<string, unknown>;
  onStateChange?(state: Record<string, CustomWidgetStateValue>): void;
  requestCapabilities: unknown;
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
  { children: ReactNode; onError(error: Error): void },
  { error: Error | null }
> {
  public state = { error: null } as { error: Error | null };
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

export function CustomJsxRenderer({
  template,
  data,
  status = EMPTY_RECORD,
  options = EMPTY_RECORD,
  stateSchema = EMPTY_RECORD,
  defaultState = EMPTY_RECORD,
  onStateChange,
  requestCapabilities: rawCapabilities,
  components,
  createBindings,
  messages,
}: CustomJsxRendererProps) {
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [state, setState] = useState<Record<string, CustomWidgetStateValue>>(() =>
    normalizeState(stateSchema, defaultState),
  );
  useEffect(() => {
    const next = normalizeState(stateSchema, defaultState);
    setState((current) => (sameWidgetState(current, next) ? current : next));
  }, [defaultState, stateSchema]);
  const setStateValue = useCallback(
    (name: string, value: CustomWidgetStateValue) => {
      const type = stateSchema[name];
      if (!type || !matchesStateType(type, value)) return;
      setState((current) => ({ ...current, [name]: value }));
    },
    [stateSchema],
  );
  useEffect(() => onStateChange?.(state), [onStateChange, state]);
  const bindings = useMemo(
    () => ({ ...createBindings(data), status, options, state }),
    [createBindings, data, options, state, status],
  );
  const capabilities = useMemo(() => parseRequestCapabilities(rawCapabilities), [rawCapabilities]);
  const rendered = useMemo(() => {
    try {
      return { ...renderSafeJsx({ template, components, bindings }), error: null };
    } catch (error) {
      return { node: null, warnings: [], error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [bindings, components, template]);
  useEffect(() => setParseErrors([]), [bindings, template]);
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

  if (!template.trim())
    return (
      <Alert color="gray" variant="light" p="xs">
        <Text size="xs" c="dimmed">
          {messages.noTemplate}
        </Text>
      </Alert>
    );
  return (
    <Stack gap={0} h="100%">
      {capabilities.length > 0 && (
        <Group justify="flex-end" mb={4}>
          <Popover width={320} position="bottom-end" withinPortal={false} shadow="md">
            <Popover.Target>
              <Badge
                component="button"
                type="button"
                size="sm"
                color="gray"
                variant="light"
                leftSection={<IconNetwork size={12} />}
                style={{ cursor: "pointer" }}
              >
                {messages.interactive}
              </Badge>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap={6}>
                <Text size="sm" fw={600}>
                  {messages.networkCapabilities}
                </Text>
                {capabilities.map((capability) => (
                  <Group key={capability.id} justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="xs" ff="monospace" truncate>
                      {capability.id}
                    </Text>
                    <Group gap={4} wrap="nowrap">
                      <Badge size="xs" color={methodColors[capability.method] ?? "gray"} variant="light">
                        {capability.method}
                      </Badge>
                      <Badge size="xs" color="gray" variant="outline">
                        {capability.minimumBoardPermission}
                      </Badge>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      )}
      <Box h="100%" style={{ contain: "layout paint style", isolation: "isolate", overflow: "auto", minHeight: 0 }}>
        {rendered.error ? (
          <ErrorAlert error={rendered.error} />
        ) : (
          <CustomJsxStateProvider state={state} stateSchema={stateSchema} setStateValue={setStateValue}>
            <RendererErrorBoundary key={template} onError={handleError}>
              {rendered.node}
            </RendererErrorBoundary>
          </CustomJsxStateProvider>
        )}
      </Box>
      {parseErrors.length > 0 && (
        <Alert color="yellow" variant="light" p="xs" mt="xs">
          <Text size="xs" c="dimmed">
            {messages.templateWarnings(parseErrors.length)}
          </Text>
          {parseErrors.map((message) => (
            <Text key={message} size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
              {message}
            </Text>
          ))}
        </Alert>
      )}
    </Stack>
  );
}

function normalizeState(schema: Record<string, string>, defaults: Record<string, unknown>) {
  const state: Record<string, CustomWidgetStateValue> = {};
  for (const [name, type] of Object.entries(schema)) {
    const value = defaults[name];
    state[name] = matchesStateType(type, value)
      ? value
      : type.endsWith("[]")
        ? []
        : type === "number"
          ? 0
          : type === "boolean"
            ? false
            : "";
  }
  return state;
}

function matchesStateType(type: string, value: unknown): value is CustomWidgetStateValue {
  if (type === "date") return typeof value === "string";
  if (type === "string[]" || type === "date[]")
    return Array.isArray(value) && value.every((entry) => typeof entry === "string");
  if (type === "number[]") return Array.isArray(value) && value.every((entry) => typeof entry === "number");
  return typeof value === type;
}

function sameWidgetState(left: Record<string, CustomWidgetStateValue>, right: Record<string, CustomWidgetStateValue>) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(([key, value]) => {
    const candidate = right[key];
    return Array.isArray(value) && Array.isArray(candidate)
      ? value.length === candidate.length && value.every((entry, index) => Object.is(entry, candidate[index]))
      : Object.is(value, candidate);
  });
}

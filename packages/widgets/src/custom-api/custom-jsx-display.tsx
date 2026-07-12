"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, Group, Popover, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconNetwork } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { WHITELISTED_COMPONENTS, SAFE_BINDINGS } from "./jsx-whitelist";
import { renderSafeJsx } from "./safe-jsx-interpreter";
import type { CustomJsxRequestCapability } from "./widget-definition-context";
import { WidgetDefinitionProvider } from "./widget-definition-context";

const MAX_PARSE_ERRORS = 5;

function appendParseError(prev: string[], message: string): string[] {
  if (prev.length >= MAX_PARSE_ERRORS) return prev;
  if (prev.includes(message)) return prev;
  return [...prev, message];
}

export const CUSTOM_JSX_METHOD_COLORS: Record<string, string> = {
  GET: "blue",
  POST: "orange",
  PUT: "yellow",
  DELETE: "red",
  PATCH: "grape",
};

const CAPABILITY_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const CAPABILITY_KINDS = new Set(["query", "action"]);
const CAPABILITY_PERMISSIONS = new Set(["view", "modify", "full"]);

function parseRequestCapabilities(value: unknown): CustomJsxRequestCapability[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.kind !== "string" ||
      !CAPABILITY_KINDS.has(record.kind) ||
      typeof record.method !== "string" ||
      !CAPABILITY_METHODS.has(record.method) ||
      typeof record.minimumBoardPermission !== "string" ||
      !CAPABILITY_PERMISSIONS.has(record.minimumBoardPermission)
    ) {
      return [];
    }
    return [record as unknown as CustomJsxRequestCapability];
  });
}

interface RendererErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
  onError: (error: Error) => void;
}

interface RendererErrorBoundaryState {
  error: Error | null;
}

class RendererErrorBoundary extends Component<RendererErrorBoundaryProps, RendererErrorBoundaryState> {
  public state: RendererErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError(error);
  }

  public render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

function ErrorAlert({ error }: { error: Error }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
      <Text size="xs">{error.message}</Text>
    </Alert>
  );
}

const renderErrorFallback = (error: Error) => <ErrorAlert error={error} />;

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const template = String(data.template ?? "");
  const apiData = data.data;
  const definitionId = String(data.widgetDefinitionId ?? "");
  const itemId = typeof data.widgetItemId === "string" ? data.widgetItemId : undefined;
  const previewSessionId = typeof data.previewSessionId === "string" ? data.previewSessionId : undefined;
  const previewLiveActions = data.previewLiveActions === true;
  const isEditMode = data.isEditMode === true;
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const bindings = useMemo(() => SAFE_BINDINGS(apiData), [apiData]);
  const requestCapabilities = useMemo(
    () => parseRequestCapabilities(data.requestCapabilities),
    [data.requestCapabilities],
  );
  const rendered = useMemo(() => {
    try {
      const result = renderSafeJsx({ template, components: WHITELISTED_COMPONENTS, bindings });
      return { ...result, error: null };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      return { node: null, warnings: [], error: normalized };
    }
  }, [bindings, template]);

  useEffect(() => {
    setParseErrors([]);
  }, [template, bindings]);

  const handleError = useCallback((error: Error) => {
    setParseErrors((prev) => appendParseError(prev, error.message));
  }, []);

  useEffect(() => {
    rendered.warnings.forEach((warning) => handleError(new Error(warning)));
    if (rendered.error) handleError(rendered.error);
  }, [handleError, rendered]);

  if (!template.trim()) {
    return (
      <Alert color="gray" variant="light" p="xs">
        <Text size="xs" c="dimmed">
          {t("noTemplate")}
        </Text>
      </Alert>
    );
  }

  return (
    <WidgetDefinitionProvider
      definitionId={definitionId}
      itemId={itemId}
      previewSessionId={previewSessionId}
      previewLiveActions={previewLiveActions}
      isEditMode={isEditMode}
      requestCapabilities={requestCapabilities}
    >
      <Stack gap={0} h="100%">
        {requestCapabilities.length > 0 && (
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
                  {t("interactive")}
                </Badge>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap={6}>
                  <Text size="sm" fw={600}>
                    {t("networkCapabilities")}
                  </Text>
                  {requestCapabilities.map((capability) => (
                    <Group key={capability.id} justify="space-between" gap="xs" wrap="nowrap">
                      <Text size="xs" ff="monospace" truncate>
                        {capability.id}
                      </Text>
                      <Group gap={4} wrap="nowrap">
                        <Badge size="xs" color={CUSTOM_JSX_METHOD_COLORS[capability.method] ?? "gray"} variant="light">
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
            <RendererErrorBoundary key={template} onError={handleError} fallback={renderErrorFallback}>
              {rendered.node}
            </RendererErrorBoundary>
          )}
        </Box>
        {parseErrors.length > 0 && (
          <Alert color="yellow" variant="light" p="xs" mt="xs">
            <Text size="xs" c="dimmed">
              {t("templateWarnings", { count: String(parseErrors.length) })}
            </Text>
            {parseErrors.map((msg) => (
              <Text key={msg} size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                {msg}
              </Text>
            ))}
          </Alert>
        )}
      </Stack>
    </WidgetDefinitionProvider>
  );
}

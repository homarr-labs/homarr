"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JsxParser from "react-jsx-parser";
import { Alert, Badge, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconNetwork } from "@tabler/icons-react";

import { WHITELISTED_COMPONENTS, SAFE_BINDINGS } from "./jsx-whitelist";
import { WidgetDefinitionProvider } from "./widget-definition-context";

const MAX_PARSE_ERRORS = 5;

function appendParseError(prev: string[], message: string): string[] {
  if (prev.length >= MAX_PARSE_ERRORS) return prev;
  if (prev.includes(message)) return prev;
  return [...prev, message];
}

const METHOD_PATTERN = /(?:method|method)\s*=\s*["'](\w+)["']/gi;
const SUBFETCH_PATTERN = /<(?:SubFetch|ActionButton|ToggleSwitch)\b/g;

export function extractHttpMethods(template: string): string[] {
  const methods = new Set<string>();
  if (SUBFETCH_PATTERN.test(template)) {
    SUBFETCH_PATTERN.lastIndex = 0;
    let match = METHOD_PATTERN.exec(template);
    while (match) {
      methods.add(match[1].toUpperCase());
      match = METHOD_PATTERN.exec(template);
    }
    if (/<ActionButton\b/.test(template) && methods.size === 0) methods.add("POST");
    if (/<ToggleSwitch\b/.test(template) && methods.size === 0) methods.add("POST");
    if (/<SubFetch\b/.test(template) && methods.size === 0) methods.add("GET");
  }
  return [...methods].sort();
}

const METHOD_COLORS: Record<string, string> = {
  GET: "blue",
  POST: "orange",
  PUT: "yellow",
  DELETE: "red",
  PATCH: "grape",
};

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const template = String(data.template ?? "");
  const apiData = data.data;
  const definitionId = String(data.widgetDefinitionId ?? "");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const bindings = useMemo(() => SAFE_BINDINGS(apiData), [apiData]);
  const httpMethods = useMemo(() => extractHttpMethods(template), [template]);

  useEffect(() => {
    setParseErrors([]);
  }, [template, bindings]);

  const handleError = useCallback((error: Error) => {
    setParseErrors((prev) => appendParseError(prev, error.message));
  }, []);

  if (!template.trim()) {
    return (
      <Alert color="gray" variant="light" p="xs">
        <Text size="xs" c="dimmed">
          No JSX template configured
        </Text>
      </Alert>
    );
  }

  return (
    <WidgetDefinitionProvider definitionId={definitionId}>
      <Stack gap={0} h="100%">
        {httpMethods.length > 0 && (
          <Alert color="yellow" variant="light" p={4} mb={4} icon={<IconNetwork size={14} />}>
            <Group gap={4} align="center">
              <Text size="xs" c="dimmed">
                HTTP:
              </Text>
              {httpMethods.map((m) => (
                <Badge key={m} size="xs" color={METHOD_COLORS[m] ?? "gray"} variant="filled">
                  {m}
                </Badge>
              ))}
            </Group>
          </Alert>
        )}
        <JsxParser
          jsx={template}
          components={WHITELISTED_COMPONENTS as never}
          bindings={bindings}
          disableKeyGeneration
          componentsOnly
          allowUnknownElements={false}
          blacklistedAttrs={[/^on.+/i, /^dangerously/i]}
          blacklistedTags={["script", "iframe", "object", "embed", "form", "style", "link", "meta", "base"]}
          onError={handleError}
          renderError={({ error }) => (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
              <Text size="xs">{String(error)}</Text>
            </Alert>
          )}
        />
        {parseErrors.length > 0 && (
          <Alert color="yellow" variant="light" p="xs" mt="xs">
            <Text size="xs" c="dimmed">
              {parseErrors.length} template warning(s):
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

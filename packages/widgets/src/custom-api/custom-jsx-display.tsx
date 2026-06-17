"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JsxParser from "react-jsx-parser";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { WHITELISTED_COMPONENTS, SAFE_BINDINGS } from "./jsx-whitelist";

const MAX_PARSE_ERRORS = 5;

function appendParseError(prev: string[], message: string): string[] {
  if (prev.length >= MAX_PARSE_ERRORS) return prev;
  if (prev.includes(message)) return prev;
  return [...prev, message];
}

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const template = String(data.template ?? "");
  const apiData = data.data;
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const bindings = useMemo(() => SAFE_BINDINGS(apiData), [apiData]);

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
    <Stack gap={0} h="100%">
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
  );
}

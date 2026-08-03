"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JsxParser from "react-jsx-parser";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { WHITELISTED_COMPONENTS, SAFE_BINDINGS } from "./jsx-whitelist";

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const template = String(data.template ?? "");
  const apiData = data.data;
  const [hasParseError, setHasParseError] = useState(false);
  const bindings = useMemo(() => SAFE_BINDINGS(apiData), [apiData]);

  useEffect(() => {
    setHasParseError(false);
  }, [template, bindings]);

  const handleError = useCallback(() => setHasParseError(true), []);

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
        renderError={() => (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs">Invalid widget template</Text>
          </Alert>
        )}
      />
      {hasParseError && (
        <Alert color="yellow" variant="light" p="xs" mt="xs">
          <Text size="xs" c="dimmed">
            Invalid widget template
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

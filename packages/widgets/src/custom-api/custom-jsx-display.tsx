"use client";

import { useCallback, useState } from "react";
import JsxParser from "react-jsx-parser";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { WHITELISTED_COMPONENTS, SAFE_BINDINGS } from "./jsx-whitelist";

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const template = String(data.template ?? "");
  const apiData = data.data;
  const definitionId = data._definitionId as string | undefined;
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const handleError = useCallback((error: Error) => {
    setParseErrors((prev) => {
      if (prev.length >= 5) return prev;
      const msg = error.message;
      if (prev.includes(msg)) return prev;
      return [...prev, msg];
    });
  }, []);

  const bindings = SAFE_BINDINGS(apiData);
  if (definitionId) {
    bindings.definitionId = definitionId;
  }

  return (
    <Stack gap={0} h="100%">
      <JsxParser
        jsx={template}
        components={WHITELISTED_COMPONENTS as never}
        bindings={bindings}
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
            {parseErrors.length} template warning(s)
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

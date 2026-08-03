"use client";

import { useMemo } from "react";
import JsxParser from "react-jsx-parser";
import { Alert, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { WHITELISTED_COMPONENTS, SAFE_BINDINGS } from "./jsx-whitelist";

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const template = String(data.template ?? "");
  const apiData = data.data;
  const bindings = useMemo(() => SAFE_BINDINGS(apiData), [apiData]);

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
        renderError={() => (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs">Invalid widget template</Text>
          </Alert>
        )}
      />
    </Stack>
  );
}

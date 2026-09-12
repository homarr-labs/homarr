"use client";

import { Button, Stack, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";

function suggestedScope(baseUrl: string): CustomWidgetSource["networkScope"] | undefined {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.startsWith("127.") ||
      hostname === "[::1]"
    )
      return "loopback";
    if (
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/u.test(hostname) ||
      /^\[(?:fc|fd)/u.test(hostname) ||
      (!hostname.includes(".") && !hostname.startsWith("[")) ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".lan")
    )
      return "private";
  } catch {
    /* URL validation is shown by the source field. */
  }
  return undefined;
}

export function SourceNetworkHint({
  source,
  onChange,
}: {
  source: CustomWidgetSource;
  onChange(scope: CustomWidgetSource["networkScope"]): void;
}) {
  const t = useI18n("customWidget.flow");
  const suggestion = suggestedScope(source.baseUrl);
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        {t("serverFetchHint")}
      </Text>
      {suggestion && suggestion !== source.networkScope && (
        <Button size="compact-xs" variant="light" onClick={() => onChange(suggestion)}>
          {t("suggestNetworkScope", { scope: suggestion })}
        </Button>
      )}
    </Stack>
  );
}

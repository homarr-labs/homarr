"use client";

import { useEffect } from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n, useScopedI18n } from "@homarr/translation/client";

export default function ManageErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const tError = useScopedI18n("management.error");
  const t = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconAlertTriangle size={48} stroke={1.5} />
        <Title order={3}>{tError("title")}</Title>
        <Text size="sm" c="dimmed" maw={480} ta="center">
          {tError("text")}
        </Text>
        {error.digest && (
          <Text size="xs" c="dimmed">
            {tError("digest", { digest: error.digest })}
          </Text>
        )}
        <Button variant="light" onClick={unstable_retry}>
          {t("common.action.tryAgain")}
        </Button>
      </Stack>
    </Center>
  );
}

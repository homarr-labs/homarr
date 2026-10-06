"use client";

import { useEffect } from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export default function ManageErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const tError = useI18n("management.error");
  const tCommon = useI18n("common");

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
          {tCommon("action.tryAgain")}
        </Button>
      </Stack>
    </Center>
  );
}

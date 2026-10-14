import { Alert, Button, Skeleton, Stack, Text } from "@mantine/core";
import { ORPCError } from "@orpc/client";

import { useI18n } from "@homarr/translation/standalone/client";

export function DockerLoadError({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useI18n();
  const denied = error instanceof ORPCError && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN");
  return (
    <Alert color="red" title={denied ? "Docker access denied" : t("docker.error.internalServerError")} role="alert">
      <Stack gap="xs">
        <Text size="sm">{error instanceof Error ? error.message : "Docker request failed"}</Text>
        {retry && !denied && (
          <Button variant="light" color="red" w="fit-content" onClick={retry}>
            {t("common.action.tryAgain")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function DockerLoading() {
  return (
    <Stack aria-live="polite" aria-busy="true" aria-label="Loading Docker inventory">
      <Skeleton h={40} />
      <Skeleton h={120} />
    </Stack>
  );
}

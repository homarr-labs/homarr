"use client";

import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export function PackageRuntimeStatus({ id }: { id: string }) {
  const t = useI18n("customWidget.package.runtime");
  const status = clientApi.customWidget.package.runtimeStatus.useQuery({ id });
  const data = status.data;
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>{t("title")}</Text>
      <Text size="xs" c="dimmed">{t("description")}</Text>
      <Group>
        {data && <Badge variant="light">{t(data.state)}</Badge>}
        <Button variant="subtle" size="xs" loading={status.isFetching} onClick={() => void status.refetch()}>{t("refresh")}</Button>
      </Group>
      {data && "pid" in data && (
        <Text size="xs">{t("process", { pid: data.pid ?? "—", active: data.activeRequests, queued: data.queuedRequests })}</Text>
      )}
      {data && "error" in data && <Alert color="red">{data.error}</Alert>}
      {status.error && <Alert color="red">{status.error.message}</Alert>}
      <Button component={Link} href="/manage/tools/logs" target="_blank" rel="noopener noreferrer" variant="default" size="xs">{t("logs")}</Button>
    </Stack>
  );
}

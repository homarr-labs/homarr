"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export function PackageConvert({ definitionId, name }: { definitionId: string; name: string }) {
  const t = useI18n("customWidget.package.conversion");
  const router = useRouter();
  const convert = clientApi.customWidget.package.convertV2.useMutation();
  const [nextName, setNextName] = useState(name);
  return (
    <Stack>
      <Title order={2}>{t("title")}</Title>
      <Text>{t("description")}</Text>
      <Text size="sm" c="dimmed">
        {t("savedSource")}
      </Text>
      <TextInput
        label={t("name")}
        value={nextName}
        maxLength={128}
        onChange={(event) => setNextName(event.currentTarget.value)}
      />
      {convert.error && <Alert color="red">{convert.error.message}</Alert>}
      <Group>
        <Button
          disabled={!nextName.trim()}
          loading={convert.isPending}
          onClick={() =>
            convert.mutate(
              { definitionId, name: nextName },
              { onSuccess: (result) => router.push(result.managementPath) },
            )
          }
        >
          {t("create")}
        </Button>
        <Button component={Link} href={`/manage/custom-widgets/edit/${definitionId}`} variant="subtle">
          {t("back")}
        </Button>
      </Group>
    </Stack>
  );
}

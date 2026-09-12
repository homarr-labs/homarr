"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Group, Stack, Text, TextInput, Title, Skeleton } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import type { widgetReferencePackages } from "@homarr/widget-sdk/examples";
import { PackageWorkspace } from "./_package-workspace";

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

export function NativePackageWorkspace({
  userId,
  sourceItemId,
  starter,
}: {
  userId: string;
  sourceItemId: string;
  starter: keyof typeof widgetReferencePackages;
}) {
  const t = useI18n("customWidget.package");
  const preparation = clientApi.customWidget.package.prepareNative.useMutation();
  const prepare = preparation.mutate;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    prepare({ sourceItemId, starter });
  }, [prepare, sourceItemId, starter]);
  if (preparation.data)
    return (
      <PackageWorkspace
        userId={userId}
        initialSource={preparation.data.source}
        initialName={preparation.data.name}
        initialBindings={preparation.data.bindings}
        initialBoardId={preparation.data.sourceBoardId}
      />
    );
  if (preparation.error)
    return (
      <Stack>
        <Alert color="red">{preparation.error.message}</Alert>
        <Button onClick={() => prepare({ sourceItemId, starter })}>{t("retryPreparation")}</Button>
      </Stack>
    );
  return (
    <Stack>
      <Skeleton height={50} />
      <Skeleton height={400} />
    </Stack>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Alert, Button, Skeleton, Stack } from "@mantine/core";

import type { widgetReferencePackages } from "@homarr/widget-sdk/examples";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { PackageWorkspace } from "./_package-workspace";

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

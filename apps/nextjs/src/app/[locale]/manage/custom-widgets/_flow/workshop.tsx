"use client";

import { useState } from "react";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { parseCustomWidgetWorkshopOrigin } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";
import { useConfirmModal } from "@homarr/modals";
import { Link } from "@homarr/ui";

import { getWorkshopApiUrl } from "~/components/workshop/workshop-client";
import { useCustomWidgetFormDocumentDirty, useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { WorkshopUpdateDiff } from "./workshop-diff";

export function WorkbenchWorkshop({ definitionId }: { definitionId?: string }) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const dirty = useCustomWidgetFormDocumentDirty();
  const [opened, setOpened] = useState(false);
  const { openConfirmModal } = useConfirmModal();
  const saved = clientApi.customWidget.get.useQuery({ id: definitionId ?? "" }, { enabled: Boolean(definitionId) });
  const origin = parseCustomWidgetWorkshopOrigin(saved.data?.workshopOrigin);
  const matchesEndpoint = origin?.endpoint === getWorkshopApiUrl();
  const review = clientApi.customWidget.workshopUpdateReview.useQuery(
    { id: definitionId ?? "" },
    {
      enabled: opened && Boolean(origin) && matchesEndpoint,
      refetchOnWindowFocus: false,
    },
  );
  const recovery = clientApi.customWidget.workshopRollbackReview.useQuery(
    { id: definitionId ?? "" },
    {
      enabled: opened && Boolean(origin),
      refetchOnWindowFocus: false,
    },
  );
  const install = clientApi.customWidget.workshopUpdateInstall.useMutation({
    onSuccess: () => window.location.reload(),
  });
  const rollback = clientApi.customWidget.workshopRollback.useMutation({ onSuccess: () => window.location.reload() });
  const update = review.data;
  const hasUpdate = update && update.revision > update.origin.revision;
  const error = review.error ?? recovery.error ?? install.error ?? rollback.error;
  const pending = install.isPending || rollback.isPending;

  const confirmUpdate = () => {
    if (!definitionId || !update) return;
    openConfirmModal({
      title: t("installUpdate"),
      children: t("updateConfirmation"),
      onConfirm: () => {
        if (store.getDirty()) return;
        install.mutate({
          id: definitionId,
          revision: update.revision,
          expectedFingerprint: update.expectedFingerprint,
          upstreamFingerprint: update.upstreamFingerprint,
          expectedState: update.expectedState,
        });
      },
    });
  };
  const confirmRollback = () => {
    if (!definitionId || !recovery.data) return;
    const reviewed = recovery.data;
    openConfirmModal({
      title: t("rollback"),
      children: t("rollbackConfirmation"),
      onConfirm: () => {
        if (store.getDirty()) return;
        rollback.mutate({
          id: definitionId,
          expectedFingerprint: reviewed.expectedFingerprint,
          expectedState: reviewed.expectedState,
        });
      },
    });
  };

  return (
    <>
      <Button size="compact-xs" variant="subtle" onClick={() => setOpened(true)}>
        {t("workshop")}
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title={t("workshop")} size="xl">
        <Stack>
          <Group>
            <Button component={Link} href="/manage/custom-widgets/workshop" variant="default">
              {t("browse")}
            </Button>
            {definitionId && (
              <Button component={Link} href={`/manage/custom-widgets/publish/${definitionId}`} disabled={dirty}>
                {t("publish")}
              </Button>
            )}
            {origin && matchesEndpoint && (
              <Button component={Link} href={`/manage/custom-widgets/workshop/${origin.submissionId}`} variant="light">
                {t("viewSubmission")}
              </Button>
            )}
          </Group>
          {dirty && <Alert color="yellow">{t("saveBeforeUpdate")}</Alert>}
          {!origin && (
            <Text size="sm" c="dimmed">
              {t("unlinked")}
            </Text>
          )}
          {origin && !matchesEndpoint && <Alert color="yellow">{t("differentWorkshop")}</Alert>}
          {origin && matchesEndpoint && (
            <Button
              variant="subtle"
              loading={review.isFetching}
              disabled={pending}
              onClick={() => {
                void review.refetch();
                void recovery.refetch();
              }}
            >
              {t("checkUpdates")}
            </Button>
          )}
          {error && <Alert color="red">{error.message}</Alert>}
          {update && matchesEndpoint && (
            <>
              <Text fw={600}>{t("revision", { installed: update.origin.revision, latest: update.revision })}</Text>
              {update.changelog && <Text size="sm">{update.changelog}</Text>}
              {update.locallyModified && <Alert color="yellow">{t("localChanges")}</Alert>}
              {update.sourceBindingChanged && <Alert color="yellow">{t("sourceChanges")}</Alert>}
              {hasUpdate && <WorkshopUpdateDiff current={update.current} incoming={update.incoming} />}
              <Group>
                {hasUpdate && (
                  <Button
                    disabled={dirty || pending || update.locallyModified || update.sourceBindingChanged}
                    loading={install.isPending}
                    onClick={confirmUpdate}
                  >
                    {t("installUpdate")}
                  </Button>
                )}
                {hasUpdate && (
                  <Button
                    variant="default"
                    component={Link}
                    href={`/manage/custom-widgets/workshop/${update.origin.submissionId}`}
                  >
                    {t("installCopy")}
                  </Button>
                )}
              </Group>
            </>
          )}
          {recovery.data?.rollbackAvailable && (
            <Button variant="subtle" disabled={dirty || pending} loading={rollback.isPending} onClick={confirmRollback}>
              {t("rollback")}
            </Button>
          )}
        </Stack>
      </Modal>
    </>
  );
}

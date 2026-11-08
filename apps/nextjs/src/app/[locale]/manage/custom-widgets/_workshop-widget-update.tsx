"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { applyCustomWidgetSourceSetup, getImportReview } from "@homarr/custom-widgets/core";
import type { CustomWidgetSecretKind } from "@homarr/custom-widgets/core";
import {
  createCustomWidgetSourceSetupValues,
  ImportReviewDialog,
  isCustomWidgetSourceSetupReady,
} from "@homarr/custom-widgets/workbench";
import type { CustomWidgetSourceSetupValue } from "@homarr/custom-widgets/workbench";
import { SourceSetupPanel } from "@homarr/forms-collection/custom-widgets";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useCustomWidgetImportMessages } from "~/components/custom-widgets/use-custom-widget-import-messages";

export function WorkshopWidgetUpdate({ definitionId }: { definitionId: string }) {
  const t = useI18n("customWidget.workshopUpdate");
  const tCommon = useI18n("common");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const [opened, controls] = useDisclosure(false);
  const [approved, setApproved] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [values, setValues] = useState<Record<string, CustomWidgetSourceSetupValue>>({});
  const { reviewMessages, setupMessages } = useCustomWidgetImportMessages();
  const update = clientApi.customWidget.workshopCheckUpdate.useQuery(
    { id: definitionId },
    { staleTime: 60_000, refetchOnWindowFocus: false, retry: false },
  );
  const data = update.data;
  useEffect(() => {
    if (!opened || !data) return;
    setValues(createCustomWidgetSourceSetupValues(data.sourceSetup));
    setApproved(false);
    setOverwrite(false);
  }, [opened, data]);
  const configured = useMemo(() => {
    if (!data) return null;
    return {
      ...data.widget,
      sources: applyCustomWidgetSourceSetup(data.widget.sources, values),
    };
  }, [data, values]);
  const review = useMemo(() => getImportReview(configured) ?? getImportReview(data?.widget), [configured, data]);
  const permissionApprovalRequired = Boolean(
    data && (data.permissionsChanged || JSON.stringify(configured?.sources) !== JSON.stringify(data.widget.sources)),
  );
  const mutation = clientApi.customWidget.workshopUpdate.useMutation({
    onSuccess: async (result) => {
      if (result.status !== "updated") {
        showErrorNotification({ title: t("title"), message: t("approvePermissions") });
        return;
      }
      controls.close();
      showSuccessNotification({ title: t("title"), message: t("updated") });
      await Promise.all([
        utils.customWidget.list.invalidate(),
        utils.customWidget.get.invalidate({ id: definitionId }),
        utils.customWidget.available.invalidate(),
        utils.customWidget.workshopCheckUpdate.invalidate({ id: definitionId }),
        utils.widget.customApi.getData.invalidate(),
      ]);
      await revalidatePathActionAsync("/manage/custom-widgets");
      router.refresh();
    },
    onError: (error) => {
      showErrorNotification({ title: t("title"), message: error.message });
      if (error.data?.code === "CONFLICT") void update.refetch();
    },
  });

  if (!data?.available) {
    if (!update.isError) return null;
    return (
      <Button variant="default" size="sm" loading={update.isFetching} onClick={() => void update.refetch()}>
        {t("check")}
      </Button>
    );
  }

  const apply = () => {
    if (!configured) return;
    mutation.mutate({
      id: definitionId,
      reviewToken: data.reviewToken,
      approvePermissions: approved,
      overwriteLocalChanges: overwrite,
      sources: Object.fromEntries(
        Object.entries(values).map(([id, value]) => [
          id,
          {
            baseUrl: value.baseUrl,
            integrationId: value.integrationId,
          },
        ]),
      ),
      secrets: Object.entries(values).flatMap(([sourceId, value]) =>
        Object.entries(value.secrets).flatMap(([kind, secret]) => {
          if (!secret?.trim()) return [];
          return [{ sourceId, kind: kind as CustomWidgetSecretKind, value: secret }];
        }),
      ),
    });
  };

  const openReview = async () => {
    const result = await update.refetch();
    if (result.error) {
      showErrorNotification({ title: t("title"), message: result.error.message });
      return;
    }
    if (result.data?.available) controls.open();
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        leftSection={<IconRefresh size={16} />}
        loading={update.isFetching}
        onClick={() => void openReview()}
      >
        {t("available")}
      </Button>
      <ImportReviewDialog
        opened={opened}
        onClose={controls.close}
        review={review}
        pending={mutation.isPending}
        onConfirm={apply}
        confirmDisabled={
          !isCustomWidgetSourceSetupReady(data.sourceSetup, values) ||
          (permissionApprovalRequired && !approved) ||
          (data.locallyModified && !overwrite)
        }
        messages={{
          ...reviewMessages,
          description: t("description", { installed: data.installedRevision, latest: data.revision }),
          title: t("title"),
          cancel: tCommon("action.cancel"),
          confirm: t("apply"),
        }}
      >
        <Stack gap="sm">
          {(data.outdated || data.reportCount > 0) && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              {t("communityWarning")}
            </Alert>
          )}
          {data.changelog && <Text size="sm">{data.changelog}</Text>}
          <SourceSetupPanel
            setups={data.sourceSetup}
            values={values}
            onChange={(sourceId, value) => {
              setValues((current) => ({ ...current, [sourceId]: value }));
              setApproved(false);
            }}
            messages={setupMessages}
          />
          {permissionApprovalRequired && (
            <Checkbox
              checked={approved}
              onChange={(event) => setApproved(event.currentTarget.checked)}
              label={t("approvePermissions")}
              description={t("pendingDescription")}
            />
          )}
          {data.locallyModified && (
            <Checkbox
              checked={overwrite}
              onChange={(event) => setOverwrite(event.currentTarget.checked)}
              label={t("overwriteLocalChanges")}
            />
          )}
          <Group justify="flex-end">
            <Button
              component={Link}
              href={`/manage/custom-widgets/workshop/${data.submissionId}`}
              variant="subtle"
              size="sm"
            >
              {t("installSeparate")}
            </Button>
          </Group>
        </Stack>
      </ImportReviewDialog>
    </>
  );
}

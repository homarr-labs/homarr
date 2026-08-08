"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import {
  applyCustomWidgetSourceSetup,
  getCustomWidgetSourceSetups,
  getImportReview,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSecretKind, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import {
  createCustomWidgetSourceSetupValues,
  CustomWidgetSourceSetupPanel,
  ImportReviewDialog,
  isCustomWidgetSourceSetupReady,
} from "@homarr/custom-widgets/workbench";
import type { CustomWidgetSourceSetupValue } from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface CustomWidgetImportDialogProps {
  opened: boolean;
  widget: HomarrCustomWidgetV2 | null;
  legacyId?: string;
  stackId?: string;
  zIndex?: number;
  onClose(): void;
  onImported?(result: { id: string }): void;
}

export function CustomWidgetImportDialog({
  opened,
  widget,
  legacyId,
  stackId,
  zIndex,
  onClose,
  onImported,
}: CustomWidgetImportDialogProps) {
  const t = useScopedI18n("customWidget");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const setups = useMemo(() => getCustomWidgetSourceSetups(widget?.sources ?? {}), [widget]);
  const [values, setValues] = useState<Record<string, CustomWidgetSourceSetupValue>>({});
  const configuredWidget = useMemo(() => {
    if (!widget) return null;
    return {
      ...widget,
      sources: applyCustomWidgetSourceSetup(
        widget.sources,
        Object.fromEntries(
          Object.entries(values).map(([sourceId, value]) => [
            sourceId,
            { baseUrl: value.baseUrl, networkScope: value.networkScope },
          ]),
        ),
      ),
    };
  }, [values, widget]);
  const review = useMemo(() => getImportReview(configuredWidget), [configuredWidget]);
  const onSuccess = (result: { id: string }) => {
    showSuccessNotification({
      title: legacyId ? t("action.migrate") : t("action.import"),
      message: legacyId ? t("notification.migrated") : t("notification.imported"),
    });
    void utils.customWidget.list.invalidate();
    void utils.customWidget.available.invalidate();
    void utils.widget.customApi.getData.invalidate();
    void revalidatePathActionAsync("/manage/custom-widgets").then(() => router.refresh());
    onImported?.(result);
    onClose();
  };
  const onError = (error: { message?: string }) => {
    showErrorNotification({
      title: legacyId ? t("action.migrate") : t("action.import"),
      message: error.message || (legacyId ? t("notification.migrationError") : t("notification.importError")),
    });
  };
  const importMutation = clientApi.customWidget.import.useMutation({ onSuccess, onError });
  const migrateMutation = clientApi.customWidget.migrateLegacy.useMutation({ onSuccess, onError });
  const pending = importMutation.isPending || migrateMutation.isPending;

  useEffect(() => {
    if (opened) setValues(createCustomWidgetSourceSetupValues(setups));
  }, [opened, setups]);

  const importWidget = () => {
    if (!configuredWidget) return;
    const secrets = Object.entries(values).flatMap(([sourceId, value]) =>
      Object.entries(value.secrets).flatMap(([kind, secret]) =>
        secret?.trim() ? [{ sourceId, kind: kind as CustomWidgetSecretKind, value: secret }] : [],
      ),
    );
    if (legacyId) migrateMutation.mutate({ id: legacyId, widget: configuredWidget, secrets });
    else importMutation.mutate({ widget: configuredWidget, secrets });
  };

  return (
    <ImportReviewDialog
      opened={opened}
      stackId={stackId}
      zIndex={zIndex}
      review={review}
      pending={pending}
      confirmDisabled={!isCustomWidgetSourceSetupReady(setups, values)}
      onClose={onClose}
      onConfirm={importWidget}
      messages={{
        title: legacyId ? t("importReview.migrationTitle") : t("importReview.title"),
        description: legacyId ? t("importReview.migrationDescription") : t("importReview.description"),
        name: t("importReview.name"),
        origin: t("importReview.origin"),
        authentication: t("importReview.authentication"),
        networkScope: t("importReview.networkScope"),
        methods: t("importReview.methods"),
        permissions: t("importReview.permissions"),
        actionWarningTitle: t("importReview.actionWarning.title"),
        actionWarningDescription: t("importReview.actionWarning.description"),
        cancel: t("importReview.cancel"),
        confirm: legacyId ? t("importReview.confirmMigration") : t("importReview.confirm"),
        permission: (permission) => t(`preview.request.permission.${permission}` as never),
      }}
    >
      <CustomWidgetSourceSetupPanel
        setups={setups}
        values={values}
        onChange={(sourceId, value) => setValues((current) => ({ ...current, [sourceId]: value }))}
        messages={{
          title: t("importReview.sourceSetup.title"),
          description: t("importReview.sourceSetup.description"),
          suggestedUrl: t("importReview.sourceSetup.suggestedUrl"),
          baseUrl: t("workbench.sources.baseUrl"),
          networkScope: t("workbench.sources.networkScope"),
          authentication: t("workbench.sources.authentication"),
          confirmUrl: t("importReview.sourceSetup.confirmUrl"),
          ready: t("importReview.sourceSetup.ready"),
          needsUrl: t("importReview.sourceSetup.needsUrl"),
          credentialsMissing: t("importReview.sourceSetup.credentialsMissing"),
          credentialsOptional: t("importReview.sourceSetup.credentialsOptional"),
          configured: t("workbench.sources.configured"),
          secret: (kind) => t(`importReview.credentials.field.${kind}`),
          urlError: (issue) => t(`workbench.sources.baseUrlError.${issue}`),
        }}
      />
    </ImportReviewDialog>
  );
}

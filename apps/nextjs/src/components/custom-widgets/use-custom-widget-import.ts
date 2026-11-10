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
import { createCustomWidgetSourceSetupValues, isCustomWidgetSourceSetupReady } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetSourceSetupValue } from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { useCustomWidgetImportMessages } from "./use-custom-widget-import-messages";

interface UseCustomWidgetImportOptions {
  widget: HomarrCustomWidgetV2 | null;
  /** Set when replacing an existing v1 widget instead of creating a new one. */
  legacyId?: string;
  workshop?: { submissionId: string; revision: number };
  onImported?(result: { id: string }): void;
}

/**
 * The single import pipeline behind every "add this custom widget" surface:
 * source setup, security review and the mutation itself. Keeping it in one hook
 * means the Workshop page and the file/clipboard dialog can never drift apart.
 */
export function useCustomWidgetImport({ widget, legacyId, workshop, onImported }: UseCustomWidgetImportOptions) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const router = useRouter();
  const utils = clientApi.useUtils();

  // Keyed on the sources themselves rather than the widget object: a background
  // refetch (window focus, or the invalidation a vote triggers) hands us a new but
  // identical object, and resetting on that would silently wipe credentials the
  // user is part-way through typing.
  const sourcesKey = JSON.stringify(widget?.sources ?? {});
  const setups = useMemo(
    () => getCustomWidgetSourceSetups(widget?.sources ?? {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourcesKey],
  );
  const [values, setValues] = useState<Record<string, CustomWidgetSourceSetupValue>>({});
  useEffect(() => setValues(createCustomWidgetSourceSetupValues(setups)), [setups]);

  const configuredWidget = useMemo(() => {
    if (!widget) return null;
    return {
      ...widget,
      sources: applyCustomWidgetSourceSetup(
        widget.sources,
        Object.fromEntries(
          Object.entries(values).map(([sourceId, value]) => [
            sourceId,
            { baseUrl: value.baseUrl, integrationId: value.integrationId },
          ]),
        ),
      ),
    };
  }, [values, widget]);
  const review = useMemo(() => getImportReview(configuredWidget), [configuredWidget]);

  // A widget must only ever be imported once per visit: the mutation creates a new
  // record every call, so a second click would silently duplicate it.
  const [succeeded, setSucceeded] = useState(false);
  const [checkingWorkshop, setCheckingWorkshop] = useState(false);
  useEffect(() => setSucceeded(false), [widget]);

  const onSuccess = (result: { id: string }) => {
    setSucceeded(true);
    showSuccessNotification({
      title: legacyId ? t("action.migrate") : tCommon("action.import"),
      message: legacyId ? t("notification.migrated") : t("notification.imported"),
    });
    void utils.customWidget.list.invalidate();
    void utils.customWidget.available.invalidate();
    void utils.widget.customApi.getData.invalidate();
    // Hand over to the caller before the server-side revalidation round-trip so
    // navigation is immediate rather than waiting on it.
    onImported?.(result);
    void revalidatePathActionAsync("/manage/custom-widgets").then(() => router.refresh());
  };
  const onError = (error: { message?: string }) => {
    showErrorNotification({
      title: legacyId ? t("action.migrate") : tCommon("action.import"),
      message: error.message || (legacyId ? t("notification.migrationError") : t("notification.importError")),
    });
  };

  const importMutation = clientApi.customWidget.import.useMutation({
    onSuccess,
    onError,
  });
  const migrateMutation = clientApi.customWidget.migrateLegacy.useMutation({
    onSuccess,
    onError,
  });
  const workshopMutation = clientApi.customWidget.workshopInstall.useMutation({
    onSuccess: (result) => onSuccess({ id: result.definitionId }),
    onError,
  });

  const pending =
    importMutation.isPending || migrateMutation.isPending || workshopMutation.isPending || checkingWorkshop;

  const importWidget = async () => {
    if (!configuredWidget || pending || succeeded) return;
    const secrets = Object.entries(values).flatMap(([sourceId, value]) =>
      Object.entries(value.secrets).flatMap(([kind, secret]) =>
        secret?.trim() ? [{ sourceId, kind: kind as CustomWidgetSecretKind, value: secret }] : [],
      ),
    );
    if (workshop) {
      setCheckingWorkshop(true);
      try {
        const verified = await utils.customWidget.workshopGet.fetch({ submissionId: workshop.submissionId });
        if (
          verified.submission.revision !== workshop.revision ||
          JSON.stringify(verified.widget) !== JSON.stringify(widget)
        ) {
          throw new Error(t("workshopUpdate.changedBeforeInstall"));
        }
        workshopMutation.mutate({
          submissionId: workshop.submissionId,
          expectedRevision: workshop.revision,
          expectedContentHash: verified.contentHash,
          name: configuredWidget.name,
          sources: Object.fromEntries(
            Object.entries(values).map(([sourceId, value]) => [
              sourceId,
              {
                baseUrl: value.baseUrl,
                integrationId: value.integrationId,
              },
            ]),
          ),
          secrets,
        });
      } catch (error) {
        onError({ message: error instanceof Error ? error.message : undefined });
      } finally {
        setCheckingWorkshop(false);
      }
    } else if (legacyId)
      migrateMutation.mutate({
        id: legacyId,
        widget: configuredWidget,
        secrets,
      });
    else importMutation.mutate({ widget: configuredWidget, secrets });
  };

  const { reviewMessages, setupMessages } = useCustomWidgetImportMessages();
  if (legacyId) reviewMessages.description = t("importReview.migrationDescription");

  return {
    review,
    setups,
    values,
    setValue: (sourceId: string, value: CustomWidgetSourceSetupValue) =>
      setValues((current) => ({ ...current, [sourceId]: value })),
    ready: isCustomWidgetSourceSetupReady(setups, values),
    pending,
    /** True once the import went through; callers keep the action locked while navigating away. */
    succeeded,
    importWidget,
    reviewMessages,
    setupMessages,
  };
}

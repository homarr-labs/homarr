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
import type {
  CustomWidgetSourceSetupMessages,
  CustomWidgetSourceSetupValue,
  ImportReviewContentMessages,
} from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface UseCustomWidgetImportOptions {
  widget: HomarrCustomWidgetV2 | null;
  /** Set when replacing an existing v1 widget instead of creating a new one. */
  legacyId?: string;
  onImported?(result: { id: string }): void;
}

/**
 * The single import pipeline behind every "add this custom widget" surface:
 * source setup, security review and the mutation itself. Keeping it in one hook
 * means the Workshop page and the file/clipboard dialog can never drift apart.
 */
export function useCustomWidgetImport({ widget, legacyId, onImported }: UseCustomWidgetImportOptions) {
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
            { baseUrl: value.baseUrl, networkScope: value.networkScope },
          ]),
        ),
      ),
    };
  }, [values, widget]);
  const review = useMemo(() => getImportReview(configuredWidget), [configuredWidget]);

  // A widget must only ever be imported once per visit: the mutation creates a new
  // record every call, so a second click would silently duplicate it.
  const [succeeded, setSucceeded] = useState(false);
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

  const pending = importMutation.isPending || migrateMutation.isPending;

  const importWidget = () => {
    if (!configuredWidget || pending || succeeded) return;
    const secrets = Object.entries(values).flatMap(([sourceId, value]) =>
      Object.entries(value.secrets).flatMap(([kind, secret]) =>
        secret?.trim() ? [{ sourceId, kind: kind as CustomWidgetSecretKind, value: secret }] : [],
      ),
    );
    if (legacyId)
      migrateMutation.mutate({
        id: legacyId,
        widget: configuredWidget,
        secrets,
      });
    else importMutation.mutate({ widget: configuredWidget, secrets });
  };

  const reviewMessages: ImportReviewContentMessages = {
    description: legacyId ? t("importReview.migrationDescription") : t("importReview.description"),
    name: t("importReview.name"),
    origin: t("importReview.origin"),
    authentication: t("importReview.authentication"),
    networkScope: t("importReview.networkScope"),
    methods: t("importReview.methods"),
    permissions: t("importReview.permissions"),
    actionWarningTitle: t("importReview.actionWarning.title"),
    actionWarningDescription: t("importReview.actionWarning.description"),
    permission: (permission) => t(`preview.request.permission.${permission}` as never),
  };

  const setupMessages: CustomWidgetSourceSetupMessages = {
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
    secret: (kind) => t(`secret.${kind}`),
    urlError: (issue) => t(`workbench.sources.baseUrlError.${issue}`),
  };

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

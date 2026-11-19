"use client";

import type { CustomWidgetSourceSetupMessages, ImportReviewContentMessages } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";

export function useCustomWidgetImportMessages() {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const reviewMessages: ImportReviewContentMessages = {
    description: t("importReview.description"),
    name: tCommon("field.name"),
    origin: t("importReview.origin"),
    authentication: t("importReview.authentication"),
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

  return { reviewMessages, setupMessages };
}

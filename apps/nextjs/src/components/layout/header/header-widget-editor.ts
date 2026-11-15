"use client";

import { useState } from "react";

import { clientApi } from "@homarr/api/client";
import { getWidgetName } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { HeaderWidgetItem } from "@homarr/validation/user";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import { LazyWidgetEditModal, preloadWidgetEditModal } from "~/components/board/items/lazy-widget-edit-modal";
import { HeaderWidgetRuntimeBoundary } from "./header-widget-runtime-boundary";

export const useHeaderWidgetEditor = () => {
  const settings = useSettings();
  const utils = clientApi.useUtils();
  const t = useI18n();
  const { openModal } = useModalAction(LazyWidgetEditModal);
  const [loading, setLoading] = useState(false);

  const open = async (item: HeaderWidgetItem, onChange: (item: HeaderWidgetItem) => void) => {
    setLoading(true);
    preloadWidgetEditModal();
    try {
      const { definition } = await loadWidgetResources(item.kind);
      const integrationSupport = definition.supportedIntegrations !== undefined;
      let integrationData = [] as Awaited<ReturnType<typeof utils.integration.all.ensureData>>;
      if (integrationSupport) integrationData = await utils.integration.all.ensureData();
      openModal(
        {
          kind: item.kind,
          definition,
          settings,
          value: { ...item, options: reduceWidgetOptionsWithDefinition(definition, settings, item.options) },
          integrationSupport,
          integrationData: integrationData.filter(
            (integration) =>
              definition.supportedIntegrations?.includes(integration.kind) && integration.permissions.hasUseAccess,
          ),
          previewDimensions: { width: 420, height: 420 },
          previewWrapper: HeaderWidgetRuntimeBoundary,
          onSuccessfulEdit: (value) => onChange({ ...item, ...value }),
        },
        { title: (translate) => `${translate("item.edit.title")} - ${getWidgetName(item.kind, translate)}` },
      );
    } catch (error) {
      showErrorNotification({ title: t("common.error"), message: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return { open, loading };
};

"use client";

import { Center, Loader, VisuallyHidden } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

export function WidgetQueryLoadingState() {
  const t = useI18n("common.widgetQuery");
  return (
    <Center component="output" h="100%" w="100%" p="sm" aria-live="polite">
      <Loader size="sm" />
      <VisuallyHidden>{t("loading")}</VisuallyHidden>
    </Center>
  );
}

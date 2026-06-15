"use client";

import { Select, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetBeszelSystemInput = ({ property, kind }: CommonWidgetInputProps<"beszelSystem">) => {
  const t = useScopedI18n("widget.beszelSystemStats.option.systemId");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  const integrationIds = form.values.integrationIds;

  const {
    data: systemsResult = [],
    isPending,
    isError,
  } = clientApi.widget.beszel.getSystems.useQuery(
    { integrationIds },
    { enabled: integrationIds.length > 0, staleTime: 30_000 },
  );

  if (integrationIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("configureIntegrationFirst")}
      </Text>
    );
  }

  const systems = systemsResult.flatMap((r) => r.systems.map((s) => ({ value: s.id, label: s.name })));

  return (
    <Select
      label={tInput("label")}
      description={tInput("description")}
      placeholder={isPending ? t("loading") : t("placeholder")}
      clearable
      searchable
      nothingFoundMessage={t("noSystems")}
      data={systems}
      disabled={isError}
      error={isError ? t("loadError") : undefined}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};

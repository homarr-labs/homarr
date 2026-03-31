"use client";

import { Select, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetUmamiWebsiteInput = ({ property, kind }: CommonWidgetInputProps<"umamiWebsite">) => {
  const t = useScopedI18n("widget.umami.option.websiteId");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  const integrationIds = form.values.integrationIds;

  const { data: websites, isPending } = clientApi.widget.umami.getWebsites.useQuery(
    { integrationIds },
    { enabled: integrationIds.length > 0 },
  );

  if (integrationIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("configureIntegrationFirst")}
      </Text>
    );
  }

  return (
    <Select
      label={tInput("label")}
      description={tInput("description")}
      placeholder={isPending ? t("loading") : t("placeholder")}
      clearable
      searchable
      nothingFoundMessage={t("noWebsites")}
      data={(websites ?? []).map((site) => ({ value: site.id, label: site.domain }))}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};

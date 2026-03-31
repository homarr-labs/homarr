"use client";

import { MultiSelect, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetUmamiEventNamesInput = ({ property, kind }: CommonWidgetInputProps<"umamiEventNames">) => {
  const t = useScopedI18n("widget.umami.option.eventNames");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  const integrationIds = form.values.integrationIds;
  const websiteId = form.values.options.websiteId as string | undefined;

  const { data: eventNames, isPending } = clientApi.widget.umami.getEventNames.useQuery(
    { integrationIds, websiteId: websiteId ?? "" },
    { enabled: integrationIds.length > 0 && Boolean(websiteId) },
  );

  if (!websiteId || integrationIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("configureWebsiteFirst")}
      </Text>
    );
  }

  return (
    <MultiSelect
      label={tInput("label")}
      description={tInput("description")}
      placeholder={isPending ? t("loading") : t("placeholder")}
      searchable
      nothingFoundMessage={t("noEvents")}
      data={eventNames ?? []}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};

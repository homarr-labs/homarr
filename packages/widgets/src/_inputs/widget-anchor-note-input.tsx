"use client";

import { useMemo, useState } from "react";
import { Loader, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetAnchorNoteInput = ({ property, kind, options }: CommonWidgetInputProps<"anchorNote">) => {
  const t = useI18n();
  const tWidget = useWidgetInputTranslation(kind, property);
  const tAnchor = useScopedI18n("widget.anchorNote");
  const form = useFormContext();
  const integrationId = form.values.integrationIds[0];
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);

  const { data: notes, isPending } = clientApi.widget.anchorNotes.listNotes.useQuery(
    {
      integrationId: integrationId ?? "",
      search: debouncedSearch.trim() ? debouncedSearch : undefined,
      limit: 200,
    },
    {
      enabled: Boolean(integrationId),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const noteOptions = useMemo(
    () =>
      notes?.map((note) => ({
        value: note.id,
        label: note.title,
      })) ?? [],
    [notes],
  );

  return (
    <Select
      label={tWidget("label")}
      description={options.withDescription ? tWidget("description") : undefined}
      placeholder={integrationId ? t("common.select.placeholder") : tAnchor("integrationRequired")}
      nothingFoundMessage={integrationId ? tAnchor("noNotes") : tAnchor("integrationRequired")}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      data={noteOptions}
      leftSection={isPending && integrationId ? <Loader size={16} /> : undefined}
      disabled={!integrationId}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};

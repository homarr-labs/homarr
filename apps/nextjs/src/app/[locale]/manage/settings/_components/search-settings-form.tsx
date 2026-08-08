"use client";

import { Select } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { UseFormReturnType } from "@homarr/form";
import { useScopedI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface SearchSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const SearchSettingsForm = ({ form }: SearchSettingsFormProps) => {
  const tSearch = useScopedI18n("management.page.settings.section.search");
  const [selectableSearchEngines] = clientApi.searchEngine.getSelectable.useSuspenseQuery({ withIntegrations: false });

  return (
    <SectionCard title={tSearch("title")}>
      <Select
        label={tSearch("defaultSearchEngine.label")}
        description={tSearch("defaultSearchEngine.description")}
        data={selectableSearchEngines}
        {...form.getInputProps("defaultSearchEngineId")}
      />
    </SectionCard>
  );
};

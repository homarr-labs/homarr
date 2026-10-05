"use client";

import { Select } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface SearchSettingsFormProps {
  form: UseFormReturnType<FormValues>;
  selectableSearchEngines: RouterOutputs["searchEngine"]["getSelectable"];
}

export const SearchSettingsForm = ({ form, selectableSearchEngines }: SearchSettingsFormProps) => {
  const tSearch = useI18n("management.page.settings.section.search");

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

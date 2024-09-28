import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { SearchEngineEditForm } from "./_search-engine-edit-form";

interface SearchEngineEditPageProps {
  params: { id: string };
}

export default async function SearchEngineEditPage({ params }: SearchEngineEditPageProps) {
  const searchEngine = await api.searchEngine.byId({ id: params.id });
  const t = await getI18n();

  return (
    <ManageContainer>
      <DynamicBreadcrumb dynamicMappings={new Map([[params.id, searchEngine.name]])} nonInteractable={["edit"]} />
      <Stack>
        <Title>{t("search.engine.page.edit.title")}</Title>
        <SearchEngineEditForm searchEngine={searchEngine} />
      </Stack>
    </ManageContainer>
  );
}

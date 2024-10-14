import { Stack, Title } from "@mantine/core";

import { getI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { SearchEngineNewForm } from "./_search-engine-new-form";

export default async function SearchEngineNewPage() {
  const t = await getI18n();

  return (
    <ManageContainer>
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("search.engine.page.create.title")}</Title>
        <SearchEngineNewForm />
      </Stack>
    </ManageContainer>
  );
}

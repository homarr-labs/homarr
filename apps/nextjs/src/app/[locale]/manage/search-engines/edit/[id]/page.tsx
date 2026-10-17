import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { SearchEngineEditForm } from "./_search-engine-edit-form";

interface SearchEngineEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function SearchEngineEditPage(props: SearchEngineEditPageProps) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user.permissions.includes("search-engine-modify-all")) {
    notFound();
  }

  const searchEngine = await api.searchEngine.byId({ id: params.id });
  const t = await getI18n("search.engine.page.edit");

  return (
    <ManagePageLayout
      title={t("title")}
      breadcrumb={
        <DynamicBreadcrumb dynamicMappings={new Map([[params.id, searchEngine.name]])} nonInteractable={["edit"]} />
      }
    >
      <SearchEngineEditForm searchEngine={searchEngine} />
    </ManagePageLayout>
  );
}

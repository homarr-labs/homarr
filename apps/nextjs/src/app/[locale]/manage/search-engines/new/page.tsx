import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { SearchEngineNewForm } from "./_search-engine-new-form";

export default async function SearchEngineNewPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("search-engine-create")) {
    notFound();
  }

  const t = await getI18n("search.engine.page.create");

  return (
    <ManagePageLayout title={t("title")}>
      <SearchEngineNewForm />
    </ManagePageLayout>
  );
}

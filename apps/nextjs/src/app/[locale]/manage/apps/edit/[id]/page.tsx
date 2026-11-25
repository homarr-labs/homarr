import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { AppEditForm } from "./_app-edit-form";

interface AppEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppEditPage(props: AppEditPageProps) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user.permissions.includes("app-modify-all")) {
    notFound();
  }
  const app = await api.app.byId({ id: params.id });
  const t = await getI18n();

  return (
    <ManagePageLayout
      title={t("app.page.edit.title")}
      container="default"
      breadcrumbPlacement="outside"
      breadcrumb={<DynamicBreadcrumb dynamicMappings={new Map([[params.id, app.name]])} nonInteractable={["edit"]} />}
    >
      <AppEditForm app={app} />
    </ManagePageLayout>
  );
}

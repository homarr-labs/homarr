import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { AppNewForm } from "@homarr/forms-collection";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";

export default async function AppNewPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("app-create")) {
    notFound();
  }

  const t = await getI18n();

  return (
    <ManagePageLayout title={t("app.page.create.title")} container="default" breadcrumbPlacement="outside">
      <AppNewForm showBackToOverview showCreateAnother />
    </ManagePageLayout>
  );
}

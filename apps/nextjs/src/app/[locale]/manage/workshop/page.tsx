import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { WorkshopInstaller } from "~/components/workshop/workshop-installer";

export default async function WorkshopPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("custom-widget-manage")) redirect(session ? "/" : "/auth/login");
  const t = await getScopedI18n("workshop");
  return (
    <ManagePageLayout title={t("title")} size="xl">
      <WorkshopInstaller />
    </ManagePageLayout>
  );
}

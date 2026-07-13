import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { WorkshopBrowser } from "~/components/workshop/workshop-browser";

export default async function WorkshopPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");
  const t = await getScopedI18n("workshop");
  return (
    <ManagePageLayout title={t("title")} size="xl">
      <WorkshopBrowser />
    </ManagePageLayout>
  );
}

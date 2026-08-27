import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { InviteListComponent } from "./_components/invite-list";

export default async function InvitesOverviewPage() {
  if (!isProviderEnabled("credentials")) {
    notFound();
  }

  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  const t = await getI18n("management.page.user.invite");
  const initialInvites = await api.invite.getAll();

  return (
    <ManagePageLayout title={t("title")}>
      <InviteListComponent initialInvites={initialInvites} />
    </ManagePageLayout>
  );
}

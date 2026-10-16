import { notFound } from "next/navigation";

import { api, getBackendRuntimeAsync } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { InviteListComponent } from "./_components/invite-list";

export default async function InvitesOverviewPage() {
  if (!(await getBackendRuntimeAsync()).credentialsEnabled) {
    notFound();
  }

  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  const t = await getI18n("management.page.user.invite");
  const initialInvites = await api.invite.getAll.query();

  return (
    <ManagePageLayout title={t("title")}>
      <InviteListComponent initialInvites={initialInvites} />
    </ManagePageLayout>
  );
}

import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { getScopedI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { createMetaTitle } from "~/metadata";
import { UserListComponent } from "./_components/user-list";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }
  const t = await getScopedI18n("management.page.user.list");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  const t = await getScopedI18n("management.page.user");
  const userList = await api.user.getAll();
  const credentialsProviderEnabled = isProviderEnabled("credentials");

  return (
    <ManagePageLayout
      title={t("list.title")}
      primaryAction={
        credentialsProviderEnabled ? (
          <MobileAffixButton component={Link} href="/manage/users/create">
            {t("create.title")}
          </MobileAffixButton>
        ) : undefined
      }
      floatingPrimaryAction={credentialsProviderEnabled}
    >
      <UserListComponent initialUserList={userList} />
    </ManagePageLayout>
  );
}

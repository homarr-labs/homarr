import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { UserListComponent } from "./_components/user-list.component";

export async function generateMetadata() {
  const t = await getScopedI18n("management.page.user.list");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function UsersPage() {
  const userList = await api.user.getAll();
  return <UserListComponent initialUserList={userList} />;
}

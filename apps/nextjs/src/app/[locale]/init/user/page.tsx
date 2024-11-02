import { Card } from "@mantine/core";

import { db } from "@homarr/db";
import { getScopedI18n } from "@homarr/translation/server";

import { InitTitle } from "../_components/init-title";
import { InitUserForm } from "./_init-user-form";

export default async function InitUser() {
  const firstUser = await db.query.users.findFirst({
    columns: {
      id: true,
    },
  });

  if (firstUser) {
    //notFound();
  }

  const t = await getScopedI18n("user.page.init");

  return (
    <>
      <InitTitle title={t("title")} description={t("subtitle")} />
      <Card bg="dark.8" w={64 * 6} maw="90vw">
        <InitUserForm />
      </Card>
    </>
  );
}

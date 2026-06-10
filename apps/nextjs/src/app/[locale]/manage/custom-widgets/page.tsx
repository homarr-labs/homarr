import { redirect } from "next/navigation";
import { Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { CustomWidgetBetaBanner } from "./_beta-banner";
import { ImportCustomWidgetButton } from "./_custom-widget-actions";
import { CustomWidgetList } from "./_custom-widget-list";

export default async function CustomWidgetsPage() {
  const session = await auth();

  if (!session || !session.user.permissions.includes("admin")) {
    redirect(session ? "/" : "/auth/login");
  }

  const definitions = await api.customWidget.all();
  const t = await getScopedI18n("customWidget");

  return (
    <ManagePageLayout
      title={t("page.list.title")}
      primaryAction={
        <Group gap="xs">
          <ImportCustomWidgetButton />
          <MobileAffixButton component={Link} href="/manage/custom-widgets/new" leftSection={<IconPlus size={16} />}>
            {t("action.create")}
          </MobileAffixButton>
        </Group>
      }
    >
      <CustomWidgetBetaBanner />
      <CustomWidgetList definitions={definitions} />
    </ManagePageLayout>
  );
}

import { redirect } from "next/navigation";
import { Group } from "@mantine/core";
import { IconExternalLink, IconPlus } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { CustomWidgetBetaBanner } from "./_beta-banner";
import { CustomWidgetList } from "./_custom-widget-list";
import { CustomWidgetTabs } from "./_custom-widget-tabs";
import { ImportCustomWidgetButton } from "./_import-custom-widget-button";

export default async function CustomWidgetsPage() {
  const session = await auth();

  if (!session || !session.user.permissions.includes("admin")) {
    redirect(session ? "/" : "/auth/login");
  }
  const definitions = await api.customWidget.list();
  const t = await getI18n("customWidget");
  const [tCommon, tEntities] = await Promise.all([getI18n("common"), getI18n("common.entity")]);

  return (
    <ManagePageLayout
      title={tEntities("customWidgets")}
      primaryAction={
        <Group gap="xs">
          <MobileAffixButton
            component="a"
            href="https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget"
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={16} />}
            variant="default"
          >
            {t("action.downloadSkill")}
          </MobileAffixButton>
          <ImportCustomWidgetButton />
          <MobileAffixButton component={Link} href="/manage/custom-widgets/new" leftSection={<IconPlus size={16} />}>
            {tCommon("action.create")}
          </MobileAffixButton>
        </Group>
      }
      toolbar={<CustomWidgetTabs active="installed" />}
    >
      <CustomWidgetBetaBanner />
      <CustomWidgetList definitions={definitions} />
    </ManagePageLayout>
  );
}

import { redirect } from "next/navigation";
import { Button, Group } from "@mantine/core";
import { IconExternalLink, IconPlus, IconSparkles } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { createLoginUrl } from "@homarr/auth/shared";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MANAGE_ACTION_BUTTON_MIN_WIDTH } from "~/components/manage/manage-page.constants";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { CustomWidgetList } from "./_custom-widget-list";
import { CustomWidgetTabs } from "./_custom-widget-tabs";
import { ImportCustomWidgetButton } from "./_import-custom-widget-button";

export default async function CustomWidgetsPage() {
  const session = await auth();

  if (!session) {
    redirect(createLoginUrl("/manage/custom-widgets"));
  }
  if (!session.user.permissions.includes("admin")) {
    redirect("/");
  }
  const definitions = await api.customWidget.list();
  const t = await getI18n("customWidget");
  const [tCommon, tEntities] = await Promise.all([getI18n("common"), getI18n("common.entity")]);

  return (
    <ManagePageLayout
      title={tEntities("customWidgets")}
      primaryAction={
        <Group gap="xs">
          <Button
            component="a"
            miw={MANAGE_ACTION_BUTTON_MIN_WIDTH}
            href="https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget"
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={16} />}
            variant="default"
          >
            {t("action.downloadSkill")}
          </Button>
          <ImportCustomWidgetButton />
          <Button
            component={Link}
            miw={MANAGE_ACTION_BUTTON_MIN_WIDTH}
            href="/manage/custom-widgets/new?mode=assisted"
            leftSection={<IconSparkles size={16} />}
          >
            {t("action.createAssisted")}
          </Button>
          <MobileAffixButton component={Link} href="/manage/custom-widgets/new" leftSection={<IconPlus size={16} />}>
            {tCommon("action.create")}
          </MobileAffixButton>
        </Group>
      }
      toolbar={<CustomWidgetTabs active="installed" />}
    >
      <CustomWidgetList definitions={definitions} />
    </ManagePageLayout>
  );
}

import { redirect } from "next/navigation";
import { Button, Group } from "@mantine/core";
import { IconLayoutGrid, IconPlus } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { CustomWidgetTabs } from "../_custom-widget-tabs";
import { PackageImportButton, PackageList } from "./_package-list";

export default async function WidgetPackagesPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const installations = await api.customWidget.package.list();
  const t = await getI18n("customWidget.package");
  return (
    <ManagePageLayout
      title={t("title")}
      toolbar={<CustomWidgetTabs active="packages" />}
      primaryAction={
        <Group gap="xs">
          <Button
            component={Link}
            href="/manage/custom-widgets/packages/collections"
            variant="default"
            leftSection={<IconLayoutGrid size={16} />}
          >
            {t("collections.title")}
          </Button>
          <PackageImportButton />
          <MobileAffixButton
            component={Link}
            href="/manage/custom-widgets/packages/new"
            leftSection={<IconPlus size={16} />}
          >
            {t("create")}
          </MobileAffixButton>
        </Group>
      }
    >
      <PackageList initialData={installations} />
    </ManagePageLayout>
  );
}

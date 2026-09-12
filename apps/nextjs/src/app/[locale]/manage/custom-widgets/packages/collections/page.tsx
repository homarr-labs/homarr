import { redirect } from "next/navigation";
import { Button, Group } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { CustomWidgetTabs } from "../../_custom-widget-tabs";
import { PackageImportButton } from "../_package-list";
import { PackageCollectionList } from "./_collection-list";

export default async function WidgetCollectionsPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const [collections, installations, t] = await Promise.all([
    api.customWidget.package.collections(),
    api.customWidget.package.list(),
    getI18n("customWidget.package"),
  ]);
  return (
    <ManagePageLayout
      title={t("collections.title")}
      toolbar={<CustomWidgetTabs active="packages" />}
      primaryAction={
        <Group gap="xs">
          <Button component={Link} href="/manage/custom-widgets/packages" variant="subtle">
            {t("library")}
          </Button>
          <PackageImportButton />
        </Group>
      }
    >
      <PackageCollectionList initialData={collections} installations={installations} />
    </ManagePageLayout>
  );
}

import { redirect } from "next/navigation";
import { Button } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { CustomWidgetTabs } from "../../../_custom-widget-tabs";
import { PackageCollectionSetup } from "../_collection-setup";

export default async function WidgetCollectionPage({ params }: { params: Promise<{ importId: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const { importId } = await params;
  const [collection, t] = await Promise.all([
    api.customWidget.package.collection({ importId }),
    getI18n("customWidget.package"),
  ]);
  return (
    <ManagePageLayout
      title={collection.manifest.name}
      breadcrumb={<DynamicBreadcrumb dynamicMappings={new Map([[importId, collection.manifest.name]])} />}
      toolbar={<CustomWidgetTabs active="packages" />}
      primaryAction={
        <Button component={Link} href="/manage/custom-widgets/packages/collections" variant="default">
          {t("collections.title")}
        </Button>
      }
    >
      <PackageCollectionSetup initialData={collection} />
    </ManagePageLayout>
  );
}

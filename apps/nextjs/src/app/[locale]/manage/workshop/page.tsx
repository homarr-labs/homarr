import { redirect } from "next/navigation";
import { Button } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { WorkshopInstaller } from "~/components/workshop/workshop-installer";
import { env } from "~/env";

export default async function WorkshopPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");
  const t = await getScopedI18n("workshop");
  const { workshopWebUrl } = resolveHomarrUrlConfig({
    homarrWebsiteUrl: env.HOMARR_WEBSITE_URL,
    workshopApiUrl: env.WORKSHOP_API_URL,
    workshopWebUrl: env.WORKSHOP_WEB_URL,
  });
  return (
    <ManagePageLayout
      title={t("title")}
      primaryAction={
        <Button
          component="a"
          href={workshopWebUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          leftSection={<IconExternalLink size={16} />}
        >
          {t("openCommunity")}
        </Button>
      }
    >
      <WorkshopInstaller />
    </ManagePageLayout>
  );
}

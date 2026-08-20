import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { SettingsForm } from "./_components/settings-form";

export async function generateMetadata() {
  const t = await getI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const [serverSettings, selectableBoards, selectableSearchEngines, tSettings] = await Promise.all([
    api.serverSettings.getAll(),
    api.board.getPublicBoards(),
    api.searchEngine.getSelectable({ withIntegrations: false }),
    getI18n("management.page.settings"),
  ]);

  return (
    <ManagePageLayout title={tSettings("title")}>
      <SettingsForm
        initialData={serverSettings}
        selectableBoards={selectableBoards}
        selectableSearchEngines={selectableSearchEngines}
      />
    </ManagePageLayout>
  );
}

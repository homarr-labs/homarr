import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ThemeEditor } from "~/components/theme/theme-editor";
import { getUserEditDataAsync } from "../../users/[userId]/_data";
import { canAccessUserEditPage } from "../../users/[userId]/access";

export default async function UserThemePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!canAccessUserEditPage(await auth(), userId)) notFound();
  const [initialData, boards, user, t] = await Promise.all([
    api.theme.get({ target: "user", userId }),
    api.board.getManageOverview({ fullPreview: false }),
    getUserEditDataAsync(userId),
    getI18n("common.customTheme.studio"),
  ]);
  return (
    <ManagePageLayout
      title={t("title")}
      size="xl"
      breadcrumb={
        <DynamicBreadcrumb
          dynamicMappings={
            new Map([
              ["themes", t("title")],
              [userId, user.name ?? userId],
            ])
          }
        />
      }
    >
      <ThemeEditor
        initialData={initialData}
        boards={boards.map(({ name }) => ({ name }))}
        returnHref={`/manage/users/${userId}/general`}
      />
    </ManagePageLayout>
  );
}

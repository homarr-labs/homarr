import { notFound } from "next/navigation";
import { Box } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { ThemeEditor } from "~/components/theme/theme-editor";

export default async function ServerThemePage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) notFound();
  const [initialData, boards, t] = await Promise.all([
    api.theme.get(),
    api.board.getManageOverview({ fullPreview: false }),
    getI18n("common.customTheme.studio"),
  ]);
  return (
    <Box p={{ base: "md", md: "lg" }}>
      <ManagePageLayout title={t("title")} container={false}>
        <ThemeEditor
          initialData={initialData}
          boards={boards.map(({ name }) => ({ name }))}
          returnHref="/manage/settings"
        />
      </ManagePageLayout>
    </Box>
  );
}

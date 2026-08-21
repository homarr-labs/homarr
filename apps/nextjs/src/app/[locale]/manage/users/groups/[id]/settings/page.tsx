import { notFound } from "next/navigation";
import { Alert, Stack, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { GroupHomeBoards } from "./_group-home-boards";

interface GroupSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GroupPermissionsPage(props: GroupSettingsPageProps) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const group = await api.group.getById({ id: params.id });
  const t = await getI18n("management.page.group.setting.setting");
  const tEntities = await getI18n("common.entity");

  return (
    <Stack>
      <Title>{t("title")}</Title>

      <Alert color="cyan" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
        {t("alert")}
      </Alert>

      <Title order={3}>{tEntities("boards")}</Title>

      <GroupHomeBoards homeBoardId={group.homeBoardId} mobileHomeBoardId={group.mobileHomeBoardId} groupId={group.id} />
    </Stack>
  );
}

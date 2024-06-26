import { notFound } from "next/navigation";
import { Box, Group, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";
import { catchTrpcNotFound } from "~/errors/trpc-not-found";
import { createMetaTitle } from "~/metadata";
import { canAccessUserEditPage } from "../access";
import { DeleteUserButton } from "./_components/_delete-user-button";
import { UserProfileAvatarForm } from "./_components/_profile-avatar-form";
import { UserProfileForm } from "./_components/_profile-form";
import { ProfileLanguageChange } from "./_components/_profile-language-change";

interface Props {
  params: {
    userId: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const session = await auth();
  const user = await api.user
    .getById({
      userId: params.userId,
    })
    .catch(() => null);

  if (!user || !canAccessUserEditPage(session, user.id)) {
    return {};
  }

  const t = await getScopedI18n("management.page.user.edit");

  return {
    title: createMetaTitle(t("metaTitle", { username: user.name })),
  };
}

export default async function EditUserPage({ params }: Props) {
  const t = await getI18n();
  const tGeneral = await getScopedI18n("management.page.user.setting.general");
  const session = await auth();
  const user = await api.user
    .getById({
      userId: params.userId,
    })
    .catch(catchTrpcNotFound);

  if (!canAccessUserEditPage(session, user.id)) {
    notFound();
  }

  return (
    <Stack>
      <Title>{tGeneral("title")}</Title>
      <Group gap="xl">
        <Box flex={1}>
          <UserProfileForm user={user} />
        </Box>
        <Box w={{ base: "100%", lg: 200 }}>
          <UserProfileAvatarForm user={user} />
        </Box>
      </Group>

      <ProfileLanguageChange />

      <DangerZoneRoot>
        <DangerZoneItem
          label={t("user.action.delete.label")}
          description={t("user.action.delete.description")}
          action={<DeleteUserButton user={user} />}
        />
      </DangerZoneRoot>
    </Stack>
  );
}

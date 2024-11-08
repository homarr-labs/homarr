import { notFound } from "next/navigation";
import { Alert, Box, Group, Stack, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import { CurrentLanguageCombobox } from "~/components/language/current-language-combobox";
import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { createMetaTitle } from "~/metadata";
import { canAccessUserEditPage } from "../access";
import { ChangeHomeBoardForm } from "./_components/_change-home-board";
import { DeleteUserButton } from "./_components/_delete-user-button";
import { FirstDayOfWeek } from "./_components/_first-day-of-week";
import { PingIconsEnabled } from "./_components/_ping-icons-enabled";
import { UserProfileAvatarForm } from "./_components/_profile-avatar-form";
import { UserProfileForm } from "./_components/_profile-form";

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

  const boards = await api.board.getAllBoards();

  const isCredentialsUser = user.provider === "credentials";

  return (
    <Stack>
      {!isCredentialsUser && (
        <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
          {t("management.page.user.fieldsDisabledExternalProvider")}
        </Alert>
      )}

      <Title>{tGeneral("title")}</Title>
      <Group gap="xl">
        <Box flex={1}>
          <UserProfileForm user={user} />
        </Box>
        <Box w={{ base: "100%", lg: 200 }}>
          <UserProfileAvatarForm user={user} />
        </Box>
      </Group>

      <Stack mb="lg">
        <Title order={2}>{tGeneral("item.language")}</Title>
        <CurrentLanguageCombobox />
      </Stack>

      <Stack mb="lg">
        <Title order={2}>{tGeneral("item.board")}</Title>
        <ChangeHomeBoardForm
          user={user}
          boardsData={boards.map((board) => ({
            value: board.id,
            label: board.name,
          }))}
        />
      </Stack>

      <Stack mb="lg">
        <Title order={2}>{tGeneral("item.firstDayOfWeek")}</Title>
        <FirstDayOfWeek user={user} />
      </Stack>

      <Stack mb="lg">
        <Title order={2}>{tGeneral("item.accessibility")}</Title>
        <PingIconsEnabled user={user} />
      </Stack>

      {isCredentialsUser && (
        <DangerZoneRoot>
          <DangerZoneItem
            label={t("user.action.delete.label")}
            description={t("user.action.delete.description")}
            action={<DeleteUserButton user={user} />}
          />
        </DangerZoneRoot>
      )}
    </Stack>
  );
}

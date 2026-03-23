import { notFound } from "next/navigation";
import { Alert, Box, Group, Stack, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { createMetaTitle } from "~/metadata";
import { canAccessUserEditPage } from "../access";
import { DeleteUserButton } from "./_components/_delete-user-button";
import { UserGeneralSettingsForm } from "./_components/_general-settings-form";
import { UserProfileAvatarForm } from "./_components/_profile-avatar-form";

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export async function generateMetadata(props: Props) {
  const params = await props.params;
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    title: createMetaTitle(t("metaTitle", { username: user.name! })),
  };
}

export default async function EditUserPage(props: Props) {
  const params = await props.params;
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
  const searchEngines = await api.searchEngine.getSelectable();
  const isSelf = session?.user.id === user.id;
  const isCredentialsUser = user.provider === "credentials";

  return (
    <Stack>
      {!isCredentialsUser && (
        <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
          {t("management.page.user.fieldsDisabledExternalProvider")}
        </Alert>
      )}
      <Title>{tGeneral("title")}</Title>
      <Group gap="xl" align="flex-start" wrap="wrap">
        <Box flex={1} miw={{ base: "100%", md: 540 }}>
          <UserGeneralSettingsForm
            user={user}
            boardsData={boards.map((board) => ({
              id: board.id,
              name: board.name,
              logoImageUrl: board.logoImageUrl,
            }))}
            searchEnginesData={searchEngines}
            showLanguageSelector={isSelf}
          />
        </Box>
        <Box w={{ base: "100%", lg: 260 }}>
          <UserProfileAvatarForm user={user} />
        </Box>
      </Group>

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

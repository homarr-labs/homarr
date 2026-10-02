import { notFound } from "next/navigation";
import { Alert, Stack, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { canAccessUserEditPage } from "../access";
import { DeleteUserButton } from "./_components/_delete-user-button";
import { UserGeneralSettingsForm } from "./_components/_general-settings-form";
import { UserProfileAvatarForm } from "./_components/_profile-avatar-form";
import { ResetTours } from "./_components/_reset-tours";

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

  const t = await getI18n("management.page.user.edit");

  return {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    title: t("metaTitle", { username: user.name! }),
  };
}

export default async function EditUserPage(props: Props) {
  const params = await props.params;
  const tUserManagement = await getI18n("management.page.user");
  const tUser = await getI18n("user");
  const tGeneral = await getI18n("management.page.user.setting.general");
  const session = await auth();
  const user = await api.user
    .getById({
      userId: params.userId,
    })
    .catch(catchTrpcNotFound);

  if (!canAccessUserEditPage(session, user.id)) {
    notFound();
  }

  const boards = await api.board.getManageOverview({ fullPreview: false, userId: user.id });
  const searchEngines = await api.searchEngine.getSelectable();
  const isSelf = session?.user.id === user.id;
  const isCredentialsUser = user.provider === "credentials";

  return (
    <Stack>
      {!isCredentialsUser && (
        <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
          {tUserManagement("fieldsDisabledExternalProvider")}
        </Alert>
      )}
      <Title>{tGeneral("title")}</Title>
      <UserGeneralSettingsForm
        user={user}
        boardsData={boards.map((board) => ({
          id: board.id,
          name: board.name,
          logoImageUrl: board.logoImageUrl,
          preview: board.preview,
        }))}
        searchEnginesData={searchEngines}
        showLanguageSelector={isSelf}
        profileAvatar={<UserProfileAvatarForm user={user} />}
      />

      {session?.user.id === user.id && (
        <Stack mb="lg">
          <Title order={2}>{tGeneral("item.onboardingTours.title")}</Title>
          <ResetTours />
        </Stack>
      )}

      <DangerZoneRoot>
        <DangerZoneItem
          label={tUser("action.delete.label")}
          description={tUser("action.delete.description")}
          action={<DeleteUserButton user={user} />}
        />
      </DangerZoneRoot>
    </Stack>
  );
}

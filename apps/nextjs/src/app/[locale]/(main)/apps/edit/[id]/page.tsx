import { Container, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getI18n } from "@homarr/translation/server";

import { AppEditForm } from "./_app-edit-form";

interface AppEditPageProps {
  params: { id: string };
}

export default async function AppEditPage({ params }: AppEditPageProps) {
  const app = await api.app.byId({ id: params.id });
  const t = await getI18n();

  return (
    <Container>
      <Stack>
        <Title>{t("app.page.edit.title")}</Title>
        <AppEditForm app={app} />
      </Stack>
    </Container>
  );
}

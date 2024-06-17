import { Container, Stack, Title } from "@mantine/core";

import { getI18n } from "@homarr/translation/server";

import { AppNewForm } from "./_app-new-form";

export default async function AppNewPage() {
  const t = await getI18n();

  return (
    <Container>
      <Stack>
        <Title>{t("app.page.create.title")}</Title>
        <AppNewForm />
      </Stack>
    </Container>
  );
}

import { Container, Stack, Text, Title } from "@mantine/core";

import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { CustomWidgetForm } from "../_custom-widget-form";

export default async function NewCustomWidgetPage() {
  const t = await getScopedI18n("customWidget");

  return (
    <>
      <DynamicBreadcrumb />
      <Container>
        <Stack>
          <div>
            <Title>{t("page.create.title")}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {t("page.create.subtitle")}
            </Text>
          </div>
          <CustomWidgetForm mode="create" />
        </Stack>
      </Container>
    </>
  );
}

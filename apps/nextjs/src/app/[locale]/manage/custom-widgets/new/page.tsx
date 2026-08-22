import { redirect } from "next/navigation";
import { Container, Stack, Text, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { CustomWidgetBetaBanner } from "../_beta-banner";
import { CustomWidgetForm } from "../_custom-widget-form";
import { FormErrorBoundary } from "../_form-error-boundary";

export default async function NewCustomWidgetPage() {
  const session = await auth();
  if (!session || !session.user.permissions.includes("admin")) {
    redirect("/manage/custom-widgets");
  }
  const t = await getI18n("customWidget");

  return (
    <>
      <DynamicBreadcrumb />
      <Container fluid>
        <Stack>
          <div>
            <Title>{t("page.create.title")}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {t("page.create.subtitle")}
            </Text>
          </div>
          <CustomWidgetBetaBanner />
          <FormErrorBoundary>
            <CustomWidgetForm mode="create" />
          </FormErrorBoundary>
        </Stack>
      </Container>
    </>
  );
}

import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";
import { createMetaTitle } from "~/metadata";
import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { Title, SimpleGrid, Card } from "@mantine/core";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function ToursPage() {
  const t = await getScopedI18n("tours");
  return (
    <ManageContainer>
      <DynamicBreadcrumb/>
      <Title>{t("page.title")}</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Card></Card>
        <Card></Card>
        <Card></Card>
        <Card></Card>
        <Card></Card>
        <Card></Card>
      </SimpleGrid>
    </ManageContainer>
  )
}
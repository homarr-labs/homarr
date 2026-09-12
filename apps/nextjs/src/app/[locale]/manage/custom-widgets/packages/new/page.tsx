import { redirect } from "next/navigation";
import { Container, Stack, Title } from "@mantine/core";

import { widgetReferencePackages } from "@homarr/widget-sdk/examples";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { NativePackageWorkspace } from "../_package-convert";
import { PackageWorkspace } from "../_package-workspace";

export default async function NewWidgetPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ starter?: string; sourceItemId?: string }>;
}) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const t = await getI18n("customWidget.package");
  const query = await searchParams;
  const starter = Object.entries(widgetReferencePackages).find(([key]) => key === query.starter)?.[1];
  if (query.sourceItemId && query.starter && Object.hasOwn(widgetReferencePackages, query.starter))
    return (
      <Container fluid>
        <NativePackageWorkspace
          userId={session.user.id}
          sourceItemId={query.sourceItemId}
          starter={query.starter as keyof typeof widgetReferencePackages}
        />
      </Container>
    );
  return (
    <Container fluid>
      <Stack>
        <Title>{t("create")}</Title>
        <PackageWorkspace userId={session.user.id} initialSource={starter} />
      </Stack>
    </Container>
  );
}

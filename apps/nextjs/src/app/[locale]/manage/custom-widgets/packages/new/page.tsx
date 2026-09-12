import { redirect } from "next/navigation";
import { Container, Stack } from "@mantine/core";

import { widgetReferencePackages } from "@homarr/widget-sdk/examples";
import { auth } from "@homarr/auth/next";

import { NativePackageWorkspace } from "../_package-convert";
import { PackageWorkspace } from "../_package-workspace";

export default async function NewWidgetPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ starter?: string; sourceItemId?: string }>;
}) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
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
        <PackageWorkspace userId={session.user.id} initialSource={starter} />
      </Stack>
    </Container>
  );
}

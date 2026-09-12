import { redirect } from "next/navigation";
import { Container, Stack } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { PackageWorkspace } from "../_package-workspace";

export default async function WidgetPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ boardId?: string }>;
}) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const { id } = await params;
  const { boardId } = await searchParams;
  const installation = await api.customWidget.package.get({ id }).catch(catchTrpcNotFound);
  return (
    <Container fluid>
      <DynamicBreadcrumb dynamicMappings={new Map([[id, installation.name]])} />
      <Stack>
        <PackageWorkspace installation={installation} userId={session.user.id} initialBoardId={boardId} />
      </Stack>
    </Container>
  );
}

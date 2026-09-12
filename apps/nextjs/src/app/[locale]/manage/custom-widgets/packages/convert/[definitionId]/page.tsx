import { redirect } from "next/navigation";
import { Container } from "@mantine/core";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { PackageConvert } from "../../_package-convert";

export default async function ConvertWidgetPage({ params }: { params: Promise<{ definitionId: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const { definitionId } = await params;
  const definition = await api.customWidget.get({ id: definitionId }).catch(catchTrpcNotFound);
  return (
    <Container size="sm">
      <PackageConvert definitionId={definitionId} name={definition.name} />
    </Container>
  );
}

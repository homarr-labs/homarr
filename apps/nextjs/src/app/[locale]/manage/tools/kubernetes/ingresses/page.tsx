import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { IngressesTable } from "~/app/[locale]/manage/tools/kubernetes/ingresses/ingresses-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { env } from "~/env";

export default async function NamespacesPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const ingresses = await api.kubernetes.ingresses.getIngresses();

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Ingresses</Title>
        <IngressesTable initialIngresses={ingresses} />
      </Stack>
    </>
  );
}

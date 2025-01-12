import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { NamespacesTable } from "~/app/[locale]/manage/tools/kubernetes/namespaces/namespaces-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { env } from "~/env";

export default async function NamespacesPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const namespaces = await api.kubernetes.getNamespaces();
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Namespaces</Title>
        <NamespacesTable initialNamespaces={namespaces} />
      </Stack>
    </>
  );
}

import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { IncusInstancesTable } from "./incus-table";

export default async function IncusPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  // Get available Incus integrations
  const integrations = await api.integration.all();
  const incusIntegrations = integrations.filter((i) => i.kind === "incus");

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Incus Instances</Title>
        <IncusInstancesTable integrations={incusIntegrations} />
      </Stack>
    </>
  );
}

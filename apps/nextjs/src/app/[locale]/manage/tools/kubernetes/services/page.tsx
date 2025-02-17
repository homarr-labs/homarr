import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { ServicesTable } from "~/app/[locale]/manage/tools/kubernetes/services/services-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { env } from "~/env";

export default async function ServicesPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const services = await api.kubernetes.getServices();
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Services</Title>
        <ServicesTable initialServices={services} />
      </Stack>
    </>
  );
}
